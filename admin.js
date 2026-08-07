(() => {
  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const STORE_KEY = "lacvietgamesStoreSession";
  const byId = id => document.getElementById(id);
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  const fmt = value => Number(value || 0).toLocaleString("vi-VN");
  const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  const when = value => value ? new Date(value).toLocaleString("vi-VN") : "—";

  let currentAdmin = null;
  let activeSection = "dashboard";
  let games = [];
  let users = [];
  let coinPackages = [];
  let transactions = [];

  function readSession() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const raw = storage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function clearSession() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        storage.removeItem(STORE_KEY);
        storage.removeItem("lacvietgamesSession");
      } catch {}
    }
  }

  function saveAdminSession(result) {
    const account = result?.data?.account;
    if (!account || String(account.role).toLowerCase() !== "admin") return false;
    clearSession();
    sessionStorage.setItem(STORE_KEY, JSON.stringify({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      coinBalance: account.coinBalance,
      verified: account.isEmailVerified,
      token: result.data.token,
      loginAt: new Date().toISOString()
    }));
    return true;
  }

  async function request(path, options = {}, auth = true) {
    const session = readSession();
    if (auth && !session?.token) throw Object.assign(new Error("Bạn chưa đăng nhập Admin."), { status:401 });
    const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
    if (auth) headers.Authorization = `Bearer ${session.token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        const error = new Error(payload?.message || "Không thể xử lý yêu cầu.");
        error.status = response.status;
        error.code = payload?.code;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Server phản hồi chậm. Vui lòng thử lại.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function gateMessage(message = "", success = false) {
    const el = byId("adminGateStatus");
    el.textContent = message;
    el.classList.toggle("success", success);
  }

  function status(message = "", error = false) {
    const el = byId("adminStatus");
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  function showGate(message = "") {
    currentAdmin = null;
    byId("adminShell").hidden = true;
    byId("adminGate").hidden = false;
    gateMessage(message);
  }

  function showShell(account) {
    currentAdmin = account;
    byId("adminGate").hidden = true;
    byId("adminShell").hidden = false;
    const name = account.effectiveDisplayName || account.displayName || account.name || "Admin";
    byId("adminIdentity").textContent = `${name} · ${account.email || ""}`;
    byId("adminAvatar").textContent = name.charAt(0).toUpperCase();
  }

  async function boot() {
    const session = readSession();
    if (!session?.token) return showGate();
    try {
      const me = await request("/api/store/me");
      if (String(me.data?.role).toLowerCase() !== "admin") {
        return showGate(`Tài khoản ${me.data?.email || "hiện tại"} không có quyền Admin.`);
      }
      showShell(me.data);
      await loadDashboard();
    } catch (error) {
      if (error.status === 401 || error.status === 403) clearSession();
      showGate(error.status === 403 ? "Tài khoản hiện tại không có quyền Admin." : "Phiên Admin không còn hợp lệ. Vui lòng đăng nhập lại.");
    }
  }

  async function loginAdmin(event) {
    event.preventDefault();
    gateMessage("");
    const button = byId("adminLoginButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Đang xác minh...";
    try {
      const result = await request("/api/store/auth/login", {
        method:"POST",
        body:{
          email:byId("adminLoginEmail").value.trim().toLowerCase(),
          password:byId("adminLoginPassword").value
        }
      }, false);
      if (String(result.data?.account?.role).toLowerCase() !== "admin") {
        throw new Error("Tài khoản này đăng nhập được nhưng không có quyền Admin.");
      }
      saveAdminSession(result);
      const me = await request("/api/store/me");
      if (String(me.data?.role).toLowerCase() !== "admin") throw new Error("Server không xác nhận quyền Admin.");
      showShell(me.data);
      byId("adminLoginPassword").value = "";
      await loadDashboard();
    } catch (error) {
      gateMessage(error.message || "Đăng nhập Admin thất bại.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function logoutAdmin() {
    clearSession();
    showGate("Đã đăng xuất khỏi Admin Center.");
  }

  function switchSection(section) {
    activeSection = section;
    document.querySelectorAll("[data-admin-section]").forEach(button => button.classList.toggle("active", button.dataset.adminSection === section));
    document.querySelectorAll("[data-section-panel]").forEach(panel => panel.hidden = panel.dataset.sectionPanel !== section);
    const titles = { dashboard:"Tổng quan hệ thống", pending:"Game chờ duyệt", games:"Tất cả game", users:"Người dùng", "coin-packages":"Gói Lạc Coin", transactions:"Giao dịch hệ thống" };
    byId("adminPageTitle").textContent = titles[section] || "Admin Center";
    status("");
    if (section === "dashboard") loadDashboard();
    if (section === "pending") loadGames(true);
    if (section === "games") loadGames(false);
    if (section === "users") loadUsers();
    if (section === "coin-packages") loadCoinPackages();
    if (section === "transactions") loadTransactions();
  }

  async function loadDashboard() {
    try {
      status("Đang tải Dashboard...");
      const result = await request("/api/store/admin/dashboard");
      const d = result.data || {};
      byId("statUsers").textContent = fmt(d.users?.total);
      byId("statVerifiedUsers").textContent = `${fmt(d.users?.verified)} đã xác minh`;
      byId("statPending").textContent = fmt(d.games?.pending);
      byId("navPendingCount").textContent = fmt(d.games?.pending);
      byId("statPublished").textContent = fmt(d.games?.published);
      byId("statTotalGames").textContent = `${fmt(d.games?.total)} tổng game`;
      byId("statRevenue").textContent = money(d.payments?.revenueVnd);
      byId("statTopups").textContent = `${fmt(d.payments?.completedTopups)} giao dịch nạp`;
      byId("statWalletCoins").textContent = `${fmt(d.wallet?.totalCoinInWallets)} LC`;
      byId("statPackages").textContent = fmt(d.coinPackages?.active);
      renderDashboardSubmissions(d.recentSubmissions || []);
      renderDashboardTransactions(d.recentTransactions || []);
      status("");
    } catch (error) {
      handleAdminError(error, "Không tải được Dashboard.");
    }
  }

  function renderDashboardSubmissions(items) {
    byId("dashboardSubmissions").innerHTML = items.length ? items.map(g => `<div class="admin-row"><div class="admin-row-top"><div><h4>${esc(g.name)}</h4><div class="admin-meta"><span>${esc(g.publisherName)}</span><span>${when(g.createdAt)}</span></div></div><span class="admin-chip ${String(g.status).toLowerCase()}">${esc(g.status)}</span></div></div>`).join("") : '<div class="admin-empty">Chưa có game được gửi.</div>';
  }

  function renderDashboardTransactions(items) {
    byId("dashboardTransactions").innerHTML = items.length ? items.map(t => `<div class="admin-row"><div class="admin-row-top"><div><h4>${esc(t.description || t.type)}</h4><div class="admin-meta"><span>${esc(t.accountName || t.email)}</span><span>${when(t.createdAt)}</span></div></div><strong>${Number(t.coinAmount || 0) >= 0 ? "+" : ""}${fmt(t.coinAmount)} LC</strong></div></div>`).join("") : '<div class="admin-empty">Chưa có giao dịch.</div>';
  }

  async function loadGames(pendingOnly) {
    const target = byId(pendingOnly ? "pendingGameList" : "allGameList");
    target.innerHTML = '<div class="admin-empty">Đang tải dữ liệu game...</div>';
    try {
      const result = await request(`/api/store/admin/games${pendingOnly ? "?status=Pending" : ""}`);
      games = result.data || [];
      renderGames(target, games, pendingOnly);
    } catch (error) {
      handleAdminError(error, "Không tải được danh sách game.", target);
    }
  }

  function renderGames(target, items, pendingOnly) {
    target.innerHTML = items.length ? items.map(g => {
      const tags = (g.tags || []).map(tag => `<span class="admin-chip">${esc(tag)}</span>`).join(" ");
      const urlInfo = [g.playUrl ? `<a href="${esc(g.playUrl)}" target="_blank" rel="noopener">Play URL</a>` : "", g.downloadUrl ? `<a href="${esc(g.downloadUrl)}" target="_blank" rel="noopener">Download URL</a>` : ""].filter(Boolean).join(" · ");
      return `<article class="admin-row"><div class="admin-row-top"><div><h3>${esc(g.icon || "🎮")} ${esc(g.name)}</h3><div class="admin-meta"><span>ID #${g.id}</span><span>${esc(g.publisherName)}</span><span>${esc(g.type)}</span><span>${fmt(g.priceCoins)} LC</span><span>${when(g.createdAt)}</span></div></div><span class="admin-chip ${String(g.status).toLowerCase()}">${esc(g.status)}</span></div><p><b>Mô tả:</b> ${esc(g.shortDescription || g.description || "Chưa có mô tả")}</p><div class="admin-meta">${tags}</div>${urlInfo ? `<p>${urlInfo}</p>` : ""}${g.rejectionReason ? `<p style="color:#ff9bad"><b>Lý do từ chối:</b> ${esc(g.rejectionReason)}</p>` : ""}<div class="admin-row-actions">${g.status !== "Published" ? `<button class="admin-primary" type="button" data-approve="${g.id}">Duyệt & xuất bản</button>` : ""}<button class="admin-secondary" type="button" data-edit-game="${g.id}">Sửa chi tiết</button>${g.status !== "Rejected" ? `<button class="admin-danger-btn" type="button" data-reject="${g.id}">Từ chối</button>` : ""}</div></article>`;
    }).join("") : `<div class="admin-empty">${pendingOnly ? "Không có game đang chờ duyệt." : "Chưa có game."}</div>`;
  }

  async function approveGame(id) {
    try {
      status("Đang duyệt game...");
      const result = await request(`/api/store/admin/games/${id}/approve`, { method:"POST" });
      status(result.message || "Đã duyệt game.");
      await Promise.all([loadDashboard(), loadGames(activeSection === "pending")]);
    } catch (error) { handleAdminError(error, "Không duyệt được game."); }
  }

  async function rejectGame(id) {
    const reason = prompt("Lý do từ chối game:", "Cần chỉnh sửa thông tin trước khi xuất bản.");
    if (reason === null) return;
    try {
      status("Đang từ chối game...");
      const result = await request(`/api/store/admin/games/${id}/reject`, { method:"POST", body:{ reason } });
      status(result.message || "Đã từ chối game.");
      await Promise.all([loadDashboard(), loadGames(activeSection === "pending")]);
    } catch (error) { handleAdminError(error, "Không từ chối được game."); }
  }

  function openGameEdit(id) {
    const g = games.find(item => Number(item.id) === Number(id));
    if (!g) return;
    byId("editGameId").value = g.id;
    byId("editName").value = g.name || "";
    byId("editSlug").value = g.slug || "";
    byId("editType").value = g.type || "web";
    byId("editPrice").value = g.priceCoins || 0;
    byId("editStatus").value = g.status || "Pending";
    byId("editPublisher").value = g.publisherName || "";
    byId("editShort").value = g.shortDescription || "";
    byId("editDescription").value = g.description || "";
    byId("editTags").value = (g.tags || []).join(", ");
    byId("editCover").value = g.coverUrl || "";
    byId("editPlay").value = g.playUrl || "";
    byId("editDownload").value = g.downloadUrl || "";
    byId("editOs").value = g.requirements?.os || "";
    byId("editCpu").value = g.requirements?.cpu || "";
    byId("editRam").value = g.requirements?.ram || "";
    byId("editGpu").value = g.requirements?.gpu || "";
    byId("editStorage").value = g.requirements?.storage || "";
    byId("editRejectReason").value = g.rejectionReason || "";
    byId("gameEditModal").hidden = false;
  }

  async function saveGame(event) {
    event.preventDefault();
    const id = Number(byId("editGameId").value);
    const original = games.find(g => Number(g.id) === id) || {};
    const payload = {
      name:byId("editName").value.trim(), slug:byId("editSlug").value.trim(), publisherName:byId("editPublisher").value.trim(), type:byId("editType").value,
      priceCoins:Number(byId("editPrice").value || 0), shortDescription:byId("editShort").value.trim(), description:byId("editDescription").value.trim(),
      tags:byId("editTags").value.split(",").map(v => v.trim()).filter(Boolean), coverUrl:byId("editCover").value.trim(), playUrl:byId("editPlay").value.trim(), downloadUrl:byId("editDownload").value.trim(),
      icon:original.icon || "🎮", badge:original.badge || "", theme:original.theme || "default", releaseDate:original.releaseDate || null,
      recommendedOs:byId("editOs").value.trim(), recommendedCpu:byId("editCpu").value.trim(), recommendedRam:byId("editRam").value.trim(), recommendedGpu:byId("editGpu").value.trim(), recommendedStorage:byId("editStorage").value.trim(),
      status:byId("editStatus").value, rejectionReason:byId("editRejectReason").value.trim()
    };
    try {
      const result = await request(`/api/store/admin/games/${id}`, { method:"PUT", body:payload });
      closeModal("game");
      status(result.message || "Đã cập nhật game.");
      await loadGames(activeSection === "pending");
      await loadDashboard();
    } catch (error) { handleAdminError(error, "Không lưu được game."); }
  }

  async function loadUsers() {
    try {
      const result = await request("/api/store/admin/users");
      users = result.data || [];
      renderUsers();
    } catch (error) { handleAdminError(error, "Không tải được người dùng."); }
  }

  function renderUsers() {
    const q = byId("userSearch").value.trim().toLowerCase();
    const filtered = users.filter(u => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
    byId("adminUserTable").innerHTML = filtered.length ? filtered.map(u => `<tr data-user-row="${u.id}"><td>#${u.id}</td><td class="admin-user-name"><input data-user-name value="${esc(u.name)}"></td><td>${esc(u.email)}</td><td><select data-user-role><option value="User" ${u.role === "User" ? "selected" : ""}>User</option><option value="Admin" ${u.role === "Admin" ? "selected" : ""}>Admin</option></select></td><td><b>${fmt(u.coinBalance)} LC</b></td><td>${u.isEmailVerified ? '<span class="admin-chip published">Đã xác minh</span>' : '<span class="admin-chip pending">Chưa xác minh</span>'}</td><td><div class="admin-actions"><button class="admin-secondary" type="button" data-save-user="${u.id}">Lưu</button><button class="admin-ghost" type="button" data-adjust-coin="${u.id}">± Coin</button></div></td></tr>`).join("") : '<tr><td colspan="7"><div class="admin-empty">Không tìm thấy người dùng.</div></td></tr>';
  }

  async function saveUser(id) {
    const row = document.querySelector(`[data-user-row="${id}"]`);
    try {
      const result = await request(`/api/store/admin/users/${id}`, { method:"PUT", body:{ name:row.querySelector("[data-user-name]").value.trim(), role:row.querySelector("[data-user-role]").value } });
      status(result.message || "Đã cập nhật người dùng.");
      await loadUsers();
    } catch (error) { handleAdminError(error, "Không cập nhật được người dùng."); }
  }

  async function adjustCoin(id) {
    const amountText = prompt("Nhập số coin cần cộng hoặc trừ. Ví dụ 500 hoặc -200:", "500");
    if (amountText === null) return;
    const amount = Number(amountText);
    if (!Number.isInteger(amount) || amount === 0) return alert("Số coin không hợp lệ.");
    const reason = prompt("Lý do điều chỉnh:", "Điều chỉnh bởi Admin") || "Điều chỉnh bởi Admin";
    try {
      const result = await request(`/api/store/admin/users/${id}/coins`, { method:"POST", body:{ amount, reason } });
      status(result.message || "Đã điều chỉnh coin.");
      await Promise.all([loadUsers(), loadDashboard()]);
    } catch (error) { handleAdminError(error, "Không điều chỉnh được coin."); }
  }

  async function loadCoinPackages() {
    try {
      const result = await request("/api/store/admin/coin-packages");
      coinPackages = result.data || [];
      renderCoinPackages();
    } catch (error) { handleAdminError(error, "Không tải được gói Lạc Coin."); }
  }

  function renderCoinPackages() {
    byId("coinPackageGrid").innerHTML = coinPackages.length ? coinPackages.map(p => `<article class="coin-package-card ${p.isActive ? "" : "inactive"}"><div class="admin-row-top"><div><h3>${esc(p.name)}</h3><div class="admin-meta"><span>ID #${p.id}</span><span>Thứ tự ${p.sortOrder}</span></div></div><span class="admin-chip ${p.isActive ? "published" : "rejected"}">${p.isActive ? "Đang bán" : "Đã ẩn"}</span></div><div class="coin-total">${fmt(p.totalCoin)} LC</div><div class="coin-price">${money(p.priceVnd)}</div>${Number(p.bonusCoin || 0) > 0 ? `<div class="coin-bonus">${fmt(p.coinAmount)} LC + ${fmt(p.bonusCoin)} LC thưởng</div>` : `<div class="coin-bonus">${fmt(p.coinAmount)} LC</div>`}<div class="admin-row-actions"><button class="admin-secondary" type="button" data-edit-package="${p.id}">Sửa</button><button class="${p.isActive ? "admin-danger-btn" : "admin-primary"}" type="button" data-toggle-package="${p.id}">${p.isActive ? "Ẩn gói" : "Mở bán"}</button></div></article>`).join("") : '<div class="admin-empty">Chưa có gói Lạc Coin.</div>';
  }

  function openCoinPackage(id = null) {
    const p = id == null ? null : coinPackages.find(item => Number(item.id) === Number(id));
    byId("coinPackageModalTitle").textContent = p ? "Chỉnh sửa gói Lạc Coin" : "Thêm gói Lạc Coin";
    byId("coinPackageId").value = p?.id || "";
    byId("coinPackageName").value = p?.name || "";
    byId("coinPackageAmount").value = p?.coinAmount ?? "";
    byId("coinPackagePrice").value = p?.priceVnd ?? "";
    byId("coinPackageBonus").value = p?.bonusCoin ?? 0;
    byId("coinPackageSort").value = p?.sortOrder ?? (coinPackages.length ? Math.max(...coinPackages.map(x => Number(x.sortOrder || 0))) + 10 : 10);
    byId("coinPackageActive").checked = p?.isActive ?? true;
    byId("coinPackageModal").hidden = false;
  }

  async function saveCoinPackage(event) {
    event.preventDefault();
    const id = Number(byId("coinPackageId").value || 0);
    const payload = { name:byId("coinPackageName").value.trim(), coinAmount:Number(byId("coinPackageAmount").value), priceVnd:Number(byId("coinPackagePrice").value), bonusCoin:Number(byId("coinPackageBonus").value || 0), isActive:byId("coinPackageActive").checked, sortOrder:Number(byId("coinPackageSort").value || 0) };
    try {
      const result = await request(id ? `/api/store/admin/coin-packages/${id}` : "/api/store/admin/coin-packages", { method:id ? "PUT" : "POST", body:payload });
      closeModal("coin");
      status(result.message || "Đã lưu gói Lạc Coin.");
      await Promise.all([loadCoinPackages(), loadDashboard()]);
    } catch (error) { handleAdminError(error, "Không lưu được gói Lạc Coin."); }
  }

  async function toggleCoinPackage(id) {
    try {
      const result = await request(`/api/store/admin/coin-packages/${id}/toggle`, { method:"POST" });
      status(result.message || "Đã cập nhật trạng thái gói.");
      await Promise.all([loadCoinPackages(), loadDashboard()]);
    } catch (error) { handleAdminError(error, "Không đổi được trạng thái gói."); }
  }

  async function loadTransactions() {
    try {
      const result = await request("/api/store/admin/transactions?limit=200");
      transactions = result.data || [];
      byId("transactionTable").innerHTML = transactions.length ? transactions.map(t => `<tr><td>${when(t.createdAt)}</td><td><b>${esc(t.accountName || "")}</b><br><small style="color:#7f8da7">${esc(t.email || "")}</small></td><td>${esc(t.type || "")}</td><td><b>${Number(t.coinAmount || 0) >= 0 ? "+" : ""}${fmt(t.coinAmount)} LC</b></td><td>${Number(t.moneyAmount || 0) ? money(t.moneyAmount) : "—"}</td><td><span class="admin-chip ${String(t.status || "").toLowerCase()}">${esc(t.status || "")}</span></td><td>${esc(t.referenceCode || "—")}</td></tr>`).join("") : '<tr><td colspan="7"><div class="admin-empty">Chưa có giao dịch.</div></td></tr>';
    } catch (error) { handleAdminError(error, "Không tải được giao dịch."); }
  }

  function closeModal(type) {
    if (type === "game") byId("gameEditModal").hidden = true;
    if (type === "coin") byId("coinPackageModal").hidden = true;
  }

  function handleAdminError(error, fallback, target = null) {
    if (error.status === 401 || error.status === 403) {
      if (error.status === 401) clearSession();
      return showGate(error.status === 403 ? "Tài khoản hiện tại không có quyền Admin." : "Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.");
    }
    const message = error.message || fallback;
    status(message, true);
    if (target) target.innerHTML = `<div class="admin-empty" style="color:#ff9bad">${esc(message)}</div>`;
  }

  byId("adminLoginForm").addEventListener("submit", loginAdmin);
  byId("adminLogout").addEventListener("click", logoutAdmin);
  byId("refreshDashboard").addEventListener("click", loadDashboard);
  byId("refreshPending").addEventListener("click", () => loadGames(true));
  byId("refreshGames").addEventListener("click", () => loadGames(false));
  byId("refreshUsers").addEventListener("click", loadUsers);
  byId("refreshCoinPackages").addEventListener("click", loadCoinPackages);
  byId("refreshTransactions").addEventListener("click", loadTransactions);
  byId("addCoinPackage").addEventListener("click", () => openCoinPackage());
  byId("userSearch").addEventListener("input", renderUsers);
  byId("gameEditForm").addEventListener("submit", saveGame);
  byId("coinPackageForm").addEventListener("submit", saveCoinPackage);

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-admin-section]"); if (nav) return switchSection(nav.dataset.adminSection);
    const jump = event.target.closest("[data-jump]"); if (jump) return switchSection(jump.dataset.jump);
    const approve = event.target.closest("[data-approve]"); if (approve) return approveGame(approve.dataset.approve);
    const reject = event.target.closest("[data-reject]"); if (reject) return rejectGame(reject.dataset.reject);
    const editGame = event.target.closest("[data-edit-game]"); if (editGame) return openGameEdit(editGame.dataset.editGame);
    const saveUserButton = event.target.closest("[data-save-user]"); if (saveUserButton) return saveUser(saveUserButton.dataset.saveUser);
    const adjustCoinButton = event.target.closest("[data-adjust-coin]"); if (adjustCoinButton) return adjustCoin(adjustCoinButton.dataset.adjustCoin);
    const editPackage = event.target.closest("[data-edit-package]"); if (editPackage) return openCoinPackage(editPackage.dataset.editPackage);
    const togglePackage = event.target.closest("[data-toggle-package]"); if (togglePackage) return toggleCoinPackage(togglePackage.dataset.togglePackage);
    const close = event.target.closest("[data-close-modal]"); if (close) return closeModal(close.dataset.closeModal);
    if (event.target === byId("gameEditModal")) closeModal("game");
    if (event.target === byId("coinPackageModal")) closeModal("coin");
  });

  boot();
})();
