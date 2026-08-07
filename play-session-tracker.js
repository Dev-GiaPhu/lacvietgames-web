(() => {
  if (document.body.dataset.page !== "play") return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const gameSlug = new URLSearchParams(location.search).get("id") || "";
  let playSession = null;
  let checkpointTimer = null;
  let ending = false;
  let starting = false;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try { const raw = storage.getItem("lacvietgamesStoreSession"); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }

  async function startSession() {
    if (starting || playSession || !gameSlug) return;
    const account = readSession();
    if (!account?.token) return;
    starting = true;
    try {
      const response = await fetch(`${API}/api/store/play-sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${account.token}` },
        body: JSON.stringify({ gameSlug })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.sessionId || !payload?.data?.clientToken) return;
      playSession = payload.data;
      ending = false;
      window.LVGPlaySession = playSession;
      scheduleCheckpoint(Number(playSession.checkpointSeconds || 120));
      window.dispatchEvent(new CustomEvent("lvg:play-session-started", { detail: playSession }));
    } catch (error) {
      console.warn("LacVietGames play session start failed", error);
    } finally { starting = false; }
  }

  function scheduleCheckpoint(seconds) {
    clearInterval(checkpointTimer);
    const interval = Math.max(60, Math.min(240, Number(seconds || 120))) * 1000;
    checkpointTimer = setInterval(checkpoint, interval);
  }

  async function checkpoint() {
    if (!playSession || ending || document.hidden) return;
    try {
      const response = await fetch(`${API}/api/store/play-sessions/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playSession.sessionId, clientToken: playSession.clientToken })
      });
      if (response.status === 404 || response.status === 410) {
        playSession = null;
        window.LVGPlaySession = null;
        await startSession();
      }
    } catch {}
  }

  async function endSession({ returnToStore = false, beacon = false } = {}) {
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
        const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
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

  window.addEventListener("message", event => {
    const iframe = document.querySelector(".play-shell iframe");
    if (!iframe || event.source !== iframe.contentWindow) return;
    const type = event.data?.type;
    if (type === "LVG_GAMEPLAY_START") startSession();
    if (type === "LVG_GAMEPLAY_END") endSession();
    if (type === "LVG_RETURN_TO_STORE") endSession({ returnToStore: true });
  });

  window.addEventListener("pagehide", () => endSession({ beacon: true }));
  window.addEventListener("beforeunload", () => endSession({ beacon: true }));
  window.addEventListener("lvg:session-hydrated", startSession);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !playSession) startSession(); });

  startSession();
})();
