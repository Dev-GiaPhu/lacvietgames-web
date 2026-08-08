(() => {
  if (document.body.dataset.page !== "play") return;

  function harden() {
    const iframe = document.querySelector(".play-shell iframe");
    if (!iframe) return false;

    // Uploaded games are always treated as untrusted third-party code.
    // Keep only the capabilities Unity WebGL needs; block forms, popups,
    // top navigation and escape-from-sandbox behavior.
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.setAttribute("allow", "fullscreen; gamepad; autoplay");
    iframe.setAttribute("loading", "eager");
    return true;
  }

  if (harden()) return;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (harden() || attempts >= 40) clearInterval(timer);
  }, 100);
})();
