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

  for (const id of ['webglBuildStatus', 'versionWebglStatus']) {
    const el = $(id);
    if (!el) continue;
    let rewriting = false;
    const normalize = () => {
      if (rewriting || !el.style.color || !el.textContent?.trim() || /^✓/.test(el.textContent)) return;
      if (!/^Upload thất bại:/i.test(el.textContent)) {
        rewriting = true;
        el.textContent = `Upload thất bại: ${el.textContent.trim()}`;
        rewriting = false;
      }
    };
    new MutationObserver(normalize).observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    normalize();
  }
})();
