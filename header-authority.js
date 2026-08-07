(() => {
  const STORE_KEY = "lacvietgamesStoreSession";

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[c]));
  }

  function removeServerControls(header) {
    header.querySelector(".coin-pill")?.remove();
    header.querySelector(".server-bell-wrap")?.remove();
    header.querySelector(".publisher-link")?.remove();
    header.querySelector(".admin-link")?.remove();
  }

  function renderLoggedOut(header) {
    removeServerControls(header);
    document.body.classList.remove("server-authenticated");
    const account = header.querySelector(".account-btn");
    if (account) account.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
  }

  function renderLoggedIn(header, session) {
    document.body.classList.add("server-authenticated");
    const name = session.effectiveDisplayName || session.displayName || session.name || "Tài khoản";

    let account = header.querySelector(".account-btn");
    const loginButton = header.querySelector("[data-open-server-auth]");
    if (!account && loginButton) {
      loginButton.outerHTML = `<a class="account-btn" href="./profile.html"><span class="avatar-mini">${esc(name.charAt(0).toUpperCase())}</span><span>${esc(name)}</span></a>`;
      account = header.querySelector(".account-btn");
    }
    if (!account) return;

    const avatar = account.querySelector(".avatar-mini");
    const label = account.querySelector("span:last-child");
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
    if (label) label.textContent = name;

    let coin = header.querySelector(".coin-pill");
    if (!coin) {
      account.insertAdjacentHTML("beforebegin", '<a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b></b></a>');
      coin = header.querySelector(".coin-pill");
    }
    const coinText = coin?.querySelector("b");
    if (coinText) coinText.textContent = Number(session.coinBalance || 0).toLocaleString("vi-VN");

    let bellWrap = header.querySelector(".server-bell-wrap");
    if (!bellWrap) {
      account.insertAdjacentHTML("beforebegin", '<span class="server-bell-wrap"><button class="icon-btn server-bell" type="button" title="Thông báo">🔔<span class="server-badge" hidden></span></button><div class="server-notifications" hidden></div></span>');
      bellWrap = header.querySelector(".server-bell-wrap");
    }
    const badge = bellWrap?.querySelector(".server-badge");
    if (badge) {
      const unread = Number(session.unreadNotifications || 0);
      badge.hidden = unread <= 0;
      badge.textContent = unread > 0 ? String(Math.min(99, unread)) : "";
    }

    if (!header.querySelector(".publisher-link")) {
      account.insertAdjacentHTML("beforebegin", '<a class="publisher-link btn btn-secondary" href="./publisher.html">Đăng game</a>');
    }

    const isAdmin = String(session.role || "").toLowerCase() === "admin";
    const admin = header.querySelector(".admin-link");
    if (isAdmin && !admin) account.insertAdjacentHTML("beforebegin", '<a class="admin-link btn btn-secondary" href="./admin.html">Admin</a>');
    if (!isAdmin && admin) admin.remove();
  }

  function apply() {
    const header = document.querySelector(".header-actions");
    if (!header) return false;
    const session = readSession();
    if (!session?.token) renderLoggedOut(header);
    else renderLoggedIn(header, session);
    return true;
  }

  // Không MutationObserver: tránh vòng lặp render và CPU 100%.
  // Chỉ thử vài lần LOCAL trong lúc store.js đang dựng header, không có request mạng.
  function applyAfterHeaderRender() {
    if (apply()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (apply() || attempts >= 10) clearInterval(timer);
    }, 50);
  }

  window.addEventListener("lvg:session-hydrated", () => applyAfterHeaderRender());
  window.addEventListener("lvg:session-invalid", () => applyAfterHeaderRender());
  window.addEventListener("storage", event => {
    if (event.key === STORE_KEY) applyAfterHeaderRender();
  });

  const boot = () => {
    applyAfterHeaderRender();
    // Sau window load, store.js chắc chắn đã render xong header.
    window.addEventListener("load", applyAfterHeaderRender, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
