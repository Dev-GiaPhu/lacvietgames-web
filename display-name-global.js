(() => {
  function readSession() {
    return window.LVGSession?.read?.() || null;
  }

  function apply(session = readSession()) {
    if (!session) return;
    const name = session.effectiveDisplayName || session.displayName || session.name;
    if (!name) return;
    document.querySelectorAll(".account-btn span:last-child,[data-server-display-name]").forEach(el => {
      if (el.textContent !== name) el.textContent = name;
    });
  }

  window.addEventListener("lvg:session-hydrated", event => apply(event.detail));
  window.addEventListener("lvg:session-invalid", () => {});

  const boot = () => {
    apply();
    // Một lần local sau khi header được render; không có network request.
    setTimeout(() => apply(), 180);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
