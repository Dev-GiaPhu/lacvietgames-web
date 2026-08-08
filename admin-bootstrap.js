(() => {
  if (!document.body.classList.contains("admin-page") || window.__LVG_ADMIN_BOOTSTRAP__) return;
  window.__LVG_ADMIN_BOOTSTRAP__ = true;

  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const KEY="lacvietgamesStoreSession";
  const SENTINEL="cookie.session";

  function clearLegacy(){
    for(const storage of [localStorage,sessionStorage]){try{storage.removeItem("lacvietgamesSession")}catch{}}
    try{localStorage.removeItem(KEY)}catch{}
  }
  function cacheAdmin(account){
    if(!account||String(account.role||"").toLowerCase()!=="admin")return false;
    clearLegacy();
    try{sessionStorage.setItem(KEY,JSON.stringify({id:account.id,name:account.name,displayName:account.displayName||null,effectiveDisplayName:account.effectiveDisplayName||account.displayName||account.name,email:account.email,role:"Admin",coinBalance:Number(account.coinBalance||0),token:SENTINEL,sessionMode:"secure-cookie",loginAt:new Date().toISOString()}))}catch{}
    return true;
  }
  async function probeCookie(){
    try{const response=await fetch(`${API}/api/store/me`,{credentials:"include",cache:"no-store",headers:{Accept:"application/json"}});if(!response.ok)return false;const payload=await response.json().catch(()=>null);return cacheAdmin(payload?.data)}catch{return false}
  }
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)})}
  async function logoutCookie(){try{await fetch(`${API}/api/store/auth/logout`,{method:"POST",credentials:"include",cache:"no-store",keepalive:true,headers:{"Content-Type":"application/json"}})}catch{}try{sessionStorage.removeItem(KEY)}catch{}}
  document.addEventListener("click",event=>{if(event.target.closest("#adminLogout"))logoutCookie()},true);

  (async()=>{
    clearLegacy();
    // Always prefer the HttpOnly cookie. If it is valid, replace any old bearer cached in the tab
    // with the non-secret sentinel before the legacy Admin modules load.
    await probeCookie();
    const version="20260809-0405";
    try{
      await loadScript(`./admin.js?v=${version}`);
      await loadScript(`./admin-task-events.js?v=${version}`);
      await loadScript(`./admin-security.js?v=${version}`);
      await loadScript(`./admin-game-rewards.js?v=${version}`);
      await loadScript(`./admin-integrations.js?v=${version}`);
    }catch{
      const gate=document.getElementById("adminGateStatus");
      if(gate)gate.textContent="Không thể tải khu vực quản trị. Vui lòng tải lại trang.";
    }
  })();
})();
