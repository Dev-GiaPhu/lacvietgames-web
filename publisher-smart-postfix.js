(() => {
  if (document.body?.dataset.page !== 'publisher') return;
  const $ = id => document.getElementById(id);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-new-version]')) window.LVGWebGlUpload?.clearVersion?.();
  }, true);

  $('gameSubmissionForm')?.addEventListener('reset', () => {
    setTimeout(() => {
      const info = $('downloadFileInfo');
      if (info) info.textContent = 'Chưa chọn file. File chỉ được upload khi gửi game.';
    }, 0);
  });

  const success = $('publisherSuccessModal');
  if (success) {
    new MutationObserver(() => {
      if (!success.hidden) {
        const button = $('submitGameButton');
        if (button) button.textContent = 'Gửi game để Admin duyệt';
      }
    }).observe(success, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
