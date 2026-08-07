(() => {
  if (document.body.classList.contains("auth-page")) return;

  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const sessionKeys = ["lacvietgamesStoreSession"];
  let pendingAction = null;
  let pendingRegistration = null;
  let currentMe = null;

  const readSession = () => {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(sessionKeys[0]);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  };

  const clearSession = () => {
    localStorage.removeItem(sessionKeys[0]);
    sessionStorage.removeItem(sessionKeys[0]);
    localStorage.removeItem("lacvietgamesSession");
    sessionStorage.removeItem("lacvietgamesSession");
  };

  const saveSession = (result, remember) => {
    const account = result.data.account;
    const session = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      coinBalance: account.coinBalance,
      verified: account.isEmailVerified,
      token: result.data.token,
      loginAt: new Date().toISOString()
    };
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(sessionKeys[0], JSON.stringify(session));
    // Giữ compatibility cho các trang profile cũ, nhưng KHÔNG lưu coin ở đây.
    (remember ? localStorage : sessionStorage).setItem("lacvietgamesSession", JSON.stringify({
      id: session.id, name: session.name, email: session.email, verified: session.verified, role: session.role
    }));
    return session;
  };

  async function request(path, options = {}, requireAuth = false) {
    const session = readSession();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    if (requireAuth && !session?.token) throw Object.assign(new Error("Bạn cần đăng nhập."), { code: "AUTH_REQUIRED" });

    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch {
      throw new Error("Không thể kết nối máy chủ LacVietGames.");
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      if (response.status === 401 && requireAuth) {
        clearSession();
        document.body.classList.remove("server-authenticated");
      }
      const error = new Error(payload?.message || "Không thể xử lý yêu cầu.");
      error.code = payload?.code;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function toast(message, type = "success") {
    let el = document.getElementById("serverToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "serverToast";
      el.className = "server-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add("show");
    clearTimeout(window.__serverToastTimer);
    window.__serverToastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function ensureStyles() {
    if (document.getElementById("serverStoreStyles")) return;
    const style = document.createElement("style");
    style.id = "serverStoreStyles";
    style.textContent = `
      .server-auth-modal{position:fixed;inset:0;z-index:9999;background:rgba(3,6,14,.82);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px}
      .server-auth-card{width:min(520px,100%);background:#111827;border:1px solid #26334d;border-radius:24px;padding:28px;box-shadow:0 30px 90px rgba(0,0,0,.55);color:#f6f8ff}
      .server-auth-card h2{margin:0 0 8px}.server-auth-card p{color:#9da9c2;margin:0 0 20px}.server-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}.server-auth-tabs button{border:0;border-radius:12px;padding:12px;background:#1d2739;color:#aeb9cd;font-weight:700}.server-auth-tabs button.active{background:#356fe5;color:white}
      .server-auth-form{display:grid;gap:13px}.server-auth-form label{display:grid;gap:7px;color:#cdd5e5;font-size:14px}.server-auth-form input{width:100%;box-sizing:border-box;border:1px solid #35425b;background:#0c1321;color:white;border-radius:12px;padding:13px 14px;font:inherit}.server-auth-actions{display:flex;gap:10px;margin-top:7px}.server-auth-status{min-height:22px;margin-top:12px;color:#ff9e9e;font-size:14px}.server-auth-status.success{color:#8ce0a8}.server-auth-close{position:absolute;right:18px;top:14px;border:0;background:transparent;color:#9da9c2;font-size:25px;cursor:pointer}.server-auth-card{position:relative}
      .server-bell-wrap{position:relative}.server-bell{position:relative}.server-badge{position:absolute;right:-4px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ff5168;color:white;font-size:10px;display:grid;place-items:center;font-weight:800}.server-notifications{position:absolute;right:0;top:48px;width:min(390px,90vw);max-height:520px;overflow:auto;background:#111827;border:1px solid #26334d;border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.5);padding:12px;z-index:1200}.server-notifications[hidden]{display:none}.server-notification-head{display:flex;align-items:center;justify-content:space-between;padding:7px 7px 12px}.server-notification-head button{border:0;background:transparent;color:#7ca7ff;cursor:pointer}.server-notification{display:block;padding:12px;border-radius:12px;text-decoration:none;color:#dbe3f1;border:1px solid transparent}.server-notification.unread{background:#17233a;border-color:#263f6b}.server-notification b{display:block;margin-bottom:4px}.server-notification small{display:block;color:#8e9bb4;line-height:1.5}.server-notification time{display:block;color:#637089;font-size:11px;margin-top:6px}.server-toast{position:fixed;right:24px;bottom:24px;z-index:10000;background:#15223a;color:white;border:1px solid #355b9e;border-radius:14px;padding:13px 18px;opacity:0;transform:translateY(15px);pointer-events:none;transition:.2s}.server-toast.show{opacity:1;transform:none}.server-toast[data-type="error"]{border-color:#9a3b49;background:#361a22}
      .publisher-link,.admin-link{white-space:nowrap}.payment-note{color:#9ca9c2;font-size:13px}
    `;
    document.head.appendChild(style);
  }

  function openAuthModal(action = null, initialTab = "login") {
    pendingAction = action;
    const existing = document.getElementById("serverAuthModal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.id = "serverAuthModal";
    modal.className = "server-auth-modal";
    modal.innerHTML = `
      <section class="server-auth-card" role="dialog" aria-modal="true" aria-label="Đăng nhập LacVietGames">
        <button class="server-auth-close" type="button" data-close-auth>×</button>
        <div id="serverAuthMain">
          <div class="server-auth-tabs"><button type="button" data-auth-tab="login">Đăng nhập</button><button type="button" data-auth-tab="register">Đăng ký</button></div>
          <form id="serverLoginForm" class="server-auth-form">
            <h2>Đăng nhập để tiếp tục</h2><p>Sau khi đăng nhập, bạn vẫn ở đúng game và vị trí hiện tại.</p>
            <label>Email<input id="serverLoginEmail" type="email" autocomplete="email" required></label>
            <label>Mật khẩu<input id="serverLoginPassword" type="password" autocomplete="current-password" required></label>
            <label style="display:flex;grid-template-columns:auto 1fr;align-items:center"><input id="serverRemember" type="checkbox" style="width:auto"> Ghi nhớ đăng nhập</label>
            <button class="btn btn-primary" type="submit">Đăng nhập</button>
          </form>
          <form id="serverRegisterForm" class="server-auth-form" hidden>
            <h2>Tạo tài khoản</h2><p>Tài khoản chỉ được tạo sau khi mã email đúng.</p>
            <label>Họ và tên<input id="serverRegisterName" type="text" required></label>
            <label>Email<input id="serverRegisterEmail" type="email" required></label>
            <label>Mật khẩu<input id="serverRegisterPassword" type="password" minlength="8" required></label>
            <label>Xác nhận mật khẩu<input id="serverRegisterConfirm" type="password" minlength="8" required></label>
            <button class="btn btn-primary" type="submit">Gửi mã xác thực</button>
          </form>
        </div>
        <form id="serverVerifyForm" class="server-auth-form" hidden>
          <h2>Xác thực email</h2><p id="serverVerifyLabel"></p>
          <label>Mã 6 chữ số<input id="serverVerifyCode" inputmode="numeric" maxlength="6" required></label>
          <button class="btn btn-primary" type="submit">Xác thực và tạo tài khoản</button>
          <button class="btn btn-secondary" type="button" data-back-register>Đổi thông tin đăng ký</button>
        </form>
        <div id="serverAuthStatus" class="server-auth-status"></div>
      </section>`;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    const showTab = tab => {
      modal.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b.dataset.authTab === tab));
      modal.querySelector("#serverLoginForm").hidden = tab !== "login";
      modal.querySelector("#serverRegisterForm").hidden = tab !== "register";
      modal.querySelector("#serverVerifyForm").hidden = true;
      modal.querySelector("#serverAuthMain").hidden = false;
      setAuthStatus("");
    };
    showTab(initialTab);

    modal.addEventListener("click", e => {
      if (e.target === modal || e.target.closest("[data-close-auth]")) closeAuthModal();
      const tab = e.target.closest("[data-auth-tab]")?.dataset.authTab;
      if (tab) showTab(tab);
      if (e.target.closest("[data-back-register]")) showTab("register");
    });

    modal.querySelector("#serverLoginForm").addEventListener("submit", handleLogin);
    modal.querySelector("#serverRegisterForm").addEventListener("submit", handleRegister);
    modal.querySelector("#serverVerifyForm").addEventListener("submit", handleVerify);
  }

  function closeAuthModal() {
    document.getElementById("serverAuthModal")?.remove();
    document.body.style.overflow = "";
  }

  function setAuthStatus(message, success = false) {
    const el = document.getElementById("serverAuthStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("success", success);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Đang đăng nhập...";
    try {
      const result = await request("/api/store/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("serverLoginEmail").value.trim().toLowerCase(),
          password: document.getElementById("serverLoginPassword").value
        }
      });
      saveSession(result, document.getElementById("serverRemember").checked);
      await hydrateServerUi();
      closeAuthModal();
      toast("Đăng nhập thành công. Kiểm tra chuông thông báo để xem quà người mới.");
      await resumePendingAction();
    } catch (error) {
      setAuthStatus(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Đăng nhập";
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("serverRegisterName").value.trim();
    const email = document.getElementById("serverRegisterEmail").value.trim().toLowerCase();
    const password = document.getElementById("serverRegisterPassword").value;
    const confirm = document.getElementById("serverRegisterConfirm").value;
    if (name.length < 2) return setAuthStatus("Tên phải có ít nhất 2 ký tự.");
    if (password.length < 8) return setAuthStatus("Mật khẩu phải có ít nhất 8 ký tự.");
    if (password !== confirm) return setAuthStatus("Mật khẩu xác nhận không khớp.");

    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Đang gửi mã...";
    try {
      const result = await request("/api/Accounts/register", { method: "POST", body: { name, email, password } });
      pendingRegistration = result.data;
      if (!pendingRegistration?.registrationToken) throw new Error("Máy chủ chưa trả về phiên xác thực.");
      document.getElementById("serverAuthMain").hidden = true;
      document.getElementById("serverVerifyForm").hidden = false;
      document.getElementById("serverVerifyLabel").textContent = `Mã đã gửi tới ${pendingRegistration.email}.`;
      setAuthStatus("Nhập mã chính xác để tạo tài khoản.", true);
    } catch (error) {
      setAuthStatus(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Gửi mã xác thực";
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    const code = document.getElementById("serverVerifyCode").value.trim();
    if (!/^\d{6}$/.test(code)) return setAuthStatus("Mã xác thực phải gồm 6 chữ số.");
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Đang xác thực...";
    try {
      const result = await request("/api/Accounts/verify-email", {
        method: "POST",
        body: { registrationToken: pendingRegistration.registrationToken, code }
      });
      const email = result.data?.accEmail || pendingRegistration.email;
      document.getElementById("serverVerifyForm").hidden = true;
      document.getElementById("serverAuthMain").hidden = false;
      document.getElementById("serverLoginForm").hidden = false;
      document.getElementById("serverRegisterForm").hidden = true;
      document.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b.dataset.authTab === "login"));
      document.getElementById("serverLoginEmail").value = email;
      setAuthStatus("Đăng ký thành công. Đăng nhập để nhận Lạc Coin người mới.", true);
      pendingRegistration = null;
    } catch (error) {
      setAuthStatus(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Xác thực và tạo tài khoản";
    }
  }

  async function hydrateServerUi() {
    const session = readSession();
    const header = document.querySelector(".header-actions");
    if (!header) return;

    // Xóa số coin demo được store.js dựng local.
    header.querySelector(".coin-pill")?.remove();
    header.querySelector(".server-bell-wrap")?.remove();
    header.querySelector(".publisher-link")?.remove();
    header.querySelector(".admin-link")?.remove();

    if (!session?.token) {
      document.body.classList.remove("server-authenticated");
      const account = header.querySelector(".account-btn");
      if (account) account.outerHTML = `<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>`;
      return;
    }

    try {
      const me = await request("/api/store/me", {}, true);
      currentMe = me.data;
      document.body.classList.add("server-authenticated");

      const loginButton = header.querySelector("[data-open-server-auth]");
      if (loginButton) loginButton.outerHTML = `<a class="account-btn" href="./profile.html"><span class="avatar-mini">${escapeHtml(currentMe.name?.charAt(0)?.toUpperCase() || "LV")}</span><span>${escapeHtml(currentMe.name || "Tài khoản")}</span></a>`;

      const anchor = header.querySelector(".account-btn") || header.lastElementChild;
      anchor.insertAdjacentHTML("beforebegin", `<a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b>${Number(currentMe.coinBalance || 0).toLocaleString("vi-VN")}</b></a>`);
      anchor.insertAdjacentHTML("beforebegin", `<span class="server-bell-wrap"><button class="icon-btn server-bell" type="button" title="Thông báo">🔔${currentMe.unreadNotifications ? `<span class="server-badge">${Math.min(99, currentMe.unreadNotifications)}</span>` : ""}</button><div class="server-notifications" hidden></div></span>`);
      anchor.insertAdjacentHTML("beforebegin", `<a class="publisher-link btn btn-secondary" href="./publisher.html">Đăng game</a>`);
      if (String(currentMe.role).toLowerCase() === "admin") anchor.insertAdjacentHTML("beforebegin", `<a class="admin-link btn btn-secondary" href="./admin.html">Admin</a>`);

      await hydrateWalletPage();
    } catch {
      clearSession();
      currentMe = null;
      document.body.classList.remove("server-authenticated");
    }
  }

  async function openNotifications() {
    const panel = document.querySelector(".server-notifications");
    if (!panel) return;
    if (!panel.hidden) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.innerHTML = `<div class="server-notification-head"><b>Thông báo</b><button type="button" data-read-all>Đánh dấu đã đọc</button></div><div style="padding:12px;color:#8e9bb4">Đang tải...</div>`;
    try {
      const result = await request("/api/store/notifications", {}, true);
      panel.innerHTML = `<div class="server-notification-head"><b>Thông báo</b><button type="button" data-read-all>Đánh dấu đã đọc</button></div>${result.data.length ? result.data.map(n => `<a class="server-notification ${n.isRead ? "" : "unread"}" href="${escapeHtml(n.actionUrl || "#")}" data-notification-id="${n.id}"><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.message)}</small><time>${new Date(n.createdAt).toLocaleString("vi-VN")}</time></a>`).join("") : `<div style="padding:15px;color:#8e9bb4">Chưa có thông báo.</div>`}`;
    } catch (error) {
      panel.innerHTML = `<div style="padding:15px;color:#ff9e9e">${escapeHtml(error.message)}</div>`;
    }
  }

  async function purchaseCurrentGame() {
    const slug = new URLSearchParams(location.search).get("id");
    if (!slug) return;
    try {
      const gameResult = await request(`/api/store/games/${encodeURIComponent(slug)}`);
      const game = gameResult.data;
      const purchase = await request(`/api/store/games/${game.id}/purchase`, { method: "POST" }, true);
      toast(purchase.message || "Game đã được thêm vào thư viện.");
      await hydrateServerUi();
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") return openAuthModal({ type: "purchase" });
      if (error.code === "INSUFFICIENT_COINS") {
        toast("Số dư không đủ. Mở ví để nạp Lạc Coin.", "error");
        setTimeout(() => location.href = "./wallet.html", 900);
        return;
      }
      toast(error.message, "error");
    }
  }

  async function createTopUp(coinAmount) {
    try {
      const result = await request("/api/store/payments/orders", {
        method: "POST",
        body: { coinAmount: Number(coinAmount), provider: "payos" }
      }, true);
      if (!result.data?.checkoutUrl) throw new Error("Server chưa trả về link thanh toán.");
      sessionStorage.setItem("lacvietgamesPendingPayment", JSON.stringify({ orderId: result.data.orderId, coinAmount: result.data.coinAmount }));
      location.href = result.data.checkoutUrl;
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") return openAuthModal({ type: "topup", coinAmount });
      toast(error.message, "error");
    }
  }

  async function hydrateWalletPage() {
    if (document.body.dataset.page !== "wallet" || !readSession()?.token) return;
    try {
      const result = await request("/api/store/wallet/transactions", {}, true);
      document.querySelector(".wallet-balance strong")?.replaceChildren(document.createTextNode(`${Number(result.balance || 0).toLocaleString("vi-VN")} Lạc Coin`));
      const list = document.querySelector(".transaction-list");
      if (list) list.innerHTML = result.data.length ? result.data.map(t => `<div class="transaction"><div class="transaction-icon">🪙</div><div><b>${escapeHtml(t.description || t.type)}</b><small>${new Date(t.createdAt).toLocaleString("vi-VN")}</small></div><b class="${t.coinAmount >= 0 ? "positive" : "negative"}">${t.coinAmount >= 0 ? "+" : ""}${Number(t.coinAmount).toLocaleString("vi-VN")} LC</b></div>`).join("") : `<div class="empty-state"><p>Chưa có giao dịch.</p></div>`;
    } catch {}
  }

  async function resumePendingAction() {
    const action = pendingAction;
    pendingAction = null;
    if (!action) return;
    if (action.type === "href") location.href = action.href;
    if (action.type === "purchase") await purchaseCurrentGame();
    if (action.type === "topup") await createTopUp(action.coinAmount);
  }

  function bindGlobalEvents() {
    document.addEventListener("click", async event => {
      const openAuth = event.target.closest("[data-open-server-auth]");
      if (openAuth) { event.preventDefault(); openAuthModal(); return; }

      const bell = event.target.closest(".server-bell");
      if (bell) { event.preventDefault(); await openNotifications(); return; }

      const readAll = event.target.closest("[data-read-all]");
      if (readAll) {
        event.preventDefault();
        await request("/api/store/notifications/read-all", { method: "POST" }, true).catch(() => null);
        await hydrateServerUi();
        await openNotifications();
        return;
      }

      const notification = event.target.closest("[data-notification-id]");
      if (notification) request(`/api/store/notifications/${notification.dataset.notificationId}/read`, { method: "POST" }, true).catch(() => null);
    });

    document.addEventListener("click", event => {
      const session = readSession();
      const anchor = event.target.closest("a");
      const href = anchor?.getAttribute("href") || "";
      const protectedLink = href.includes("play.html") || href.includes("library.html?install=");
      const buyButton = event.target.closest("#buyGame");
      const pack = event.target.closest("[data-pack]");

      if (protectedLink && !session?.token) {
        event.preventDefault(); event.stopImmediatePropagation();
        openAuthModal({ type: "href", href });
        return;
      }
      if (buyButton) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!session?.token) openAuthModal({ type: "purchase" });
        else purchaseCurrentGame();
        return;
      }
      if (pack) {
        event.preventDefault(); event.stopImmediatePropagation();
        const coinAmount = Number(pack.dataset.pack);
        if (!session?.token) openAuthModal({ type: "topup", coinAmount });
        else createTopUp(coinAmount);
      }
    }, true);
  }

  async function handlePaymentReturn() {
    if (document.body.dataset.page !== "wallet") return;
    const payment = new URLSearchParams(location.search).get("payment");
    if (!payment) return;
    if (payment === "cancel") return toast("Bạn đã hủy thanh toán.", "error");
    const pending = (() => { try { return JSON.parse(sessionStorage.getItem("lacvietgamesPendingPayment") || "null"); } catch { return null; } })();
    if (!pending?.orderId) return;
    for (let i = 0; i < 8; i++) {
      try {
        const order = await request(`/api/store/payments/orders/${pending.orderId}`, {}, true);
        if (order.data.status === "Completed") {
          sessionStorage.removeItem("lacvietgamesPendingPayment");
          toast("Thanh toán thành công. Lạc Coin đã được cộng tự động.");
          await hydrateServerUi();
          return;
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    toast("Đang chờ ngân hàng xác nhận. Số dư sẽ tự cập nhật khi webhook tới server.");
  }

  ensureStyles();
  bindGlobalEvents();
  const boot = async () => {
    // Đợi store.js render header/page xong rồi mới thay dữ liệu demo bằng dữ liệu server.
    await new Promise(resolve => setTimeout(resolve, 0));
    await hydrateServerUi();
    await handlePaymentReturn();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
