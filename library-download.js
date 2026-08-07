(() => {
  if (document.body.dataset.page !== "library") return;
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const read=()=>window.LVGSession?.read?.()||null;
  async function api(path,auth=false){const s=read();const h={};if(auth&&s?.token)h.Authorization=`Bearer ${s.token}`;const r=await fetch(`${apiBase}${path}`,{headers:h});const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false)throw new Error(p?.message||"Không thể tạo link tải.");return p}
  document.addEventListener("click",async event=>{
    const link=event.target.closest('a[href^="r2:"]');
    if(!link)return;
    event.preventDefault();
    if(!read()?.token){document.querySelector("[data-open-server-auth]")?.click();return}
    const slug=new URLSearchParams(location.search).get("install");
    if(!slug)return alert("Không xác định được game cần tải.");
    const old=link.textContent;link.style.pointerEvents="none";link.textContent="Đang tạo link tải an toàn...";
    try{const game=(await api(`/api/store/games/${encodeURIComponent(slug)}`)).data;const result=await api(`/api/store/games/${game.id}/download`,true);location.href=result.data.url}catch(e){alert(e.message)}finally{link.style.pointerEvents="";link.textContent=old}
  },true);
})();
