(() => {
  if (document.body.dataset.page !== "play") return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const gameSlug = new URLSearchParams(location.search).get("id") || "";
  const LEASE_EXPIRE_MS = 5 * 60 * 1000;
  const FOCUS_GRACE_MS = 15 * 1000;

  let playSession = null;
  let checkpointTimer = null;
  let ending = false;
  let starting = false;
  let gameplayRequested = false;
  let trustedStartGranted = false;
  let lastLeaseAt = 0;
  let retryTimer = null;
  let focusTimer = null;
  let gateInstalled = false;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try { const raw = storage.getItem("lacvietgamesStoreSession"); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  }

  function iframe() { return document.querySelector(".play-shell iframe"); }
  function iframeOrigin() {
    const frame = iframe();
    if (!frame?.src) return null;
    try { return new URL(frame.src, location.href).origin; } catch { return null; }
  }
  function validFrameMessage(event) {
    const frame = iframe();
    const origin = iframeOrigin();
    return !!frame && !!origin && event.source === frame.contentWindow && event.origin === origin;
  }

  function installStartGate() {
    if (gateInstalled) return true;
    const frame = iframe();
    if (!frame?.parentElement) return false;
    const host = frame.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    const gate = document.createElement("div");
    gate.id = "lvgTrustedPlayGate";
    gate.style.cssText = "position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:linear-gradient(135deg,rgba(18,5,7,.94),rgba(5,5,8,.9));backdrop-filter:blur(5px);";
    gate.innerHTML = '<button type="button" style="border:1px solid rgba(233,190,92,.65);background:linear-gradient(135deg,#b51624,#741019);color:#fff5d7;border-radius:14px;padding:14px 24px;font:700 15px/1.2 inherit;cursor:pointer;box-shadow:0 12px 34px rgba(181,22,36,.28)">Bắt đầu chơi</button>';
    const button = gate.querySelector("button");
    button?.addEventListener("click", event => {
      if (!event.isTrusted) return;
      trustedStartGranted = true;
      gate.remove();
      if (gameplayRequested) startSession();
    });
    host.appendChild(gate);
    gateInstalled = true;
    return true;
  }

  function ensureStartGate() {
    if (installStartGate()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installStartGate() || attempts >= 80) clearInterval(timer);
    }, 100);
  }

  function foregroundActive() {
    return !document.hidden && document.hasFocus();
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    if (!gameplayRequested || !trustedStartGranted || playSession || starting || !foregroundActive()) return;
    retryTimer = setTimeout(() => startSession(), 4000);
  }

  async function startSession() {
    if (!gameplayRequested || !trustedStartGranted || starting || playSession || !gameSlug || !foregroundActive()) return;
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
    } catch {
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
    if (!gameplayRequested || !trustedStartGranted || !foregroundActive()) return false;
    if (!playSession) { await startSession(); return true; }
    if (Date.now() - lastLeaseAt <= LEASE_EXPIRE_MS) return false;
    clearInterval(checkpointTimer);
    playSession = null;
    window.LVGPlaySession = null;
    await startSession();
    return true;
  }

  async function checkpoint() {
    if (!gameplayRequested || !trustedStartGranted || !playSession || ending || !foregroundActive()) return;
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

  async function endSession({ returnToStore = false, beacon = false, preserveIntent = false } = {}) {
    clearTimeout(retryTimer);
    if (!preserveIntent) gameplayRequested = false;

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
    if (trustedStartGranted) startSession();
  }

  function pauseForeground() {
    if (!playSession) return;
    endSession({ preserveIntent: true });
  }

  window.LVGPlayTracker = {
    start: gameplayStart,
    end: () => endSession(),
    returnToStore: () => endSession({ returnToStore: true }),
    checkpoint
  };

  window.addEventListener("message", event => {
    if (!validFrameMessage(event)) return;
    const type = event.data?.type;
    if (type === "LVG_GAMEPLAY_START") gameplayStart();
    if (type === "LVG_GAMEPLAY_END") endSession();
    if (type === "LVG_RETURN_TO_STORE") endSession({ returnToStore: true });
  });

  window.addEventListener("blur", () => {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => { if (!document.hasFocus()) pauseForeground(); }, FOCUS_GRACE_MS);
  });
  window.addEventListener("focus", () => {
    clearTimeout(focusTimer);
    if (gameplayRequested && trustedStartGranted) startSession();
  });
  window.addEventListener("pagehide", () => endSession({ beacon: true }));
  window.addEventListener("beforeunload", () => endSession({ beacon: true }));
  window.addEventListener("lvg:session-hydrated", () => { if (gameplayRequested && trustedStartGranted) startSession(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseForeground();
    else if (gameplayRequested && trustedStartGranted) startSession();
  });

  ensureStartGate();
})();
