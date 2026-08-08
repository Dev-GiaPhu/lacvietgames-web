(() => {
  if (document.body.dataset.page !== "play") return;

  function frame() { return document.querySelector(".play-shell iframe"); }
  function expectedOrigin() {
    const f = frame();
    if (!f?.src) return null;
    try { return new URL(f.src, location.href).origin; } catch { return null; }
  }

  // Capture before the normal SDK listeners. If an uploaded game navigates its
  // iframe to another origin, that new origin cannot keep using the old SDK channel.
  window.addEventListener("message", event => {
    const f = frame();
    if (!f || event.source !== f.contentWindow) return;
    const origin = expectedOrigin();
    if (!origin || event.origin !== origin) {
      event.stopImmediatePropagation();
    }
  }, true);
})();
