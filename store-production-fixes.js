(() => {
  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const COOKIE_SENTINEL=window.LVGSession?.cookieSentinel||"cookie.session";
  const page=document.body?.dataset?.page||"";
  const read=()=>window.LVGSession?.read?.()||(()=>{try{const raw=sessionStorage.getItem("lacvietgamesStoreSession");return raw?JSON.parse(raw):null}catch{return null}})();
  const fmt=n=>Number(n||0).toLocaleString("vi-VN");
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function ensureStyle(){
    if(document.getElementById("storeProductionFixStyle"))return;
    const style=document.createElement("style");
    style.id="storeProductionFixStyle";
    style.textContent=`
      .purchase-feedback{display:block;margin-top:10px;font-size:12px;line-height:1.5;color:#83dfad}.purchase-feedback.error{color:#ff9eaa}
      .wallet-summary,.wallet-balance-card{background:radial-gradient(circle at 82% 18%,rgba(233,193,95,.18),transparent 34%),linear-gradient(135deg,#5c0c18,#25090e 58%,#120708)!important;border-color:rgba(233,193,95,.18)!important;box-shadow:0 20px 55px rgba(0,0,0,.32)!important}
      .wallet-pack-card,.wallet-section,.wallet-live-pack,.wallet-live-section,.settings-card{background:linear-gradient(155deg,#1a0b0f,#100708)!important;border-color:rgba(233,193,95,.14)!important}
      .wallet-pack-card:hover,.wallet-live-pack:hover{border-color:rgba(233,193,95,.4)!important;background:linear-gradient(145deg,#2a0d14,#15080a)!important}
      .wallet-pack-card small,.wallet-live-pack small,.settings-help,.activity-item small{color:#a58f8c!important}
      @media(max-width:1180px){.lvg-dashboard-shell .home-content-grid{grid-template-columns:minmax(0,1fr)!important}.lvg-dashboard-shell .home-stats-card{position:static!important;top:auto!important;z-index:1!important;width:100%!important;max-width:100%!important}}
    `;
    document.head.appendChild(style);
  }

  async function request(path,{method="GET",body,auth=true}={}){
    const session=read();
    if(auth&&!session?.token)throw Object.assign(new Error("Bạn cần đăng nhập."),{status:401,code:"AUTH_REQUIRED"});
    const headers={"Content-Type":"application/json","Accept":"application/json"};
    if(auth&&session?.token&&session.token!==COOKIE_SENTINEL)headers.Authorization=`Bearer ${session.token}`;
    const response=await fetch(`${API}${path}`,{method,credentials:"include",cache:"no-store",headers,body:body?JSON.stringify(body):undefined});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.success===false){const error=new Error(payload?.message||"Không thể xử lý yêu cầu.");error.status=response.status;error.code=payload?.code;error.payload=payload;throw error}
    return payload;
  }

  function patchHomeAccountPanel(){
    if(page!=="home")return;
    const session=read(),panel=document.querySelector(".home-stats-card");
    if(!panel||!session?.token)return;
    const currentTitle=panel.querySelector("h3")?.textContent?.trim()||"";
    const hasLogin=!!panel.querySelector("[data-open-server-auth]");
    if(!hasLogin&&currentTitle!=="Bắt đầu với LacVietGames")return;
    const display=session.effectiveDisplayName||session.displayName||session.name||"Người chơi";
    const libraryCount=Array.isArray(session.library)?session.library.length:0;
    panel.innerHTML=`<h3>Tổng quan của bạn</h3><div class="mini-stat-grid"><div class="mini-stat"><small>Lạc Coin</small><strong>${fmt(session.coinBalance)} LC</strong></div><div class="mini-stat"><small>Thư viện</small><strong>${fmt(libraryCount)} game</strong></div><div class="mini-stat"><small>Tài khoản</small><strong>${esc(display)}</strong></div><div class="mini-stat"><small>Trạng thái</small><strong>Đã đăng nhập</strong></div></div><a class="btn btn-secondary" style="width:100%;margin-top:16px" href="./profile.html">Trang cá nhân</a>`;
  }

  function setPurchaseFeedback(message,error=false){
    const actions=document.querySelector(".detail-actions");if(!actions)return;
    let note=actions.parentElement?.querySelector(".purchase-feedback");
    if(!note){note=document.createElement("span");note.className="purchase-feedback";actions.insertAdjacentElement("afterend",note)}
    note.classList.toggle("error",error);note.textContent=message;
  }

  function ownedAction(game){
    const slug=encodeURIComponent(game.slug||new URLSearchParams(location.search).get("id")||"");
    return String(game.type||"").toLowerCase()==="web"
      ? `<a class="btn btn-primary" href="./play.html?id=${slug}">▶ Chơi ngay</a>`
      : `<a class="btn btn-primary" href="./library.html?install=${slug}">↓ Tải xuống</a>`;
  }

  async function purchaseCurrentGame(button){
    const slug=new URLSearchParams(location.search).get("id")||"";
    if(!slug)return;
    const session=read();
    if(!session?.token){
      if(window.LVGAuth?.open){window.LVGAuth.open(()=>purchaseCurrentGame(document.getElementById("buyGame")),"login");return}
      document.querySelector("[data-open-server-auth]")?.click();return;
    }
    button=button||document.getElementById("buyGame");
    if(!button||button.dataset.busy==="1")return;
    button.dataset.busy="1";button.disabled=true;
    const original=button.textContent;
    try{
      const gamePayload=await request(`/api/store/games/${encodeURIComponent(slug)}`,{auth:false});
      const game=gamePayload.data||{};
      const price=Number(game.effectivePriceCoins??game.priceCoins??0);
      if(price>0&&!window.confirm(`Mua ${game.name||"trò chơi"} với ${fmt(price)} Lạc Coin?`)){button.disabled=false;button.dataset.busy="0";return}
      button.textContent=price>0?"Đang mua...":"Đang thêm...";
      const result=await request(`/api/store/games/${Number(game.id)}/purchase`,{method:"POST"});
      const balance=Number(result.data?.balance??session.coinBalance??0);
      const library=new Set(Array.isArray(session.library)?session.library:[]);library.add(slug);
      window.LVGSession?.cacheServerAccount?.({coinBalance:balance,library:[...library]});
      button.outerHTML=ownedAction(game);
      setPurchaseFeedback(result.message||"Game đã được thêm vào thư viện.");
    }catch(error){
      if(button?.isConnected){button.disabled=false;button.dataset.busy="0";button.textContent=original}
      setPurchaseFeedback(error.message||"Không thể thêm game vào thư viện.",true);
    }
  }

  ensureStyle();
  const patch=()=>setTimeout(patchHomeAccountPanel,0);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",patch,{once:true});else patch();
  window.addEventListener("lvg:session-hydrated",patch);
  window.addEventListener("lvg:login-success",patch);
  const app=document.getElementById("app");
  if(app)new MutationObserver(()=>patchHomeAccountPanel()).observe(app,{childList:true,subtree:true});
  document.addEventListener("click",event=>{
    const buy=event.target.closest("#buyGame");
    if(!buy)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    purchaseCurrentGame(buy);
  },true);
})();
