(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const read=()=>window.LVGSession?.read?.()||null;
  const actionFor=n=>String(n?.type||"").toLowerCase().includes("sale")?"./sales.html":(n?.actionUrl||"#");
  async function api(path,opt={}){const s=read();if(!s?.token)throw new Error("Bạn cần đăng nhập.");const r=await fetch(`${apiBase}${path}`,{method:opt.method||"GET",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.token}`},body:opt.body?JSON.stringify(opt.body):undefined});const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false)throw new Error(p?.message||"Không tải được thông báo.");return p}
  async function render(panel){
    panel.hidden=false;
    panel.innerHTML='<div class="server-notification-head"><b>Thông báo</b><button type="button" data-v2-read-all>Đánh dấu đã đọc</button></div><div style="padding:14px;color:#8e9bb4">Đang tải...</div>';
    try{
      const r=await api("/api/store/notifications");
      panel.innerHTML=`<div class="server-notification-head"><b>Thông báo</b><button type="button" data-v2-read-all>Đánh dấu đã đọc</button></div>${r.data.length?r.data.map(n=>`<a class="server-notification ${n.isRead?"":"unread"}" href="${esc(actionFor(n))}" data-v2-notification="${n.id}">${n.imageUrl?`<img src="${esc(n.imageUrl)}" alt="" style="width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-bottom:10px">`:""}<b>${esc(n.title)}</b><small>${esc(n.message)}</small><time>${new Date(n.createdAt).toLocaleString("vi-VN")}</time></a>`).join(""):'<div style="padding:15px;color:#8e9bb4">Chưa có thông báo.</div>'}`;
    }catch(e){panel.innerHTML=`<div style="padding:15px;color:#ff9e9e">${esc(e.message)}</div>`}
  }
  document.addEventListener("click",async e=>{
    const bell=e.target.closest(".server-bell");
    if(bell){e.preventDefault();e.stopImmediatePropagation();const panel=document.querySelector(".server-notifications");if(!panel)return;if(!panel.hidden){panel.hidden=true;return}await render(panel);return}
    const all=e.target.closest("[data-v2-read-all]");
    if(all){e.preventDefault();e.stopImmediatePropagation();await api("/api/store/notifications/read-all",{method:"POST"}).catch(()=>null);const panel=document.querySelector(".server-notifications");if(panel)await render(panel);window.dispatchEvent(new CustomEvent("lvg:notification-updated"));return}
    const item=e.target.closest("[data-v2-notification]");
    if(item){const href=item.getAttribute("href");await api(`/api/store/notifications/${item.dataset.v2Notification}/read`,{method:"POST"}).catch(()=>null);if(!href||href==="#")e.preventDefault()}
  },true);
})();
