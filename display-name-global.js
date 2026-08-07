(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const readSession=()=>{for(const storage of[localStorage,sessionStorage]){try{const raw=storage.getItem("lacvietgamesStoreSession");if(raw)return JSON.parse(raw)}catch{}}return null};
  let cachedName=null;
  async function loadName(){
    if(cachedName)return cachedName;
    const session=readSession();if(!session?.token)return null;
    try{
      const response=await fetch(`${apiBase}/api/store/profile`,{headers:{Authorization:`Bearer ${session.token}`}});
      if(!response.ok)return null;const payload=await response.json();cachedName=payload.data?.effectiveDisplayName||payload.data?.name||null;return cachedName;
    }catch{return null}
  }
  async function apply(){const name=await loadName();if(!name)return;document.querySelectorAll(".account-btn span:last-child,[data-server-display-name]").forEach(el=>{if(el.textContent!==name)el.textContent=name})}
  const boot=()=>{setTimeout(apply,80);setTimeout(apply,500);setTimeout(apply,1500)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
