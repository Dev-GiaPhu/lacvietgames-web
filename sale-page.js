(() => {
  const API=(window.APP_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const fmt=n=>Number(n||0).toLocaleString('vi-VN');
  let saleGames=[];

  async function api(path){const r=await fetch(`${API}${path}`);const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false)throw new Error(p?.message||'Không tải được dữ liệu sale.');return p}

  function slugFromCard(card){const href=card.querySelector('a[href*="game.html?id="]')?.getAttribute('href')||'';const m=href.match(/[?&]id=([^&]+)/);return m?decodeURIComponent(m[1]):''}

  function waitForCatalog(){return new Promise(resolve=>{let tries=0;const tick=()=>{const grid=document.getElementById('catalogGrid');if(grid)return resolve(grid);if(++tries>80)return resolve(null);setTimeout(tick,75)};tick()})}

  function decorateCard(card,g){
    const price=card.querySelector('.price');
    if(price){
      price.classList.remove('free');
      price.innerHTML=`<span class="old-price">${fmt(g.originalPriceCoins)} LC</span><span class="sale-price">${fmt(g.effectivePriceCoins)} LC</span>`;
    }
    const cover=card.querySelector('.game-cover');
    if(cover&&!cover.querySelector('.sale-badge'))cover.insertAdjacentHTML('beforeend',`<span class="sale-badge" style="position:absolute;left:10px;top:10px">-${Number(g.discountPercent||0)}%</span>`);
  }

  function updateHeading(){
    const head=document.querySelector('.section-head');
    if(!head)return;
    const box=head.querySelector('div')||head;
    box.innerHTML=`<span class="eyebrow">SALE EVENT</span><h2>Game đang giảm giá</h2><p>Danh sách chỉ gồm các game đang có sự kiện Sale còn hiệu lực. Giá gốc không bị thay đổi trong database.</p>`;
    if(!document.querySelector('.sale-page-summary')){
      const info=document.createElement('div');
      info.className='sale-page-summary';
      const names=[...new Set(saleGames.map(g=>g.saleName).filter(Boolean))];
      info.innerHTML=saleGames.length?`Đang có <strong>${saleGames.length} game</strong> giảm giá${names.length?` trong ${names.map(esc).join(', ')}`:''}. Giá sale được backend tính tại thời điểm hiển thị và thanh toán.`:'Hiện chưa có sự kiện Sale nào đang áp dụng.';
      head.after(info);
    }
  }

  async function boot(){
    const grid=await waitForCatalog();
    if(!grid)return;
    try{
      const payload=await api('/api/store/games');
      saleGames=(payload.data||[]).filter(g=>Number(g.discountPercent||0)>0);
      const bySlug=new Map(saleGames.map(g=>[g.slug,g]));
      grid.querySelectorAll('.game-card').forEach(card=>{
        const g=bySlug.get(slugFromCard(card));
        if(!g){card.remove();return}
        decorateCard(card,g);
      });
      const search=document.getElementById('catalogSearch');
      const type=document.getElementById('catalogType');
      if(search)search.placeholder='Tìm trong game đang sale...';
      if(type){
        const refresh=()=>setTimeout(()=>{
          grid.querySelectorAll('.game-card').forEach(card=>{
            const g=bySlug.get(slugFromCard(card));
            if(!g)card.remove();else decorateCard(card,g);
          });
          const visible=grid.querySelectorAll('.game-card').length;
          const result=document.getElementById('resultCount');if(result)result.textContent=`${visible} game sale`;
          if(!visible)grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><h3>Không có game Sale phù hợp</h3><p>Thử thay đổi bộ lọc hoặc quay lại sau.</p></div>';
        },20);
        search?.addEventListener('input',refresh);
        type.addEventListener('change',refresh);
      }
      const result=document.getElementById('resultCount');if(result)result.textContent=`${grid.querySelectorAll('.game-card').length} game sale`;
      if(!saleGames.length)grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><h3>Hiện chưa có game đang Sale</h3><p>Các sự kiện mới do Admin tạo sẽ tự xuất hiện tại đây khi đến thời gian bắt đầu.</p></div>';
      updateHeading();
    }catch(e){grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><h3>Không tải được Sale</h3><p>${esc(e.message)}</p></div>`}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
