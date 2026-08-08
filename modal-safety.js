(() => {
  if (!document.getElementById("lvgModalSafetyStyle")) {
    const style = document.createElement("style");
    style.id = "lvgModalSafetyStyle";
    style.textContent = `
      .server-auth-modal > .server-auth-card{position:relative!important}
      .server-auth-modal > .server-auth-card:not(.lvg-campaign-card){padding-top:58px!important}
      .server-auth-close{
        position:absolute!important;top:14px!important;right:14px!important;left:auto!important;
        width:40px!important;height:40px!important;padding:0!important;margin:0!important;
        display:grid!important;place-items:center!important;z-index:50!important;
        border:1px solid rgba(233,193,95,.18)!important;border-radius:12px!important;
        background:#14090c!important;color:#e4cda8!important;
        font-size:25px!important;line-height:1!important;cursor:pointer!important;
        box-shadow:0 8px 24px rgba(0,0,0,.28)!important;
      }
      .server-auth-close:hover{background:#2a0d13!important;color:#fff0c9!important;border-color:rgba(233,193,95,.42)!important}
      .lvg-campaign-card .server-auth-close{top:12px!important;right:12px!important;background:rgba(20,9,12,.92)!important;backdrop-filter:blur(10px)}
      @media(max-width:600px){
        .server-auth-modal{padding:10px!important}
        .server-auth-modal > .server-auth-card:not(.lvg-campaign-card){padding-top:54px!important}
        .server-auth-close{top:10px!important;right:10px!important;width:38px!important;height:38px!important}
      }
    `;
    document.head.appendChild(style);
  }

  // Backdrop is not an implicit close action. Only explicit buttons/keyboard handling close a modal.
  window.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const isBackdrop = target.classList.contains("server-auth-modal") || target.classList.contains("admin-modal");
    if (!isBackdrop) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
