(() => {
  if (document.body.dataset.page !== "play") return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  let pendingLoginRequestId = null;
  let playtimeTimer = null;
  let playtimeBusy = false;

  function readAccountSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem("lacvietgamesStoreSession");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function gameFrame() {
    return document.querySelector(".play-shell iframe");
  }

  function gameOrigin() {
    const frame = gameFrame();
    if (!frame?.src) return "*";
    try { return new URL(frame.src, location.href).origin; } catch { return "*"; }
  }

  function postToGame(payload) {
    const frame = gameFrame();
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(payload, gameOrigin());
  }

  async function api(path, options = {}) {
    const account = readAccountSession();
    if (!account?.token) throw Object.assign(new Error("Bạn cần đăng nhập LacVietGames."), { code: "AUTH_REQUIRED" });

    const response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.token}`,
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const error = new Error(payload?.message || "LacVietGames server từ chối yêu cầu.");
      error.code = payload?.code || `HTTP_${response.status}`;
      throw error;
    }
    return payload;
  }

  function cacheBalance(coinBalance) {
    if (coinBalance == null) return;
    try { window.LVGSession?.cacheServerAccount?.({ coinBalance: Number(coinBalance) }); } catch {}
  }

  async function loadWallet() {
    const payload = await api("/api/store/game-sdk/wallet");
    const data = payload?.data || {};
    cacheBalance(data.coinBalance);
    return data;
  }

  function openLogin() {
    const button = document.querySelector("[data-open-server-auth]");
    if (button) { button.click(); return; }
    setTimeout(() => document.querySelector("[data-open-server-auth]")?.click(), 250);
  }

  async function answerAuth(requestId) {
    try {
      const data = await loadWallet();
      postToGame({
        type: "LVG_AUTH_RESULT",
        requestId,
        success: true,
        accountId: Number(data.accountId || 0),
        displayName: data.displayName || "",
        email: data.email || "",
        coinBalance: Number(data.coinBalance || 0)
      });
      return true;
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") return false;
      postToGame({ type: "LVG_AUTH_RESULT", requestId, success: false, code: error.code || "AUTH_ERROR", message: error.message });
      return false;
    }
  }

  async function requestAuth(requestId) {
    if (await answerAuth(requestId)) return;
    pendingLoginRequestId = requestId;
    openLogin();
  }

  async function requestWallet(requestId) {
    try {
      const data = await loadWallet();
      postToGame({
        type: "LVG_WALLET_RESULT",
        requestId,
        success: true,
        accountId: Number(data.accountId || 0),
        displayName: data.displayName || "",
        email: data.email || "",
        coinBalance: Number(data.coinBalance || 0)
      });
    } catch (error) {
      postToGame({ type: "LVG_WALLET_RESULT", requestId, success: false, code: error.code || "WALLET_ERROR", message: error.message });
    }
  }

  function hostRequestId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }

  async function claimEvent(eventKey, unityRequestId) {
    const play = window.LVGPlaySession;
    if (!play?.sessionId || !play?.clientToken) {
      postToGame({ type: "LVG_REWARD_RESULT", requestId: unityRequestId, success: false, code: "PLAY_SESSION_REQUIRED", message: "Hãy bắt đầu gameplay trước khi nhận reward.", eventKey });
      return;
    }

    try {
      const payload = await api("/api/store/game-sdk/rewards/claim", {
        method: "POST",
        body: {
          sessionId: play.sessionId,
          clientToken: play.clientToken,
          eventKey,
          requestId: hostRequestId()
        }
      });
      const data = payload?.data || {};
      cacheBalance(data.coinBalance);
      postToGame({
        type: "LVG_REWARD_RESULT",
        requestId: unityRequestId,
        success: true,
        code: payload.code || "REWARD_GRANTED",
        message: payload.message || "",
        eventKey: data.eventKey || eventKey,
        title: data.title || "",
        rewardCoin: Number(data.rewardCoin || 0),
        coinBalance: Number(data.coinBalance || 0),
        elapsedSeconds: Number(data.elapsedSeconds || 0),
        alreadyProcessed: !!data.alreadyProcessed
      });
    } catch (error) {
      postToGame({ type: "LVG_REWARD_RESULT", requestId: unityRequestId, success: false, code: error.code || "REWARD_ERROR", message: error.message, eventKey });
    }
  }

  async function claimPlaytimeRewards() {
    if (playtimeBusy || document.hidden) return;
    const play = window.LVGPlaySession;
    if (!play?.sessionId || !play?.clientToken || !readAccountSession()?.token) return;

    playtimeBusy = true;
    try {
      const payload = await api("/api/store/game-sdk/rewards/claim-playtime", {
        method: "POST",
        body: { sessionId: play.sessionId, clientToken: play.clientToken }
      });
      const data = payload?.data || {};
      cacheBalance(data.coinBalance);
      for (const reward of (data.rewards || [])) {
        postToGame({
          type: "LVG_REWARD_RESULT",
          requestId: "playtime",
          success: true,
          code: "PLAYTIME_REWARD_GRANTED",
          eventKey: reward.eventKey || "",
          title: reward.title || "",
          rewardCoin: Number(reward.rewardCoin || 0),
          coinBalance: Number(reward.coinBalance ?? data.coinBalance ?? 0),
          elapsedSeconds: Number(data.elapsedSeconds || 0),
          alreadyProcessed: false
        });
      }
    } catch (error) {
      if (!["PLAY_SESSION_REQUIRED", "PLAY_SESSION_NOT_ACTIVE", "PLAY_SESSION_STALE", "AUTH_REQUIRED"].includes(error.code))
        console.warn("LacVietGames playtime reward check failed", error);
    } finally {
      playtimeBusy = false;
    }
  }

  function startPlaytimeChecks() {
    clearInterval(playtimeTimer);
    claimPlaytimeRewards();
    playtimeTimer = setInterval(claimPlaytimeRewards, 30000);
  }

  function stopPlaytimeChecks() {
    clearInterval(playtimeTimer);
    playtimeTimer = null;
  }

  window.addEventListener("message", event => {
    const frame = gameFrame();
    if (!frame || event.source !== frame.contentWindow) return;

    const data = event.data || {};
    const type = data.type;
    if (type === "LVG_SDK_READY") {
      postToGame({ type: "LVG_HOST_READY", loggedIn: !!readAccountSession()?.token });
      return;
    }
    if (type === "LVG_AUTH_REQUEST") {
      requestAuth(String(data.requestId || "auth"));
      return;
    }
    if (type === "LVG_WALLET_REQUEST") {
      requestWallet(String(data.requestId || "wallet"));
      return;
    }
    if (type === "LVG_REWARD_CLAIM") {
      claimEvent(String(data.eventKey || "").trim().toLowerCase(), String(data.requestId || "reward"));
    }
  });

  window.addEventListener("lvg:session-hydrated", async () => {
    if (pendingLoginRequestId) {
      const requestId = pendingLoginRequestId;
      pendingLoginRequestId = null;
      await answerAuth(requestId);
    }
    if (window.LVGPlaySession) claimPlaytimeRewards();
  });

  window.addEventListener("lvg:play-session-started", startPlaytimeChecks);
  window.addEventListener("lvg:play-session-ended", stopPlaytimeChecks);
  window.addEventListener("pagehide", stopPlaytimeChecks);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && window.LVGPlaySession) claimPlaytimeRewards(); });

  window.LVGGameSdkHost = { loadWallet, claimPlaytimeRewards };
})();
