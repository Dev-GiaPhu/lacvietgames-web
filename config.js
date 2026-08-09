window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

(() => {
  for (const [href, marker] of [
    ["./premium-theme.css?v=20260809-1340", "lvgPremiumTheme"],
    ["./gaming-dashboard.css?v=20260809-1340", "lvgGamingDashboard"]
  ]) {
    const attr = `data-${marker.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}`;
    if (document.querySelector(`link[${attr}]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[marker] = "1";
    document.head.appendChild(link);
  }
})();

(() => {
  const STORE_KEY = "lacvietgamesStoreSession";
  const LEGACY_KEY = "lacvietgamesSession";
  const COOKIE_SENTINEL = "cookie.session";
  const API_BASE = window.APP_CONFIG.API_BASE_URL.replace(/\/$/, "");
  const protectedStorageKeys = new Set([STORE_KEY, LEGACY_KEY]);
  let expiryTimer = null;
  let invalidating = false;
  let inflightMe = null;
  let inflightMeClearTimer = null;

  for (const key of protectedStorageKeys) {
    try {
      const persistent = localStorage.getItem(key);
      if (persistent && !sessionStorage.getItem(key)) sessionStorage.setItem(key, persistent);
      localStorage.removeItem(key);
    } catch {}
  }

  const nativeStorageSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && protectedStorageKeys.has(String(key))) return nativeStorageSetItem.call(sessionStorage, key, value);
    return nativeStorageSetItem.call(this, key, value);
  };

  function locate() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) return { storage: sessionStorage, session: JSON.parse(raw) };
    } catch {}
    return null;
  }

  function read() { return locate()?.session || null; }

  function clear() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        storage.removeItem(STORE_KEY);
        storage.removeItem(LEGACY_KEY);
      } catch {}
    }
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  function tokenExpiresAt(token) {
    if (!token || token === COOKIE_SENTINEL || typeof token !== "string" || !token.includes(".")) return null;
    try {
      const encoded = token.split(".", 1)[0].replace(/-/g, "+").replace(/_/g, "/");
      const padded = encoded + "=".repeat((4 - encoded.length % 4) % 4);
      const parts = atob(padded).split("|");
      let ticks = null;
      if (parts[0] === "3" && parts.length === 5) ticks = BigInt(parts[3]);
      else if (parts.length >= 2 && parts.length <= 3) ticks = BigInt(parts[1]);
      if (ticks == null) return null;
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
  }

  function invalidate(reason = "invalid") {
    if (invalidating) return;
    invalidating = true;
    const hadSession = !!read();
    clear();
    if (hadSession) refreshLoggedOutUi();
    window.dispatchEvent(new CustomEvent("lvg:session-cleared", { detail:{ reason } }));
    queueMicrotask(() => { invalidating = false; });
  }

  function scheduleExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
    const session = read();
    if (!session?.token || session.token === COOKIE_SENTINEL) return;
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

  function cachedMeResponse() {
    const s = read();
    if (!s?.token) return null;
    return new Response(JSON.stringify({
      success:true,
      data:{
        id:s.id,
        name:s.name,
        displayName:s.displayName||null,
        effectiveDisplayName:s.effectiveDisplayName||s.displayName||s.name,
        email:s.email,
        role:s.role||"User",
        coinBalance:Number(s.coinBalance||0),
        unreadNotifications:Number(s.unreadNotifications||0),
        library:Array.isArray(s.library)?s.library:[]
      }
    }), { status:200, headers:{"Content-Type":"application/json","X-LVG-Cache":"1","Cache-Control":"no-store"} });
  }

  const initial = read();
  if (initial?.token && initial.token !== COOKIE_SENTINEL && !initial.token.includes(".")) clear();
  else if (initial?.token && initial.token !== COOKIE_SENTINEL) {
    const expiresAt = tokenExpiresAt(initial.token);
    if (expiresAt && expiresAt <= Date.now()) clear();
  }
  scheduleExpiry();

  const nativeFetch = window.fetch.bind(window);

  function requestTimeout(url, method) {
    if (!String(url).startsWith(API_BASE)) return 0;
    if (String(url).includes("/api/store/me")) return 8000;
    if (String(url).includes("/api/store/auth/login")) return 12000;
    if (String(url).includes("/api/Accounts/register") || String(url).includes("forgot-password") || String(url).includes("verify-email")) return 18000;
    if (String(url).includes("/payments/") || String(url).includes("/webgl-uploads/")) return 20000;
    return method === "GET" ? 12000 : 15000;
  }

  function normalizeApiInit(init, isApi, authenticated) {
    if (!isApi) return init || {};
    const normalized = { ...(init || {}), credentials:"include", ...(authenticated ? { cache:"no-store" } : {}) };
    try {
      const headers = new Headers(normalized.headers || {});
      if (read()?.token === COOKIE_SENTINEL && headers.get("Authorization") === `Bearer ${COOKIE_SENTINEL}`) headers.delete("Authorization");
      normalized.headers = headers;
    } catch {}
    return normalized;
  }

  async function fetchWithTimeout(input, init, url, method) {
    const existingSignal = init?.signal || (typeof Request !== "undefined" && input instanceof Request ? input.signal : null);
    const timeoutMs = requestTimeout(url, method);
    if (!timeoutMs || existingSignal) return nativeFetch(input, init);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await nativeFetch(input, { ...(init || {}), signal:controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeout = new Error("Kết nối đang chậm. Vui lòng thử lại.");
        timeout.code = "REQUEST_TIMEOUT";
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function inspectResponse(response, url, authenticated) {
    try {
      if (response.status === 401 && authenticated) {
        queueMicrotask(() => invalidate("server-unauthorized"));
      } else if (response.ok && authenticated && !response.headers.get("X-LVG-Cache") && (url.includes("/api/store/me") || url.includes("/api/store/profile"))) {
        response.clone().json().then(payload => {
          const data = payload?.data;
          if (data && !Array.isArray(data)) cacheServerAccount(data);
        }).catch(() => {});
      }
    } catch {}
  }

  async function fetchMe(input, init, url, authenticated) {
    const requestInit = normalizeApiInit(init, true, true);
    requestInit.cache = "no-store";
    try {
      const response = await fetchWithTimeout(input, requestInit, url, "GET");
      inspectResponse(response, url, authenticated);
      return response.clone();
    } catch (error) {
      const cached = cachedMeResponse();
      if (cached && error?.code === "REQUEST_TIMEOUT") return cached;
      throw error;
    }
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
    const isApi = url.startsWith(API_BASE);
    const authenticated = isApi && (headers.has("Authorization") || !!read()?.token);
    const isMeRequest = authenticated && method === "GET" && url.includes("/api/store/me");

    if (isMeRequest) {
      if (!inflightMe) {
        inflightMe = fetchMe(input, init, url, authenticated);
        inflightMe.finally(() => {
          clearTimeout(inflightMeClearTimer);
          inflightMeClearTimer = setTimeout(() => { inflightMe = null; }, 500);
        }).catch(() => {});
      }
      const template = await inflightMe;
      return template.clone();
    }

    const requestInit = normalizeApiInit(init, isApi, authenticated);
    const response = await fetchWithTimeout(input, requestInit, url, method);
    inspectResponse(response, url, authenticated);
    return response;
  };

  async function logout() {
    try {
      await fetchWithTimeout(`${API_BASE}/api/store/auth/logout`, { method:"POST", credentials:"include", cache:"no-store", keepalive:true }, `${API_BASE}/api/store/auth/logout`, "POST");
    } catch {}
    clear();
    refreshLoggedOutUi();
  }

  window.LVGSession = {
    read,
    clear,
    logout,
    invalidate,
    tokenExpiresAt,
    scheduleExpiry,
    cacheServerAccount,
    cookieSentinel:COOKIE_SENTINEL
  };

  window.addEventListener("storage", event => {
    if ((event.key === STORE_KEY || event.key === LEGACY_KEY) && event.newValue === null && event.oldValue !== null) {
      clear();
      refreshLoggedOutUi();
    }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleExpiry(); });

  const removeRemember = () => document.getElementById("serverRemember")?.closest("label")?.remove();
  document.addEventListener("DOMContentLoaded", removeRemember);
  new MutationObserver(removeRemember).observe(document.documentElement, { childList:true, subtree:true });
})();

const serverWalletGuardStyle = document.createElement("style");
serverWalletGuardStyle.textContent = `.header-actions > .coin-pill{display:none!important}body.server-authenticated .header-actions > .coin-pill{display:flex!important}.server-auth-form[hidden],#serverAuthMain[hidden],#serverVerifyForm[hidden],.server-auth-modal[hidden]{display:none!important}.server-auth-modal{overflow-y:auto!important;overscroll-behavior:contain}.server-auth-card{max-height:calc(100dvh - 40px)!important;overflow-y:auto!important;scrollbar-gutter:stable}label:has(#serverRemember){display:none!important}@media(max-height:760px){.server-auth-modal{place-items:start center!important;padding-top:12px!important;padding-bottom:12px!important}.server-auth-card{max-height:calc(100dvh - 24px)!important}}`;
document.head.appendChild(serverWalletGuardStyle);

const version = "20260809-1340-page-aware-runtime";
function loadScript(path) {
  const script = document.createElement("script");
  script.src = `${path}?v=${version}`;
  script.async = false;
  document.head.appendChild(script);
}

const runtimePage = document.body?.dataset?.page || "";
const authPage = document.body?.classList.contains("auth-page");

// Transport fallback is tiny and must be installed before any login handler.
loadScript("./registration-flow.js");

if (!authPage) {
  // Shared storefront shell.
  loadScript("./modal-safety.js");
  loadScript("./store-session.js");
  loadScript("./header-authority.js");
  loadScript("./notification-center-v2.js");
  loadScript("./account-enhancements.js");
  loadScript("./display-name-global.js");
  loadScript("./footer-links.js");
  loadScript("./protected-pages.js");
  loadScript("./store-production-fixes.js");

  // Page-specific features. Do not download observers/controllers that cannot be used here.
  if (runtimePage === "home") loadScript("./login-campaigns.js");
  if (["home", "catalog", "game"].includes(runtimePage)) loadScript("./store-experience.js");
  if (runtimePage === "library") loadScript("./library-download.js");
  if (["profile", "editProfile"].includes(runtimePage)) loadScript("./profile-security.js");
  if (["home", "catalog", "game", "library", "wallet", "profile", "editProfile", "play"].includes(runtimePage)) loadScript("./tasks-nav.js");
}
