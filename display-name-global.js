(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const readSession=()=>{for(const storage of[localStorage,sessionStorage]){try{const raw=storage.getItem("lacvietgamesStoreSession");if(raw)return JSON.parse(raw)}catch{}}return null};
  async function apply(){
    const session=readSession();if(!session?.token)return;
    try{
      const response=await fetch(`${apiBase}/api/store/profile`,{headers:{Authorization:`Bearer ${session.token}`}});
      if(!response.ok)return;const payload=await response.json();const p=payload.data;if(!p)return;
      document.querySelectorAll(".account-btn span:last-child").forEach(el=>el.textContent=p.effectiveDisplayName||p.name);
      document.querySelectorAll("[data-server-display-name]").forEach(el=>el.textContent=p.effectiveDisplayName||p.name);
    }catch{}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(apply,80),{once:true});else setTimeout(apply,80);
  new MutationObserver(()=>apply()).observe(document.documentElement,{childList:true,subtree:true});
})();
