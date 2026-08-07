(() => {
  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString("vi-VN");
  let attempts=0;

  function card(g){
    const cover=g.coverUrl?`style="background-image:url('${esc(g.coverUrl)}')"`:"";
    const ends=g.saleEndsAt?new Date(g.saleEndsAt).toLocaleString("vi-VN"):"";
    return `<article class="sale-game-card"><a href="./game.html?id=${encodeURIComponent(g.slug)}"><div class="sale-game-cover" ${cover}>${g.coverUrl?"":esc(g.icon||"🎮")}<span class="sale-percent">-${Number(g.discountPercent||0)}%</span></div></a><div class="sale-body"><a href="./game.html?id=${encodeURIComponent(g.slug)}"><h3>${esc(g.name)}</h3></a><p>${esc(g.shortDescription||"")}</p><div class="sale-price-line"><span class="sale-old-price">${fmt(g.originalPriceCoins)} LC</span><span class="sale-new-price">${fmt(g.effectivePriceCoins)} LC</span></div><div class="sale-meta"><span>${esc(g.saleName||"Sale")}</span>${ends?`<span>Đến ${esc(ends)}</span>`:""}</div></div></article>`;
  }

  async function render(){
    const app=document.getElementById("app");
    if(!app)return;
    app.className="page sales-shell";
    app.innerHTML=`<div class="sales-hero"><div><span class="eyebrow">ACTIVE SALES</span><h1>Game đang giảm giá</h1><p>Tất cả ưu đãi đang còn hiệu lực. Giá gốc không bị thay đổi trong database.</p></div><a class="btn btn-secondary" href="./catalog.html">Xem toàn bộ game</a></div><div id="salesGrid" class="sales-grid"><div class="sales-empty">Đang tải ưu đãi...</div></div>`;
    const grid=document.getElementById("salesGrid");
    try{
      const response=await fetch(`${API}/api/store/games`);
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.success===false)throw new Error(payload?.message||"Không tải được danh sách sale.");
      const games=(payload.data||[]).filter(g=>Number(g.discountPercent||0)>0&&Number(g.effectivePriceCoins)<Number(g.originalPriceCoins));
      grid.innerHTML=games.length?games.map(card).join(""):'<div class="sales-empty"><h3>Hiện chưa có game đang Sale</h3><p>Khi Admin bật một sự kiện giảm giá, game phù hợp sẽ tự xuất hiện ở đây.</p></div>';
    }catch(error){
      grid.innerHTML=`<div class="sales-empty" style="color:#ff9eaa">${esc(error.message)}</div>`;
    }
  }

  function boot(){
    if(document.querySelector("#siteHeader .site-header")||attempts>=40){render();return;}
    attempts++;
    setTimeout(boot,100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
