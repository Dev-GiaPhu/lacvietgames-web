(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const COOKIE_SENTINEL=window.LVGSession?.cookieSentinel||"cookie.session";
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const read=()=>window.LVGSession?.read?.()||null;
  const actionFor=n=>String(n?.type||"").toLowerCase().includes("sale")?"./sales.html":(n?.actionUrl||"#");

  function ensureStyle(){
    if(document.getElementById("lvgNotificationV2Style"))return;
    const style=document.createElement("style");
    style.id="lvgNotificationV2Style";
    style.textContent=`
      .server-bell-wrap{position:relative!important;display:inline-flex!important;align-items:center!important;flex:0 0 auto!important}
      .server-notifications{position:absolute!important;right:0!important;top:calc(100% + 12px)!important;width:min(390px,calc(100vw - 28px))!important;max-height:min(560px,72vh)!important;overflow-y:auto!important;overflow-x:hidden!important;z-index:12000!important;border:1px solid rgba(233,193,95,.2)!important;border-radius:18px!important;background:linear-gradient(155deg,#1c0b0f,#0e0708)!important;box-shadow:0 24px 70px rgba(0,0,0,.58)!important;padding:0!important;color:#fff6e6!important;overscroll-behavior:contain!important}
      .server-notifications[hidden]{display:none!important}.server-notification-head{position:sticky!important;top:0!important;z-index:3!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:14px 15px!important;background:rgba(24,9,13,.96)!important;border-bottom:1px solid rgba(233,193,95,.13)!important;backdrop-filter:blur(12px)!important}.server-notification-head b{font-size:15px!important}.server-notification-head button{border:0!important;background:transparent!important;color:#e9c15f!important;font:700 11px/1.2 inherit!important;cursor:pointer!important;padding:6px 0!important;white-space:nowrap!important}
      .server-notification{display:grid!important;gap:5px!important;padding:13px 15px!important;border-bottom:1px solid rgba(233,193,95,.09)!important;background:transparent!important;color:#fff5e4!important;text-decoration:none!important;min-width:0!important}.server-notification:last-child{border-bottom:0!important}.server-notification:hover{background:rgba(195,23,44,.09)!important}.server-notification.unread{background:rgba(195,23,44,.14)!important}.server-notification.unread:hover{background:rgba(195,23,44,.2)!important}.server-notification b{font-size:13px!important;line-height:1.4!important;overflow-wrap:anywhere!important}.server-notification small{display:block!important;color:#b9a3a0!important;font-size:11px!important;line-height:1.55!important;overflow-wrap:anywhere!important;white-space:normal!important}.server-notification time{color:#856f6d!important;font-size:10px!important}.server-notification img{display:block!important;width:100%!important;height:110px!important;max-height:110px!important;object-fit:cover!important;border-radius:11px!important;margin:0 0 7px!important}
      .server-badge{position:absolute!important;top:-5px!important;right:-5px!important;min-width:18px!important;height:18px!important;padding:0 4px!important;border-radius:999px!important;display:grid!important;place-items:center!important;background:#c3172c!important;color:#fff8e8!important;border:1px solid rgba(233,193,95,.5)!important;font:800 10px/1 inherit!important}.server-badge[hidden]{display:none!important}
      @media(max-width:620px){.server-notifications{position:fixed!important;left:10px!important;right:10px!important;top:76px!important;width:auto!important;max-height:calc(100dvh - 96px)!important}}
    `;
    document.head.appendChild(style);
  }

  async function api(path,opt={}){
    const s=read();
    if(!s?.token)throw new Error("Bạn cần đăng nhập.");
    const headers={"Content-Type":"application/json","Accept":"application/json"};
    if(s.token!==COOKIE_SENTINEL)headers.Authorization=`Bearer ${s.token}`;
    const r=await fetch(`${apiBase}${path}`,{method:opt.method||"GET",credentials:"include",cache:"no-store",headers,body:opt.body?JSON.stringify(opt.body):undefined});
    const p=await r.json().catch(()=>null);
    if(!r.ok||p?.success===false)throw new Error(p?.message||"Không tải được thông báo.");
    return p;
  }

  function updateBadge(count){
    const badge=document.querySelector(".server-badge");
    if(!badge)return;
    const n=Math.max(0,Number(count||0));
    badge.hidden=n<=0;
    badge.textContent=n>0?String(Math.min(99,n)):"";
  }

  async function render(panel){
    panel.hidden=false;
    panel.innerHTML='<div class="server-notification-head"><b>Thông báo</b><button type="button" data-v2-read-all>Đánh dấu đã đọc</button></div><div style="padding:16px;color:#a58f8c;font-size:12px">Đang tải...</div>';
    try{
      const r=await api("/api/store/notifications"),items=Array.isArray(r.data)?r.data:[];
      updateBadge(items.filter(n=>!n.isRead).length);
      panel.innerHTML=`<div class="server-notification-head"><b>Thông báo</b><button type="button" data-v2-read-all>Đánh dấu đã đọc</button></div>${items.length?items.map(n=>`<a class="server-notification ${n.isRead?"":"unread"}" href="${esc(actionFor(n))}" data-v2-notification="${n.id}">${n.imageUrl?`<img src="${esc(n.imageUrl)}" alt="">`:""}<b>${esc(n.title)}</b><small>${esc(n.message)}</small><time>${new Date(n.createdAt).toLocaleString("vi-VN")}</time></a>`).join(""):'<div style="padding:16px;color:#a58f8c;font-size:12px">Chưa có thông báo.</div>'}`;
    }catch(e){panel.innerHTML=`<div style="padding:16px;color:#ff9eaa;font-size:12px">${esc(e.message)}</div>`}
  }

  ensureStyle();
  document.addEventListener("click",async e=>{
    const bell=e.target.closest(".server-bell");
    if(bell){e.preventDefault();e.stopPropagation();const panel=bell.closest(".server-bell-wrap")?.querySelector(".server-notifications");if(!panel)return;if(!panel.hidden){panel.hidden=true;return}await render(panel);return}
    const all=e.target.closest("[data-v2-read-all]");
    if(all){e.preventDefault();e.stopPropagation();all.disabled=true;await api("/api/store/notifications/read-all",{method:"POST"}).catch(()=>null);updateBadge(0);const panel=all.closest(".server-notifications");if(panel)await render(panel);window.dispatchEvent(new CustomEvent("lvg:notification-updated"));return}
    const item=e.target.closest("[data-v2-notification]");
    if(item){const href=item.getAttribute("href");await api(`/api/store/notifications/${item.dataset.v2Notification}/read`,{method:"POST"}).catch(()=>null);item.classList.remove("unread");const panel=item.closest(".server-notifications");if(panel){const unread=panel.querySelectorAll(".server-notification.unread").length;updateBadge(unread);panel.hidden=true}if(!href||href==="#")e.preventDefault();return}
    document.querySelectorAll(".server-notifications:not([hidden])").forEach(panel=>panel.hidden=true);
  },true);
})();
