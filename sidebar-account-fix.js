(() => {
  const read=()=>window.LVGSession?.read?.()||(()=>{try{const raw=sessionStorage.getItem("lacvietgamesStoreSession");return raw?JSON.parse(raw):null}catch{return null}})();
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function ensureStyle(){
    if(document.getElementById("sidebarAccountFixStyle"))return;
    const style=document.createElement("style");
    style.id="sidebarAccountFixStyle";
    style.textContent=`.lvg-dashboard-shell .sidebar-action.sidebar-account-shortcut{background:linear-gradient(145deg,#c3172c,#790d1b)!important;border-color:rgba(233,193,95,.44)!important;color:#fff3d1!important;box-shadow:0 9px 24px rgba(195,23,44,.24)}.lvg-dashboard-shell .sidebar-action.sidebar-account-shortcut:hover{background:linear-gradient(145deg,#da2137,#931021)!important;border-color:rgba(233,193,95,.72)!important;transform:translateY(-1px)}.sidebar-avatar-letter{font-size:14px;font-weight:900;line-height:1;text-transform:uppercase}`;
    document.head.appendChild(style);
  }

  function apply(){
    const sidebar=document.querySelector(".game-sidebar");
    if(!sidebar)return false;
    const session=read();
    const current=sidebar.querySelector(".sidebar-action");
    if(session?.token){
      const display=session.effectiveDisplayName||session.displayName||session.name||"Tài khoản";
      const initial=String(display).trim().charAt(0).toUpperCase()||"T";
      if(current?.matches('a.sidebar-account-shortcut[href="./profile.html"]')){
        const letter=current.querySelector(".sidebar-avatar-letter");
        if(letter)letter.textContent=initial;
        return true;
      }
      const link=document.createElement("a");
      link.className="sidebar-action sidebar-account-shortcut";
      link.href="./profile.html";
      link.title="Tài khoản";
      link.setAttribute("aria-label","Tài khoản");
      link.innerHTML=`<span class="sidebar-avatar-letter">${esc(initial)}</span>`;
      if(current)current.replaceWith(link);else sidebar.appendChild(link);
      return true;
    }
    if(current?.matches("button[data-open-server-auth]"))return true;
    const button=document.createElement("button");
    button.className="sidebar-action";
    button.type="button";
    button.title="Đăng nhập";
    button.setAttribute("aria-label","Đăng nhập");
    button.setAttribute("data-open-server-auth","");
    button.textContent="＋";
    if(current)current.replaceWith(button);else sidebar.appendChild(button);
    return true;
  }

  ensureStyle();
  const run=()=>{apply();setTimeout(apply,0);setTimeout(apply,100);setTimeout(apply,300)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
  window.addEventListener("lvg:session-hydrated",run);
  window.addEventListener("lvg:login-success",run);
  window.addEventListener("lvg:session-invalid",run);
  const header=document.getElementById("siteHeader")||document.querySelector(".site-header");
  if(header)new MutationObserver(apply).observe(header,{childList:true,subtree:true});
})();
