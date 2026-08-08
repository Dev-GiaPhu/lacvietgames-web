(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const read=()=>window.LVGSession?.read?.()||(()=>{for(const s of[localStorage,sessionStorage]){try{const r=s.getItem("lacvietgamesStoreSession");if(r)return JSON.parse(r)}catch{}}return null})();
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  let showing=false;
  async function request(){const s=read();if(!s?.token)return[];const r=await fetch(`${apiBase}/api/store/login-campaigns`,{headers:{Authorization:`Bearer ${s.token}`}});const p=await r.json().catch(()=>null);return r.ok&&p?.success?p.data||[]:[]}
  function show(items){
    if(!items.length||showing)return;
    showing=true;let index=0;
    const modal=document.createElement("div");
    modal.className="server-auth-modal lvg-campaign-modal";modal.id="lvgCampaignModal";
    modal.innerHTML=`<section class="server-auth-card lvg-campaign-card" style="width:min(680px,100%);padding:0;overflow:hidden"><button class="server-auth-close" type="button" data-campaign-close>×</button><div id="lvgCampaignBody"></div></section>`;
    document.body.appendChild(modal);document.body.style.overflow="hidden";
    const body=modal.querySelector("#lvgCampaignBody");
    const render=()=>{
      const x=items[index];
      const isSale=x.kind==="sale";
      const targetUrl=isSale?"./sales.html":x.actionUrl;
      body.dataset.saleOpen=isSale?"1":"";
      body.style.cursor=isSale?"pointer":"";
      body.innerHTML=`${x.imageUrl?`<img src="${esc(x.imageUrl)}" alt="" style="width:100%;max-height:310px;object-fit:cover;display:block">`:""}<div style="padding:28px"><span class="eyebrow">${isSale?"SỰ KIỆN SALE":"THÔNG BÁO"}</span><h2 style="margin:8px 0 10px">${esc(x.title)}</h2><p style="white-space:pre-wrap;line-height:1.7">${esc(x.message)}</p><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:22px"><span style="color:#7f8da7;font-size:12px">${items.length>1?`${index+1}/${items.length}`:""}</span><div style="display:flex;gap:8px">${index>0?'<button class="btn btn-secondary" type="button" data-campaign-prev>←</button>':""}${index<items.length-1?'<button class="btn btn-secondary" type="button" data-campaign-next>Tiếp →</button>':""}${targetUrl?`<a class="btn btn-primary" href="${esc(targetUrl)}">${isSale?"Xem game đang Sale":"Xem chi tiết"}</a>`:""}<button class="btn btn-secondary" type="button" data-campaign-close>Đóng</button></div></div></div>`;
    };
    render();
    modal.addEventListener("click",e=>{
      if(e.target.closest("[data-campaign-close]")){modal.remove();document.body.style.overflow="";showing=false;return}
      if(e.target.closest("[data-campaign-prev]")){index=Math.max(0,index-1);render();return}
      if(e.target.closest("[data-campaign-next]")){index=Math.min(items.length-1,index+1);render();return}
      if(e.target.closest("a,button"))return;
      if(body.dataset.saleOpen==="1")location.href="./sales.html";
    });
  }
  async function check(){const s=read();if(!s?.token||!s.loginAt)return;const key=`lvgCampaignShown:${s.loginAt}`;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");try{show(await request())}catch{}}
  window.addEventListener("lvg:session-hydrated",check);setTimeout(check,1200);
})();
