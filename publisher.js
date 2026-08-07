(() => {
  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const byId = id => document.getElementById(id);
  const readSession = () => {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem("lacvietgamesStoreSession");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  };
  const escapeHtml = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  async function api(path, options = {}) {
    const session = readSession();
    if (!session?.token) throw Object.assign(new Error("Bạn cần đăng nhập."), { code: "AUTH_REQUIRED" });

    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      throw Object.assign(new Error(payload?.message || "Không thể xử lý yêu cầu."), {
        code: payload?.code,
        status: response.status
      });
    }
    return payload;
  }

  function setStatus(message, error = false) {
    const el = byId("publisherStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  function syncType(resetRequirements = true) {
    const web = byId("gameType").value === "web";
    byId("playUrlLabel").hidden = !web;
    byId("downloadUrlLabel").hidden = web;

    if (!resetRequirements) return;
    byId("reqOs").value = web ? "Trình duyệt hiện đại" : "Windows 10";
    byId("reqCpu").value = web ? "Bất kỳ" : "Intel i5 hoặc tương đương";
    byId("reqRam").value = web ? "2 GB" : "8 GB";
    byId("reqGpu").value = web ? "WebGL" : "GTX 1050 hoặc tương đương";
    byId("reqStorage").value = web ? "Không cần cài đặt" : "2 GB";
  }

  async function loadSubmissions() {
    const list = byId("submissionList");
    if (!list) return;
    list.innerHTML = '<div class="portal-empty">Đang tải...</div>';

    try {
      const result = await api("/api/store/publisher/games");
      const items = Array.isArray(result.data) ? result.data : [];
      list.innerHTML = items.length ? items.map(game => `
        <article class="submission-item">
          <div class="submission-top">
            <div>
              <h3>${escapeHtml(game.name)}</h3>
              <p>${escapeHtml(game.type)} · ${Number(game.priceCoins || 0).toLocaleString("vi-VN")} LC</p>
            </div>
            <span class="status-chip ${String(game.status).toLowerCase()}">${escapeHtml(game.status)}</span>
          </div>
          <div class="tag-stack">${(game.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>
          ${game.rejectionReason ? `<p style="margin-top:12px;color:#ff9dab">Lý do: ${escapeHtml(game.rejectionReason)}</p>` : ""}
        </article>`).join("") : '<div class="portal-empty">Bạn chưa gửi game nào.</div>';
    } catch (error) {
      list.innerHTML = `<div class="portal-empty" style="color:#ff9dab">${escapeHtml(error.message)}</div>`;
    }
  }

  async function boot() {
    const session = readSession();
    byId("publisherLoginRequired").hidden = !!session?.token;
    byId("publisherContent").hidden = !session?.token;
    if (!session?.token) return;

    if (!byId("publisherName").value) {
      byId("publisherName").value = session.effectiveDisplayName || session.displayName || session.name || "";
    }
    syncType(false);
    await loadSubmissions();
  }

  byId("gameType")?.addEventListener("change", () => syncType(true));
  byId("refreshSubmissions")?.addEventListener("click", loadSubmissions);

  byId("gameSubmissionForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    // Giữ reference trước await. event.currentTarget có thể trở thành null sau khi
    // event handler nhường quyền điều khiển cho event loop.
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || "Gửi game để Admin duyệt";

    if (submitButton?.disabled) return;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Đang gửi game...";
    }
    setStatus("Đang gửi game lên server...");

    const type = byId("gameType").value;
    const payload = {
      name: byId("gameName").value.trim(),
      publisherName: byId("publisherName").value.trim(),
      type,
      priceCoins: Number(byId("priceCoins").value || 0),
      shortDescription: byId("shortDescription").value.trim(),
      description: byId("description").value.trim(),
      coverUrl: byId("coverUrl").value.trim(),
      icon: byId("gameIcon").value.trim() || "🎮",
      badge: byId("badge").value.trim(),
      theme: byId("theme").value.trim() || "default",
      playUrl: type === "web" ? byId("playUrl").value.trim() : "",
      downloadUrl: type === "download" ? byId("downloadUrl").value.trim() : "",
      releaseDate: byId("releaseDate").value || null,
      tags: byId("tags").value.split(",").map(v => v.trim()).filter(Boolean),
      recommendedOs: byId("reqOs").value.trim(),
      recommendedCpu: byId("reqCpu").value.trim(),
      recommendedRam: byId("reqRam").value.trim(),
      recommendedGpu: byId("reqGpu").value.trim(),
      recommendedStorage: byId("reqStorage").value.trim()
    };

    try {
      const result = await api("/api/store/publisher/games", { method: "POST", body: payload });
      setStatus(result.message || "Đã gửi game để Admin duyệt.");

      form.reset();
      const session = readSession();
      byId("publisherName").value = session?.effectiveDisplayName || session?.displayName || session?.name || "";
      byId("gameType").value = "web";
      syncType(true);

      await loadSubmissions();
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });

  window.addEventListener("storage", boot);
  window.addEventListener("lvg:session-hydrated", () => {
    if (readSession()?.token) boot();
  });

  setTimeout(boot, 0);
})();
