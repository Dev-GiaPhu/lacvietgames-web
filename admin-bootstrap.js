(() => {
  if (!document.body.classList.contains("admin-page") || window.__LVG_ADMIN_BOOTSTRAP__) return;
  window.__LVG_ADMIN_BOOTSTRAP__ = true;

  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const KEY="lacvietgamesStoreSession";
  const SENTINEL="cookie.session";
  const nativeFetch=window.fetch.bind(window);

  function clearCachedSession(){
    for(const storage of [localStorage,sessionStorage]){
      try{
        storage.removeItem("lacvietgamesSession");
        storage.removeItem(KEY);
      }catch{}
    }
  }

  function cacheAdmin(account){
    if(!account||String(account.role||"").toLowerCase()!=="admin")return false;
    clearCachedSession();
    try{
      sessionStorage.setItem(KEY,JSON.stringify({
        id:account.id,
        name:account.name,
        displayName:account.displayName||null,
        effectiveDisplayName:account.effectiveDisplayName||account.displayName||account.name,
        email:account.email,
        role:"Admin",
        coinBalance:Number(account.coinBalance||0),
        token:SENTINEL,
        sessionMode:"secure-cookie",
        loginAt:new Date().toISOString()
      }));
    }catch{}
    return true;
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.startsWith(API))return nativeFetch(input,init);
    const normalized={...(init||{}),credentials:"include",cache:"no-store"};
    try{
      const headers=new Headers(normalized.headers||{});
      if(headers.get("Authorization")===`Bearer ${SENTINEL}`)headers.delete("Authorization");
      normalized.headers=headers;
    }catch{}
    if(normalized.signal)return nativeFetch(input,normalized);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      return await nativeFetch(input,{...normalized,signal:controller.signal});
    }catch(error){
      if(error?.name==="AbortError"){
        const timeout=new Error("Máy chủ phản hồi chậm. Vui lòng thử lại.");
        timeout.code="REQUEST_TIMEOUT";
        throw timeout;
      }
      throw error;
    }finally{
      clearTimeout(timer);
    }
  };

  async function probeCookie(){
    try{
      const response=await fetch(`${API}/api/store/me`,{headers:{Accept:"application/json"}});
      if(!response.ok)return false;
      const payload=await response.json().catch(()=>null);
      return cacheAdmin(payload?.data);
    }catch{
      return false;
    }
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      const timer=setTimeout(()=>{
        s.remove();
        reject(new Error(`Timeout: ${src}`));
      },10000);
      s.src=src;
      s.async=false;
      s.onload=()=>{clearTimeout(timer);resolve()};
      s.onerror=()=>{clearTimeout(timer);reject(new Error(`Không tải được ${src}`))};
      document.body.appendChild(s);
    });
  }

  async function logoutCookie(){
    try{await fetch(`${API}/api/store/auth/logout`,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"}})}catch{}
    clearCachedSession();
  }

  function labelRewardModes(){
    const sdkNav=document.getElementById("rewardRulesNav");
    const sdkLabel=sdkNav?.querySelector("span");
    if(sdkLabel)sdkLabel.textContent="Reward SDK / Server";
    const sdkPanel=document.getElementById("rewardRulesPanel");
    const heading=sdkPanel?.querySelector(".admin-section-head h2");
    const description=sdkPanel?.querySelector(".admin-section-head p");
    if(heading)heading.textContent="Reward SDK / Server";
    if(description)description.textContent="Tích hợp nâng cao cho dữ liệu gameplay như win, level, boss, score hoặc tournament. Cơ chế này vẫn được giữ nguyên bên cạnh Phần thưởng tự động.";
  }

  document.addEventListener("click",event=>{
    if(event.target.closest("#adminLogout"))logoutCookie();
  },true);

  (async()=>{
    clearCachedSession();
    await probeCookie();
    const version="20260809-1950-platform-auto-rewards";
    try{
      await loadScript(`./admin.js?v=${version}`);
      await loadScript(`./admin-task-events.js?v=${version}`);
      await loadScript(`./admin-security.js?v=${version}`);
      await loadScript(`./admin-game-rewards.js?v=${version}`);
      await loadScript(`./admin-integrations.js?v=${version}`);
      labelRewardModes();
    }catch(error){
      const gate=document.getElementById("adminGateStatus");
      if(gate)gate.textContent="Không thể tải khu vực quản trị. Vui lòng thử lại.";
      console.error("Admin bootstrap failed",error);
    }
  })();
})();