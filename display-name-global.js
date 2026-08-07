(() => {
  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

  function locateSession() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem("lacvietgamesStoreSession");
        if (raw) return { storage, session: JSON.parse(raw) };
      } catch {}
    }
    return null;
  }

  function applyName(name) {
    if (!name) return;
    document.querySelectorAll(".account-btn span:last-child,[data-server-display-name]").forEach(el => {
      if (el.textContent !== name) el.textContent = name;
    });
  }

  async function apply() {
    const located = locateSession();
    if (!located?.session?.token) return;

    // Sau lần lấy đầu tiên, tất cả trang dùng cache local. Không gọi API lại.
    const cached = located.session.effectiveDisplayName || located.session.displayName;
    if (cached) {
      applyName(cached);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/store/profile`, {
        headers: { Authorization: `Bearer ${located.session.token}` }
      });
      if (!response.ok) return;
      const payload = await response.json();
      const profile = payload.data;
      if (!profile) return;

      located.session.displayName = profile.displayName || null;
      located.session.effectiveDisplayName = profile.effectiveDisplayName || profile.name;
      located.session.email = profile.email || located.session.email;
      located.storage.setItem("lacvietgamesStoreSession", JSON.stringify(located.session));
      applyName(located.session.effectiveDisplayName);
    } catch {}
  }

  const boot = () => setTimeout(apply, 120);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
