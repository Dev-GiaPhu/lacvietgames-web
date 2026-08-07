(() => {
  const SALE_PAGE='./sales.html';

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
