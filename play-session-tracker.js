(() => {
  if (document.body.dataset.page !== "play") return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const COOKIE_SENTINEL = window.LVGSession?.cookieSentinel || "cookie.session";
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
    try { const raw = sessionStorage.getItem("lacvietgamesStoreSession"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function authHeaders() {
    const account = readSession();
    const headers = { "Content-Type":"application/json", "Accept":"application/json" };
    if (account?.token && account.token !== COOKIE_SENTINEL) headers.Authorization = `Bearer ${account.token}`;
    return headers;
  }
  async function platformFetch(path, { method="POST", body, keepalive=false } = {}) {
    const response = await fetch(`${API}${path}`, {
      method,
      credentials:"include",
      cache:"no-store",
      keepalive,
      headers:authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const error = new Error(payload?.message || "Yêu cầu không thành công.");
      error.code = payload?.code || `HTTP_${response.status}`;
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
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
    gate.querySelector("button")?.addEventListener("click", event => {
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
    const timer = setInterval(() => { attempts += 1; if (installStartGate() || attempts >= 80) clearInterval(timer); }, 100);
  }
  function foregroundActive() { return !document.hidden && document.hasFocus(); }
  function publicSession() {
    if (!playSession) return null;
    return Object.freeze({
      sessionId:String(playSession.sessionId || ""),
      checkpointSeconds:Number(playSession.checkpointSeconds || 120),
      startedAt:playSession.startedAt || null
    });
  }
  function scheduleRetry() {
    clearTimeout(retryTimer);
    if (!gameplayRequested || !trustedStartGranted || playSession || starting || !foregroundActive()) return;
    retryTimer = setTimeout(() => startSession(), 4000);
  }

  async function startSession() {
    if (!gameplayRequested || !trustedStartGranted || starting || playSession || !gameSlug || !foregroundActive()) return;
    if (!readSession()?.token) { scheduleRetry(); return; }
    starting = true;
    try {
      const payload = await platformFetch("/api/store/play-sessions/start", { body:{ gameSlug } });
      if (!payload?.data?.sessionId || !payload?.data?.clientToken) { scheduleRetry(); return; }
      playSession = payload.data;
      ending = false;
      lastLeaseAt = Date.now();
      scheduleCheckpoint(Number(playSession.checkpointSeconds || 120));
      window.dispatchEvent(new CustomEvent("lvg:play-session-started", { detail:publicSession() }));
    } catch { scheduleRetry(); }
    finally { starting = false; }
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
    clearInterval(checkpointTimer); playSession = null; await startSession(); return true;
  }
  async function checkpoint() {
    if (!gameplayRequested || !trustedStartGranted || !playSession || ending || !foregroundActive()) return;
    if (await restartExpiredLease()) return;
    try {
      await platformFetch("/api/store/play-sessions/checkpoint", { body:{ sessionId:playSession.sessionId, clientToken:playSession.clientToken } });
      lastLeaseAt = Date.now();
    } catch (error) {
      if (error.status === 404 || error.status === 410) { clearInterval(checkpointTimer); playSession = null; scheduleRetry(); }
    }
  }
  async function endSession({ returnToStore=false, beacon=false, preserveIntent=false } = {}) {
    clearTimeout(retryTimer);
    if (!preserveIntent) gameplayRequested = false;
    if (!playSession || ending) { if (returnToStore) location.href=`./game.html?id=${encodeURIComponent(gameSlug)}`; return; }
    ending = true; clearInterval(checkpointTimer);
    const body = { sessionId:playSession.sessionId, clientToken:playSession.clientToken };
    const finished = publicSession();
    playSession = null;
    if (beacon && navigator.sendBeacon) {
      try { navigator.sendBeacon(`${API}/api/store/play-sessions/end-beacon`, new Blob([JSON.stringify(body)], {type:"text/plain;charset=UTF-8"})); } catch {}
    } else {
      try {
        const payload = await platformFetch("/api/store/play-sessions/end", { body, keepalive:true });
        window.dispatchEvent(new CustomEvent("lvg:play-session-ended", { detail:payload?.data || finished }));
      } catch {}
    }
    ending = false;
    if (returnToStore) location.href=`./game.html?id=${encodeURIComponent(gameSlug)}`;
  }

  async function brokerPerform(operation, args={}) {
    if (!playSession?.sessionId || !playSession?.clientToken) {
      const e=new Error("Chưa có phiên chơi."); e.code="PLAY_SESSION_REQUIRED"; e.status=409; throw e;
    }
    const credentials = { sessionId:playSession.sessionId, clientToken:playSession.clientToken };
    switch (operation) {
      case "identity":
        return platformFetch("/api/store/game-sdk/identity-token", { body:{...credentials,integrationId:String(args.integrationId||"")} });
      case "reward":
        return platformFetch("/api/store/game-sdk/rewards/claim", { body:{...credentials,eventKey:String(args.eventKey||""),requestId:String(args.requestId||"")} });
      case "playtimeReward":
        return platformFetch("/api/store/game-sdk/rewards/claim-playtime", { body:credentials });
      case "dataSubmit": {
        const path=String(args.path||"");
        if (!/^(stats|leaderboards)\/[a-z0-9._-]+\/submit$/i.test(path)) { const e=new Error("Data operation không hợp lệ.");e.code="SDK_OPERATION_DENIED";e.status=403;throw e; }
        const query=String(args.query||"");
        return platformFetch(`/api/store/game-sdk/data/${path}${query?`?${query}`:""}`, { body:{...(args.body||{}),...credentials} });
      }
      default: { const e=new Error("SDK operation không được phép.");e.code="SDK_OPERATION_DENIED";e.status=403;throw e; }
    }
  }

  function gameplayStart() { gameplayRequested = true; if (trustedStartGranted) startSession(); }
  function pauseForeground() { if (playSession) endSession({preserveIntent:true}); }
  window.LVGPlayTracker = Object.freeze({ start:gameplayStart, end:()=>endSession(), returnToStore:()=>endSession({returnToStore:true}) });
  window.LVGPlaySessionBroker = Object.freeze({ isActive:()=>!!playSession, publicSession, perform:brokerPerform });

  window.addEventListener("message", event => {
    if (!validFrameMessage(event)) return;
    const type=event.data?.type;
    if (type === "LVG_GAMEPLAY_START") gameplayStart();
    if (type === "LVG_GAMEPLAY_END") endSession();
    if (type === "LVG_RETURN_TO_STORE") endSession({returnToStore:true});
  });
  window.addEventListener("blur",()=>{clearTimeout(focusTimer);focusTimer=setTimeout(()=>{if(!document.hasFocus())pauseForeground()},FOCUS_GRACE_MS)});
  window.addEventListener("focus",()=>{clearTimeout(focusTimer);if(gameplayRequested&&trustedStartGranted)startSession()});
  window.addEventListener("pagehide",()=>endSession({beacon:true}));
  window.addEventListener("beforeunload",()=>endSession({beacon:true}));
  window.addEventListener("lvg:session-hydrated",()=>{if(gameplayRequested&&trustedStartGranted)startSession()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseForeground();else if(gameplayRequested&&trustedStartGranted)startSession()});
  ensureStartGate();
})();
