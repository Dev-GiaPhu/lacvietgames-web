(() => {
  const STORE_KEY = "lacvietgamesStoreSession";
  let applying = false;
  let queued = false;

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

  function displayName(session) {
    return session?.effectiveDisplayName || session?.displayName || session?.name || "Tài khoản";
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
    if (account) {
      account.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
    }
  }

  function renderLoggedIn(header, session) {
    document.body.classList.add("server-authenticated");
    const name = displayName(session);

    let account = header.querySelector(".account-btn");
    const loginButton = header.querySelector("[data-open-server-auth]");
    if (!account && loginButton) {
      loginButton.outerHTML = `<a class="account-btn" href="./profile.html"><span class="avatar-mini">${esc(name.charAt(0).toUpperCase())}</span><span>${esc(name)}</span></a>`;
      account = header.querySelector(".account-btn");
    }
    if (!account) return;

    const avatar = account.querySelector(".avatar-mini");
    const label = account.querySelector("span:last-child");
    if (avatar && avatar.textContent !== name.charAt(0).toUpperCase()) avatar.textContent = name.charAt(0).toUpperCase();
    if (label && label.textContent !== name) label.textContent = name;

    let coin = header.querySelector(".coin-pill");
    if (!coin) {
      account.insertAdjacentHTML("beforebegin", '<a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b></b></a>');
      coin = header.querySelector(".coin-pill");
    }
    const coinValue = Number(session.coinBalance || 0).toLocaleString("vi-VN");
    const coinText = coin?.querySelector("b");
    if (coinText && coinText.textContent !== coinValue) coinText.textContent = coinValue;

    let bellWrap = header.querySelector(".server-bell-wrap");
    if (!bellWrap) {
      account.insertAdjacentHTML("beforebegin", '<span class="server-bell-wrap"><button class="icon-btn server-bell" type="button" title="Thông báo">🔔</button><div class="server-notifications" hidden></div></span>');
      bellWrap = header.querySelector(".server-bell-wrap");
    }
    const bell = bellWrap?.querySelector(".server-bell");
    if (bell) {
      bell.querySelector(".server-badge")?.remove();
      const unread = Number(session.unreadNotifications || 0);
      if (unread > 0) bell.insertAdjacentHTML("beforeend", `<span class="server-badge">${Math.min(99, unread)}</span>`);
    }

    if (!header.querySelector(".publisher-link")) {
      account.insertAdjacentHTML("beforebegin", '<a class="publisher-link btn btn-secondary" href="./publisher.html">Đăng game</a>');
    }

    const isAdmin = String(session.role || "").toLowerCase() === "admin";
    const admin = header.querySelector(".admin-link");
    if (isAdmin && !admin) {
      account.insertAdjacentHTML("beforebegin", '<a class="admin-link btn btn-secondary" href="./admin.html">Admin</a>');
    } else if (!isAdmin && admin) {
      admin.remove();
    }
  }

  function apply() {
    if (applying) return;
    const header = document.querySelector(".header-actions");
    if (!header) return;
    applying = true;
    try {
      const session = readSession();
      if (!session?.token) renderLoggedOut(header);
      else renderLoggedIn(header, session);
    } finally {
      applying = false;
    }
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      apply();
    });
  }

  window.addEventListener("lvg:session-hydrated", queueApply);
  window.addEventListener("lvg:session-invalid", queueApply);
  window.addEventListener("storage", event => {
    if (event.key === STORE_KEY) queueApply();
  });

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const target = mutation.target;
      if (target instanceof Element && (target.id === "siteHeader" || target.closest?.("#siteHeader"))) {
        queueApply();
        break;
      }
    }
  });

  const boot = () => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    queueApply();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
