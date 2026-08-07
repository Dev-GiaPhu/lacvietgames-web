window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

/*
 * Session authority
 * - Không polling server.
 * - Token v2 tự chứa thời hạn; trình duyệt kiểm tra thời hạn hoàn toàn local.
 * - Request API có Authorization nếu nhận 401 sẽ xoá session ngay.
 * - Các request /api/store/me phát sinh đồng thời lúc boot được gộp thành 1 request mạng.
 */
(() => {
  const STORE_KEY = "lacvietgamesStoreSession";
  const LEGACY_KEY = "lacvietgamesSession";
  const API_BASE = window.APP_CONFIG.API_BASE_URL.replace(/\/$/, "");
  const RELOAD_KEY = "__lvg_session_refreshing";
  let expiryTimer = null;
  let invalidating = false;
  let inflightMe = null;
  let inflightMeClearTimer = null;

  function locate() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(STORE_KEY);
        if (raw) return { storage, session: JSON.parse(raw) };
      } catch {}
    }
    return null;
  }

  function read() {
    return locate()?.session || null;
  }

  function clear() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        storage.removeItem(STORE_KEY);
        storage.removeItem(LEGACY_KEY);
      } catch {}
    }
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  function tokenExpiresAt(token) {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;
    try {
      const encoded = token.split(".", 1)[0].replace(/-/g, "+").replace(/_/g, "/");
      const padded = encoded + "=".repeat((4 - encoded.length % 4) % 4);
      const payload = atob(padded);
      const parts = payload.split("|");
      if (parts.length !== 2) return null;
      const ticks = BigInt(parts[1]);
      const unixEpochTicks = 621355968000000000n;
      const milliseconds = Number((ticks - unixEpochTicks) / 10000n);
      return Number.isFinite(milliseconds) ? milliseconds : null;
    } catch {
      return null;
    }
  }

  function refreshLoggedOutUi() {
    document.body?.classList.remove("server-authenticated");
    window.dispatchEvent(new CustomEvent("lvg:session-invalid"));
    if (document.readyState !== "loading" && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      location.reload();
    }
  }

  function invalidate(reason = "invalid") {
    if (invalidating) return;
    invalidating = true;
    const hadSession = !!read();
    clear();
    if (hadSession) refreshLoggedOutUi();
    setTimeout(() => { invalidating = false; }, 0);
  }

  function scheduleExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
    const session = read();
    if (!session?.token) return;
    const expiresAt = tokenExpiresAt(session.token);
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      invalidate("expired");
      return;
    }
    expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining + 50, 2_000_000_000));
  }

  function cacheServerAccount(data) {
    if (!data || typeof data !== "object") return;
    const located = locate();
    if (!located?.session) return;
    const session = located.session;
    if (data.id != null) session.id = data.id;
    if (data.name != null) session.name = data.name;
    if (Object.prototype.hasOwnProperty.call(data, "displayName")) session.displayName = data.displayName || null;
    if (data.effectiveDisplayName != null) session.effectiveDisplayName = data.effectiveDisplayName;
    if (data.email != null) session.email = data.email;
    if (data.role != null) session.role = data.role;
    if (data.coinBalance != null) session.coinBalance = data.coinBalance;
    if (data.unreadNotifications != null) session.unreadNotifications = data.unreadNotifications;
    if (Array.isArray(data.library)) session.library = data.library;
    session.serverValidatedAt = Date.now();
    located.storage.setItem(STORE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent("lvg:session-hydrated", { detail: session }));
  }

  const initial = read();
  if (initial?.token && !initial.token.includes(".")) {
    clear();
  } else if (initial?.token) {
    const expiresAt = tokenExpiresAt(initial.token);
    if (expiresAt && expiresAt <= Date.now()) clear();
  }

  if (!read()) sessionStorage.removeItem(RELOAD_KEY);
  scheduleExpiry();

  window.LVGSession = { read, clear, invalidate, tokenExpiresAt, scheduleExpiry, cacheServerAccount };

  const nativeFetch = window.fetch.bind(window);

  function inspectResponse(response, url, authenticated) {
    try {
      if (response.status === 401 && authenticated) {
        queueMicrotask(() => invalidate("server-unauthorized"));
      } else if (response.ok && authenticated && (url.includes("/api/store/me") || url.includes("/api/store/profile"))) {
        response.clone().json().then(payload => {
          const data = payload?.data;
          if (data && !Array.isArray(data)) cacheServerAccount(data);
        }).catch(() => {});
      }
    } catch {}
  }

  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    let headers;
    try {
      headers = new Headers(init?.headers || (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined));
    } catch {
      headers = new Headers();
    }
    const authenticated = url.startsWith(API_BASE) && headers.has("Authorization");
    const isMeRequest = authenticated && method === "GET" && url.includes("/api/store/me");

    if (isMeRequest) {
      if (!inflightMe) {
        inflightMe = nativeFetch(input, init).then(response => {
          inspectResponse(response, url, authenticated);
          // Giữ một template response chưa bị consumer đọc body; mọi caller nhận clone riêng.
          return response.clone();
        });
        inflightMe.finally(() => {
          clearTimeout(inflightMeClearTimer);
          inflightMeClearTimer = setTimeout(() => { inflightMe = null; }, 1200);
        }).catch(() => {});
      }
      const template = await inflightMe;
      return template.clone();
    }

    const response = await nativeFetch(input, init);
    inspectResponse(response, url, authenticated);
    return response;
  };

  window.addEventListener("storage", event => {
    if ((event.key === STORE_KEY || event.key === LEGACY_KEY) && event.newValue === null && event.oldValue !== null) {
      clear();
      refreshLoggedOutUi();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleExpiry();
  });

  const hadSessionAtBoot = !!initial?.token;
  if (hadSessionAtBoot) {
    setTimeout(() => {
      if (!read() && !sessionStorage.getItem(RELOAD_KEY)) refreshLoggedOutUi();
    }, 2500);
  }
})();

const serverWalletGuardStyle = document.createElement("style");
serverWalletGuardStyle.textContent = `
  .header-actions > .coin-pill { display: none !important; }
  body.server-authenticated .header-actions > .coin-pill { display: flex !important; }
  .server-auth-form[hidden], #serverAuthMain[hidden], #serverVerifyForm[hidden] { display: none !important; }
  .server-auth-modal { overflow-y: auto !important; overscroll-behavior: contain; }
  .server-auth-card { max-height: calc(100dvh - 40px) !important; overflow-y: auto !important; scrollbar-gutter: stable; }
  @media (max-height: 760px) {
    .server-auth-modal { place-items: start center !important; padding-top: 12px !important; padding-bottom: 12px !important; }
    .server-auth-card { max-height: calc(100dvh - 24px) !important; }
  }
`;
document.head.appendChild(serverWalletGuardStyle);

const version = "20260807-2255-stable";
function loadScript(path) {
  const script = document.createElement("script");
  script.src = `${path}?v=${version}`;
  script.defer = true;
  document.head.appendChild(script);
}

loadScript("./registration-flow.js");
loadScript("./store-session.js");
loadScript("./header-authority.js");
loadScript("./account-enhancements.js");
loadScript("./display-name-global.js");
loadScript("./footer-links.js");
loadScript("./protected-pages.js");
