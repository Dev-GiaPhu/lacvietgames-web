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

  function removeAll(header, selector) {
    header.querySelectorAll(selector).forEach(el => el.remove());
  }

  function removeServerControls(header) {
    removeAll(header, ".coin-pill");
    removeAll(header, ".server-bell-wrap");
    removeAll(header, ".publisher-link");
    removeAll(header, ".admin-link");
  }

  function keepSingleAccount(header) {
    const accounts = [...header.querySelectorAll(".account-btn")];
    accounts.slice(1).forEach(el => el.remove());
    const loginButtons = [...header.querySelectorAll("[data-open-server-auth]")];
    if (accounts.length) loginButtons.forEach(el => el.remove());
    else loginButtons.slice(1).forEach(el => el.remove());
  }

  function renderLoggedOut(header) {
    removeServerControls(header);
    keepSingleAccount(header);
    document.body.classList.remove("server-authenticated");
    const account = header.querySelector(".account-btn");
    if (account) account.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
    keepSingleAccount(header);
  }

  function renderLoggedIn(header, session) {
    document.body.classList.add("server-authenticated");
    removeServerControls(header);
    keepSingleAccount(header);

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

    account.insertAdjacentHTML("beforebegin", `<a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b>${Number(session.coinBalance || 0).toLocaleString("vi-VN")}</b></a>`);
    account.insertAdjacentHTML("beforebegin", '<span class="server-bell-wrap"><button class="icon-btn server-bell" type="button" title="Thông báo">🔔<span class="server-badge" hidden></span></button><div class="server-notifications" hidden></div></span>');

    const badge = header.querySelector(".server-badge");
    if (badge) {
      const unread = Number(session.unreadNotifications || 0);
      badge.hidden = unread <= 0;
      badge.textContent = unread > 0 ? String(Math.min(99, unread)) : "";
    }

    const page = document.body?.dataset?.page || "";
    if (page !== "publisher") {
      account.insertAdjacentHTML("beforebegin", '<a class="publisher-link btn btn-secondary" href="./publisher.html">Đăng game</a>');
    }

    const isAdmin = String(session.role || "").toLowerCase() === "admin";
    if (isAdmin && page !== "admin") {
      account.insertAdjacentHTML("beforebegin", '<a class="admin-link btn btn-secondary" href="./admin.html">Admin</a>');
    }
  }

  function apply() {
    const header = document.querySelector(".header-actions");
    if (!header) return false;
    const session = readSession();
    if (!session?.token) renderLoggedOut(header);
    else renderLoggedIn(header, session);
    return true;
  }

  function normalizeAfterCompetingRender() {
    apply();
    // store-session.js cũng hydrate header. Chạy lại LOCAL sau cùng để dọn mọi nút
    // mà script khác vừa chèn, không polling và không tạo request mạng.
    setTimeout(apply, 0);
    setTimeout(apply, 80);
    setTimeout(apply, 220);
  }

  function applyAfterHeaderRender() {
    if (apply()) {
      normalizeAfterCompetingRender();
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (apply()) {
        clearInterval(timer);
        normalizeAfterCompetingRender();
      } else if (attempts >= 10) {
        clearInterval(timer);
      }
    }, 50);
  }

  window.addEventListener("lvg:session-hydrated", applyAfterHeaderRender);
  window.addEventListener("lvg:session-invalid", applyAfterHeaderRender);
  window.addEventListener("lvg:login-success", applyAfterHeaderRender);
  window.addEventListener("storage", event => {
    if (event.key === STORE_KEY) applyAfterHeaderRender();
  });

  const boot = () => {
    applyAfterHeaderRender();
    window.addEventListener("load", applyAfterHeaderRender, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
