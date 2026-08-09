(() => {
  if (window.__LVG_NETWORK_TIMEOUT_GUARD__) return;
  window.__LVG_NETWORK_TIMEOUT_GUARD__ = true;

  const nativeFetch = window.fetch.bind(window);
  const API_HOST = "https://lacvietgames-api-production.up.railway.app";

  function timeoutFor(url) {
    if (!String(url).startsWith(API_HOST)) return 0;
    if (String(url).includes("/api/store/auth/login")) return 12000;
    if (String(url).includes("/api/store/me")) return 6000;
    return 0;
  }

  window.fetch = async function(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const timeoutMs = timeoutFor(url);
    if (!timeoutMs || init?.signal) return nativeFetch(input, init);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await nativeFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("Kết nối đang chậm. Vui lòng thử lại.");
        timeoutError.code = "REQUEST_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
})();
