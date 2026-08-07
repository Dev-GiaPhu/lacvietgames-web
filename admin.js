(() => {
  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const byId = id => document.getElementById(id);
  const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  const fmt = n => Number(n || 0).toLocaleString("vi-VN");
  const money = n => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

  let activeTab = "pending";
  let games = [];
  let users = [];
  let coinPackages = [];

  const readSession = () => {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const s of [localStorage, sessionStorage]) {
      try { const raw = s.getItem("lacvietgamesStoreSession"); if (raw) return JSON.parse(raw); } catch {}
    }
    return null;
  };

  async function api(path, options = {}) {
    const session = readSession();
    if (!session?.token) throw Object.assign(new Error("Bạn cần đăng nhập."), { code: "AUTH_REQUIRED" });
    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) throw Object.assign(new Error(payload?.message || "Không thể xử lý yêu cầu."), { code: payload?.code, status: response.status });
    return payload;
  }

  function status(message = "", error = false) {
    const el = byId("adminStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  async function boot() {
    try {
      const me = await api("/api/store/me");
      if (String(me.data.role).toLowerCase() !== "admin") throw new Error("Tài khoản hiện tại không có quyền Admin.");
      byId("adminDenied").hidden = true;
      byId("adminContent").hidden = false;
      await loadGames(true);
    } catch (error) {
      byId("adminContent").hidden = true;
      byId("adminDenied").hidden = false;
      byId("adminDeniedText").textContent = error.message;
    }
  }

  async function loadGames(pendingOnly = activeTab === "pending") {
    byId("adminGameList").innerHTML = '<div class="portal-empty">Đang tải...</div>';
    try {
      const result = await api(`/api/store/admin/games${pendingOnly ? "?status=Pending" : ""}`);
      games = result.data || [];
      renderGames();
    } catch (error) {
      byId("adminGameList").innerHTML = `<div class="portal-empty" style="color:#ff9dab">${esc(error.message)}</div>`;
    }
  }

  function renderGames() {
    byId("adminGameList").innerHTML = games.length ? games.map(g => `
      <article class="admin-item">
        <div class="admin-top"><div><h3>${esc(g.icon || "🎮")} ${esc(g.name)}</h3><p>${esc(g.publisherName)} · ${esc(g.type)} · ${fmt(g.priceCoins)} LC</p></div><span class="status-chip ${String(g.status).toLowerCase()}">${esc(g.status)}</span></div>
        <div class="tag-stack">${(g.tags || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
        <p style="margin-top:10px">${esc(g.shortDescription || "")}</p>
        ${g.rejectionReason ? `<p style="margin-top:8px;color:#ff9dab">${esc(g.rejectionReason)}</p>` : ""}
        <div class="admin-actions"><button class="mini-btn primary" data-approve="${g.id}">Duyệt</button><button class="mini-btn danger" data-reject="${g.id}">Từ chối</button><button class="mini-btn" data-edit-game="${g.id}">Sửa thông tin</button></div>
      </article>`).join("") : '<div class="portal-empty">Không có game phù hợp.</div>';
  }

  async function approve(id) { try { status("Đang duyệt game..."); const r = await api(`/api/store/admin/games/${id}/approve`, { method:"POST" }); status(r.message); await loadGames(); } catch (e) { status(e.message, true); } }
  async function reject(id) { const reason = prompt("Lý do từ chối game:", "Cần chỉnh sửa thông tin trước khi xuất bản."); if (reason === null) return; try { status("Đang cập nhật..."); const r = await api(`/api/store/admin/games/${id}/reject`, { method:"POST", body:{ reason } }); status(r.message); await loadGames(); } catch (e) { status(e.message, true); } }

  function openEdit(id) {
    const g = games.find(x => Number(x.id) === Number(id)); if (!g) return;
    byId("editGameId").value = g.id; byId("editName").value = g.name || ""; byId("editSlug").value = g.slug || ""; byId("editType").value = g.type || "web"; byId("editPrice").value = g.priceCoins || 0; byId("editStatus").value = g.status || "Pending"; byId("editPublisher").value = g.publisherName || ""; byId("editShort").value = g.shortDescription || ""; byId("editDescription").value = g.description || ""; byId("editTags").value = (g.tags || []).join(", "); byId("editCover").value = g.coverUrl || ""; byId("editPlay").value = g.playUrl || ""; byId("editDownload").value = g.downloadUrl || ""; byId("editOs").value = g.requirements?.os || ""; byId("editCpu").value = g.requirements?.cpu || ""; byId("editRam").value = g.requirements?.ram || ""; byId("editGpu").value = g.requirements?.gpu || ""; byId("editStorage").value = g.requirements?.storage || ""; byId("editRejectReason").value = g.rejectionReason || "";
    byId("adminEditModal").hidden = false; document.body.style.overflow = "hidden";
  }
  function closeEdit() { byId("adminEditModal").hidden = true; document.body.style.overflow = ""; }
  async function saveEdit(event) {
    event.preventDefault(); const id = Number(byId("editGameId").value); const original = games.find(g => Number(g.id) === id);
    const payload = { name:byId("editName").value.trim(), slug:byId("editSlug").value.trim(), publisherName:byId("editPublisher").value.trim(), type:byId("editType").value, priceCoins:Number(byId("editPrice").value || 0), shortDescription:byId("editShort").value.trim(), description:byId("editDescription").value.trim(), tags:byId("editTags").value.split(",").map(v => v.trim()).filter(Boolean), coverUrl:byId("editCover").value.trim(), playUrl:byId("editPlay").value.trim(), downloadUrl:byId("editDownload").value.trim(), icon:original?.icon || "🎮", badge:original?.badge || "", theme:original?.theme || "default", releaseDate:original?.releaseDate || null, recommendedOs:byId("editOs").value.trim(), recommendedCpu:byId("editCpu").value.trim(), recommendedRam:byId("editRam").value.trim(), recommendedGpu:byId("editGpu").value.trim(), recommendedStorage:byId("editStorage").value.trim(), status:byId("editStatus").value, rejectionReason:byId("editRejectReason").value.trim() };
    try { const r = await api(`/api/store/admin/games/${id}`, { method:"PUT", body:payload }); status(r.message); closeEdit(); await loadGames(false); } catch (e) { status(e.message, true); }
  }

  async function loadUsers() { byId("adminUserList").innerHTML = '<div class="portal-empty">Đang tải...</div>'; try { const r = await api("/api/store/admin/users"); users = r.data || []; renderUsers(); } catch (e) { byId("adminUserList").innerHTML = `<div class="portal-empty" style="color:#ff9dab">${esc(e.message)}</div>`; } }
  function renderUsers() { const q = byId("userSearch").value.trim().toLowerCase(); const filtered = users.filter(u => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)); byId("adminUserList").innerHTML = filtered.length ? filtered.map(u => `<article class="admin-item user-row" data-user-row="${u.id}"><input data-user-name value="${esc(u.name)}"><div><b>${esc(u.email)}</b><small style="display:block;color:#7f8da7">${u.isEmailVerified ? "Đã xác minh" : "Chưa xác minh"}</small></div><select data-user-role><option ${u.role === "User" ? "selected" : ""}>User</option><option ${u.role === "Admin" ? "selected" : ""}>Admin</option></select><b>🪙 ${fmt(u.coinBalance)}</b><div class="admin-actions" style="margin:0"><button class="mini-btn primary" data-save-user="${u.id}">Lưu</button><button class="mini-btn" data-adjust-coin="${u.id}">± Coin</button></div></article>`).join("") : '<div class="portal-empty">Không tìm thấy người dùng.</div>'; }
  async function saveUser(id) { const row = document.querySelector(`[data-user-row="${id}"]`); try { const r = await api(`/api/store/admin/users/${id}`, { method:"PUT", body:{ name:row.querySelector("[data-user-name]").value.trim(), role:row.querySelector("[data-user-role]").value } }); status(r.message); await loadUsers(); } catch (e) { status(e.message, true); } }
  async function adjustCoin(id) { const text = prompt("Nhập số coin cần cộng hoặc trừ. Ví dụ 500 hoặc -200:", "500"); if (text === null) return; const amount = Number(text); if (!Number.isInteger(amount) || amount === 0) return alert("Số coin không hợp lệ."); const reason = prompt("Lý do điều chỉnh:", "Hỗ trợ người dùng") || "Điều chỉnh bởi Admin"; try { const r = await api(`/api/store/admin/users/${id}/coins`, { method:"POST", body:{ amount, reason } }); status(r.message); await loadUsers(); } catch (e) { status(e.message, true); } }

  async function loadCoinPackages() {
    const list = byId("coinPackageList"); list.innerHTML = '<div class="portal-empty">Đang tải...</div>';
    try { const r = await api("/api/store/admin/coin-packages"); coinPackages = r.data || []; renderCoinPackages(); }
    catch (e) { list.innerHTML = `<div class="portal-empty" style="color:#ff9dab">${esc(e.message)}</div>`; }
  }

  function renderCoinPackages() {
    const list = byId("coinPackageList");
    list.innerHTML = coinPackages.length ? coinPackages.map(p => `
      <article class="coin-package-row ${p.isActive ? "" : "inactive"}" data-coin-package-row="${p.id}">
        <div><strong>${esc(p.name)}</strong><small>ID #${p.id}</small></div>
        <div><span class="coin-package-value">${fmt(p.coinAmount)} LC</span><small>Coin chính</small></div>
        <div><span class="coin-package-bonus">+${fmt(p.bonusCoin)} LC</span><small>Tổng nhận ${fmt(p.totalCoin)} LC</small></div>
        <div><span class="coin-package-value">${money(p.priceVnd)}</span><small>Giá bán</small></div>
        <div><span class="coin-package-state ${p.isActive ? "" : "off"}">${p.isActive ? "Đang bán" : "Đã ẩn"}</span><small>Thứ tự ${p.sortOrder}</small></div>
        <div class="coin-package-actions"><button class="mini-btn" data-edit-coin-package="${p.id}">Sửa</button><button class="mini-btn ${p.isActive ? "danger" : "primary"}" data-toggle-coin-package="${p.id}">${p.isActive ? "Ẩn" : "Hiện"}</button></div>
      </article>`).join("") : '<div class="portal-empty">Chưa có gói Lạc Coin.</div>';
  }

  function openCoinPackageModal(id = null) {
    const p = id == null ? null : coinPackages.find(x => Number(x.id) === Number(id));
    byId("coinPackageModalTitle").textContent = p ? "Chỉnh sửa gói Lạc Coin" : "Thêm gói Lạc Coin";
    byId("coinPackageId").value = p?.id || "";
    byId("coinPackageName").value = p?.name || "";
    byId("coinPackageAmount").value = p?.coinAmount ?? "";
    byId("coinPackagePrice").value = p?.priceVnd ?? "";
    byId("coinPackageBonus").value = p?.bonusCoin ?? 0;
    byId("coinPackageSort").value = p?.sortOrder ?? (coinPackages.length ? Math.max(...coinPackages.map(x => Number(x.sortOrder || 0))) + 10 : 10);
    byId("coinPackageActive").checked = p?.isActive ?? true;
    byId("coinPackageModal").hidden = false; document.body.style.overflow = "hidden";
  }
  function closeCoinPackageModal() { byId("coinPackageModal").hidden = true; document.body.style.overflow = ""; }

  async function saveCoinPackage(event) {
    event.preventDefault();
    const id = Number(byId("coinPackageId").value || 0);
    const payload = { name:byId("coinPackageName").value.trim(), coinAmount:Number(byId("coinPackageAmount").value), priceVnd:Number(byId("coinPackagePrice").value), bonusCoin:Number(byId("coinPackageBonus").value || 0), isActive:byId("coinPackageActive").checked, sortOrder:Number(byId("coinPackageSort").value || 0) };
    const btn = event.currentTarget.querySelector('button[type="submit"]'); const old = btn.textContent; btn.disabled = true; btn.textContent = "Đang lưu...";
    try { const r = await api(id ? `/api/store/admin/coin-packages/${id}` : "/api/store/admin/coin-packages", { method:id ? "PUT" : "POST", body:payload }); status(r.message); closeCoinPackageModal(); await loadCoinPackages(); }
    catch (e) { status(e.message, true); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  async function toggleCoinPackage(id) {
    try { const r = await api(`/api/store/admin/coin-packages/${id}/toggle`, { method:"POST" }); status(r.message); await loadCoinPackages(); }
    catch (e) { status(e.message, true); }
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.toggle("active", b.dataset.adminTab === tab));
    byId("adminGamesPanel").hidden = !["pending", "all"].includes(tab);
    byId("adminUsersPanel").hidden = tab !== "users";
    byId("adminCoinPackagesPanel").hidden = tab !== "coin-packages";
    status("");
    if (tab === "users") loadUsers();
    else if (tab === "coin-packages") loadCoinPackages();
    else loadGames(tab === "pending");
  }

  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-admin-tab]"); if (tab) return switchTab(tab.dataset.adminTab);
    const approveId = event.target.closest("[data-approve]")?.dataset.approve; if (approveId) return approve(approveId);
    const rejectId = event.target.closest("[data-reject]")?.dataset.reject; if (rejectId) return reject(rejectId);
    const editGameId = event.target.closest("[data-edit-game]")?.dataset.editGame; if (editGameId) return openEdit(editGameId);
    const saveId = event.target.closest("[data-save-user]")?.dataset.saveUser; if (saveId) return saveUser(saveId);
    const coinId = event.target.closest("[data-adjust-coin]")?.dataset.adjustCoin; if (coinId) return adjustCoin(coinId);
    const editPackageId = event.target.closest("[data-edit-coin-package]")?.dataset.editCoinPackage; if (editPackageId) return openCoinPackageModal(editPackageId);
    const togglePackageId = event.target.closest("[data-toggle-coin-package]")?.dataset.toggleCoinPackage; if (togglePackageId) return toggleCoinPackage(togglePackageId);
  });

  byId("refreshAdmin")?.addEventListener("click", () => loadGames(activeTab === "pending"));
  byId("userSearch")?.addEventListener("input", renderUsers);
  byId("closeAdminEdit")?.addEventListener("click", closeEdit);
  byId("adminGameForm")?.addEventListener("submit", saveEdit);
  byId("adminEditModal")?.addEventListener("click", e => { if (e.target === byId("adminEditModal")) closeEdit(); });
  byId("refreshCoinPackages")?.addEventListener("click", loadCoinPackages);
  byId("addCoinPackage")?.addEventListener("click", () => openCoinPackageModal());
  byId("closeCoinPackageModal")?.addEventListener("click", closeCoinPackageModal);
  byId("coinPackageForm")?.addEventListener("submit", saveCoinPackage);
  byId("coinPackageModal")?.addEventListener("click", e => { if (e.target === byId("coinPackageModal")) closeCoinPackageModal(); });

  setTimeout(boot, 0);
})();
