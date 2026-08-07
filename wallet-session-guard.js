(() => {
  function readSession(){for(const storage of[localStorage,sessionStorage]){try{const raw=storage.getItem("lacvietgamesStoreSession");if(raw)return JSON.parse(raw)}catch{}}return null}
  function renderExpired(){
    if(document.body.dataset.page!=="wallet")return;
    const app=document.getElementById("app");if(!app||readSession()?.token)return;
    app.innerHTML=`<div class="empty-state"><h2>Đăng nhập để mở Ví Lạc Coin</h2><p>Quản lý số dư, nạp Lạc Coin và xem lịch sử giao dịch của bạn.</p><button class="btn btn-primary" data-open-server-auth>Đăng nhập / Đăng ký</button></div>`;
  }
  const boot=()=>{setTimeout(renderExpired,120);setTimeout(renderExpired,500)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
