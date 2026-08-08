(() => {
  if (!document.getElementById("lvgModalSafetyStyle")) {
    const style = document.createElement("style");
    style.id = "lvgModalSafetyStyle";
    style.textContent = `
      .server-auth-modal > .server-auth-card{position:relative!important}
      .server-auth-modal > .server-auth-card:not(.lvg-campaign-card){padding-top:58px!important}
      .server-auth-close{position:absolute!important;top:14px!important;right:14px!important;left:auto!important;width:40px!important;height:40px!important;padding:0!important;margin:0!important;display:grid!important;place-items:center!important;z-index:50!important;border:1px solid rgba(233,193,95,.18)!important;border-radius:12px!important;background:#14090c!important;color:#e4cda8!important;font-size:25px!important;line-height:1!important;cursor:pointer!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important}
      .server-auth-close:hover{background:#2a0d13!important;color:#fff0c9!important;border-color:rgba(233,193,95,.42)!important}.lvg-campaign-card .server-auth-close{top:12px!important;right:12px!important;background:rgba(20,9,12,.92)!important;backdrop-filter:blur(10px)}
      @media(max-width:600px){.server-auth-modal{padding:10px!important}.server-auth-modal > .server-auth-card:not(.lvg-campaign-card){padding-top:54px!important}.server-auth-close{top:10px!important;right:10px!important;width:38px!important;height:38px!important}}
    `;
    document.head.appendChild(style);
  }

  if (document.body?.classList.contains("admin-page") && !window.__LVG_ADMIN_SECURE_BRIDGE__) {
    window.__LVG_ADMIN_SECURE_BRIDGE__ = true;
    const API = (window.APP_CONFIG?.API_BASE_URL || "https://lacvietgames-api-production.up.railway.app").replace(/\/$/, "");
    const COOKIE_SENTINEL = "cookie.session";
    const KEY = "lacvietgamesStoreSession";

    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "./admin-red-gold.css?v=20260809-0405";
    theme.dataset.lvgAdminRuntimeTheme = "1";
    document.head.appendChild(theme);
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = "./favicon.svg?v=20260809-0405";

    const nativeFetch = window.fetch.bind(window);
    async function cookieWorks() {
      try { return (await nativeFetch(`${API}/api/store/me`, { credentials:"include", cache:"no-store", headers:{Accept:"application/json"} })).ok; }
      catch { return false; }
    }
    function makeHeaders(init){try{return new Headers(init?.headers||{})}catch{return new Headers()}}
    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      if (!url.startsWith(API)) return nativeFetch(input, init);
      const next = { ...(init||{}), credentials:"include", cache:"no-store" };
      const headers = makeHeaders(next);
      if (headers.get("Authorization") === `Bearer ${COOKIE_SENTINEL}`) headers.delete("Authorization");
      next.headers = headers;
      let response = await nativeFetch(input, next);

      if (url.includes("/api/store/auth/login") && response.ok) {
        const payload = await response.clone().json().catch(()=>null);
        if (payload?.data?.token) {
          if (await cookieWorks()) {
            if (payload.data.token !== COOKIE_SENTINEL) {
              payload.data.token = COOKIE_SENTINEL;
              payload.data.sessionMode = "secure-cookie";
              const responseHeaders = new Headers(response.headers);
              responseHeaders.set("Content-Type","application/json; charset=utf-8");
              responseHeaders.set("Cache-Control","no-store");
              response = new Response(JSON.stringify(payload), {status:response.status,statusText:response.statusText,headers:responseHeaders});
            }
          } else if (headers.get("X-LVG-Session-Mode") !== "bearer") {
            const fallbackHeaders = new Headers(headers);
            fallbackHeaders.set("X-LVG-Session-Mode","bearer");
            response = await nativeFetch(input,{...next,headers:fallbackHeaders});
          }
        }
      }
      return response;
    };

    try {
      const old = localStorage.getItem(KEY);
      if (old && !sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, old);
      localStorage.removeItem(KEY);
      localStorage.removeItem("lacvietgamesSession");
    } catch {}
  }

  window.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const isBackdrop = target.classList.contains("server-auth-modal") || target.classList.contains("admin-modal");
    if (!isBackdrop) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
