(() => {
  if (document.body.dataset.page !== "play") return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const gameSlug = new URLSearchParams(location.search).get("id") || "";
  const LEASE_EXPIRE_MS = 5 * 60 * 1000;
  let playSession = null;
  let checkpointTimer = null;
  let ending = false;
  let starting = false;
  let gameplayRequested = false;
  let lastLeaseAt = 0;
  let retryTimer = null;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try { const raw = storage.getItem("lacvietgamesStoreSession"); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    if (!gameplayRequested || playSession || starting) return;
    retryTimer = setTimeout(() => startSession(), 4000);
  }

  async function startSession() {
    if (!gameplayRequested || starting || playSession || !gameSlug) return;
    const account = readSession();
    if (!account?.token) { scheduleRetry(); return; }
    starting = true;
    try {
      const response = await fetch(`${API}/api/store/play-sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${account.token}` },
        body: JSON.stringify({ gameSlug })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.sessionId || !payload?.data?.clientToken) {
        scheduleRetry();
        return;
      }
      playSession = payload.data;
      ending = false;
      lastLeaseAt = Date.now();
      window.LVGPlaySession = playSession;
      scheduleCheckpoint(Number(playSession.checkpointSeconds || 120));
      window.dispatchEvent(new CustomEvent("lvg:play-session-started", { detail: playSession }));
    } catch (error) {
      console.warn("LacVietGames play session start failed", error);
      scheduleRetry();
    } finally {
      starting = false;
    }
  }

  function scheduleCheckpoint(seconds) {
    clearInterval(checkpointTimer);
    const interval = Math.max(60, Math.min(240, Number(seconds || 120))) * 1000;
    checkpointTimer = setInterval(checkpoint, interval);
  }

  async function restartExpiredLease() {
    if (!gameplayRequested) return false;
    if (!playSession) { await startSession(); return true; }
    if (Date.now() - lastLeaseAt <= LEASE_EXPIRE_MS) return false;
    clearInterval(checkpointTimer);
    playSession = null;
    window.LVGPlaySession = null;
    await startSession();
    return true;
  }

  async function checkpoint() {
    if (!gameplayRequested || !playSession || ending || document.hidden) return;
    if (await restartExpiredLease()) return;
    try {
      const response = await fetch(`${API}/api/store/play-sessions/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playSession.sessionId, clientToken: playSession.clientToken })
      });
      if (response.ok) {
        lastLeaseAt = Date.now();
        return;
      }
      if (response.status === 404 || response.status === 410) {
        clearInterval(checkpointTimer);
        playSession = null;
        window.LVGPlaySession = null;
        scheduleRetry();
      }
    } catch {}
  }

  async function endSession({ returnToStore = false, beacon = false } = {}) {
    clearTimeout(retryTimer);
    gameplayRequested = false;

    if (!playSession || ending) {
      if (returnToStore) location.href = `./game.html?id=${encodeURIComponent(gameSlug)}`;
      return;
    }

    ending = true;
    clearInterval(checkpointTimer);
    const body = { sessionId: playSession.sessionId, clientToken: playSession.clientToken };
    const finished = playSession;
    playSession = null;
    window.LVGPlaySession = null;

    if (beacon && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(body)], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon(`${API}/api/store/play-sessions/end-beacon`, blob);
      } catch {}
    } else {
      try {
        const response = await fetch(`${API}/api/store/play-sessions/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true
        });
        const payload = await response.json().catch(() => null);
        window.dispatchEvent(new CustomEvent("lvg:play-session-ended", { detail: payload?.data || finished }));
      } catch {}
    }

    ending = false;
    if (returnToStore) location.href = `./game.html?id=${encodeURIComponent(gameSlug)}`;
  }

  function gameplayStart() {
    gameplayRequested = true;
    startSession();
  }

  window.LVGPlayTracker = {
    start: gameplayStart,
    end: () => endSession(),
    returnToStore: () => endSession({ returnToStore: true }),
    checkpoint
  };

  window.addEventListener("message", event => {
    const iframe = document.querySelector(".play-shell iframe");
    if (!iframe || event.source !== iframe.contentWindow) return;
    const type = event.data?.type;
    if (type === "LVG_GAMEPLAY_START") gameplayStart();
    if (type === "LVG_GAMEPLAY_END") endSession();
    if (type === "LVG_RETURN_TO_STORE") endSession({ returnToStore: true });
  });

  window.addEventListener("pagehide", () => endSession({ beacon: true }));
  window.addEventListener("beforeunload", () => endSession({ beacon: true }));
  window.addEventListener("lvg:session-hydrated", () => { if (gameplayRequested) startSession(); });
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || !gameplayRequested) return;
    if (!playSession) await startSession();
    else await restartExpiredLease();
  });
})();
