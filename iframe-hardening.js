(() => {
  if (document.body.dataset.page !== "play") return;

  function harden() {
    const iframe = document.querySelector(".play-shell iframe");
    if (!iframe) return false;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-popups-to-escape-sandbox");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
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
