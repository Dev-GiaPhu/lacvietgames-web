(() => {
  const SALE_PAGE='./sales.html';

  if(!document.querySelector('link[data-admin-modal-fix]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./admin-modal-fix.css?v=20260808-0450-modal-layout';
    link.dataset.adminModalFix='1';
    document.head.appendChild(link);
  }

  function applyDefault(){
    const input=document.getElementById('saleAnnUrl');
    if(input&&!input.value.trim())input.value=SALE_PAGE;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#newSale'))setTimeout(applyDefault,0);
    if(e.target.closest('[data-edit-sale]'))setTimeout(applyDefault,0);
  });

  document.addEventListener('submit',e=>{
    if(e.target?.id==='saleForm')applyDefault();
  },true);
})();
