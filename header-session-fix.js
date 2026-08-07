(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const readSession=()=>{for(const storage of[localStorage,sessionStorage]){try{const raw=storage.getItem("lacvietgamesStoreSession");if(raw)return JSON.parse(raw)}catch{}}return null};
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function syncHeader(){
    const session=readSession();const header=document.querySelector(".header-actions");if(!session?.token||!header)return;
    try{
      const response=await fetch(`${apiBase}/api/store/me`,{headers:{Authorization:`Bearer ${session.token}`}});
      if(!response.ok)return;
      const payload=await response.json();const me=payload.data;if(!me)return;
      document.body.classList.add("server-authenticated");
      header.querySelector(".coin-pill")?.remove();header.querySelector(".server-bell-wrap")?.remove();header.querySelector(".publisher-link")?.remove();header.querySelector(".admin-link")?.remove();
      let account=header.querySelector(".account-btn");
      const displayName=me.effectiveDisplayName||me.displayName||me.name||"Tài khoản";
      if(!account){const login=header.querySelector("[data-open-server-auth]");if(login){login.outerHTML=`<a class="account-btn" href="./profile.html"><span class="avatar-mini">${esc(displayName.charAt(0).toUpperCase())}</span><span>${esc(displayName)}</span></a>`;account=header.querySelector(".account-btn")}}
      if(!account)return;
      const nameEl=account.querySelector("span:last-child");if(nameEl)nameEl.textContent=displayName;
      const avatar=account.querySelector(".avatar-mini");if(avatar)avatar.textContent=displayName.charAt(0).toUpperCase();
      account.insertAdjacentHTML("beforebegin",`<a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b>${Number(me.coinBalance||0).toLocaleString("vi-VN")}</b></a><span class="server-bell-wrap"><button class="icon-btn server-bell" type="button" title="Thông báo">🔔${me.unreadNotifications?`<span class="server-badge">${Math.min(99,me.unreadNotifications)}</span>`:""}</button><div class="server-notifications" hidden></div></span><a class="publisher-link btn btn-secondary" href="./publisher.html">Đăng game</a>${String(me.role).toLowerCase()==="admin"?'<a class="admin-link btn btn-secondary" href="./admin.html">Admin</a>':""}`);
    }catch{}
  }

  const boot=()=>{syncHeader();setTimeout(syncHeader,150);setTimeout(syncHeader,700);setTimeout(syncHeader,1800)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
