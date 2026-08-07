(() => {
  if (document.body.dataset.page !== "wallet") return;

  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const app = document.getElementById("app");
  if (!app) return;

  const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
  const fmt = value => Number(value || 0).toLocaleString("vi-VN");
  const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem("lacvietgamesStoreSession");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  async function api(path, { method = "GET", body, auth = true } = {}) {
    const session = readSession();
    if (auth && !session?.token) {
      const error = new Error("Bạn cần đăng nhập để sử dụng Ví Lạc Coin.");
      error.status = 401;
      throw error;
    }

    const headers = { "Content-Type": "application/json" };
    if (auth && session?.token) headers.Authorization = `Bearer ${session.token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
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
      if (error?.name === "AbortError") throw new Error("Kết nối đang chậm. Vui lòng thử lại.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function ensureStyle() {
    if (document.getElementById("walletAuthorityStyle")) return;
    const style = document.createElement("style");
    style.id = "walletAuthorityStyle";
    style.textContent = `
      .wallet-live{display:grid;gap:28px}.wallet-live-head{display:flex;justify-content:space-between;align-items:end;gap:20px}.wallet-live-head h1{margin:5px 0 0;font-size:clamp(34px,5vw,52px)}
      .wallet-balance-card{padding:30px 32px;border-radius:24px;background:linear-gradient(135deg,#5238c9,#2868cf);box-shadow:0 20px 55px rgba(26,52,137,.25)}.wallet-balance-card span{display:block;color:#d7defb}.wallet-balance-card strong{display:block;font-size:clamp(38px,6vw,58px);margin-top:8px}
      .wallet-live-section{background:#101620;border:1px solid #252e40;border-radius:22px;padding:24px}.wallet-live-section h2{margin:0 0 6px}.wallet-live-section>p{margin:0 0 18px;color:#8d9bb4}
      .wallet-live-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.wallet-live-pack{border:1px solid #29344a;background:#111824;color:#fff;border-radius:18px;padding:22px;text-align:left;cursor:pointer;transition:.18s;min-height:165px}.wallet-live-pack:hover{transform:translateY(-2px);border-color:#6688ef;background:#151f32}.wallet-live-pack:disabled{opacity:.55;cursor:wait;transform:none}.wallet-live-pack .wallet-coin-icon{font-size:27px}.wallet-live-pack .pack-name{display:block;color:#8392ad;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:12px}.wallet-live-pack strong{display:block;font-size:22px;margin:5px 0 6px}.wallet-live-pack small{color:#a9b8d5}.wallet-live-pack .bonus{display:inline-block;margin-top:8px;padding:5px 8px;border-radius:999px;background:#173327;color:#7be6a6;font-size:11px;font-weight:800}
      .wallet-live-transactions{display:grid}.wallet-live-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:13px;align-items:center;padding:15px 0;border-bottom:1px solid #202a3b}.wallet-live-row:last-child{border-bottom:0}.wallet-live-row .tx-icon{width:38px;height:38px;border-radius:12px;background:#1a2436;display:grid;place-items:center}.wallet-live-row small{display:block;color:#8190aa;margin-top:4px}.wallet-live-row .plus{color:#70dda0}.wallet-live-row .minus{color:#ff8e9e}
      .wallet-live-empty{padding:28px;text-align:center;color:#8391a9}.wallet-live-error{padding:24px;border:1px solid #673b49;background:#24151c;border-radius:18px;color:#ffb0bb}.wallet-live-error button{margin-top:14px}
      .wallet-skeleton{display:grid;gap:28px}.wallet-skeleton .sk{background:linear-gradient(90deg,#101620 25%,#182234 37%,#101620 63%);background-size:400% 100%;animation:walletShimmer 1.3s ease infinite;border-radius:20px}.wallet-skeleton .sk-title{height:48px;width:280px}.wallet-skeleton .sk-balance{height:180px}.wallet-skeleton .sk-packs{height:190px}.wallet-skeleton .sk-history{height:220px}@keyframes walletShimmer{0%{background-position:100% 0}100%{background-position:0 0}}
      @media(max-width:650px){.wallet-live-head{align-items:start;flex-direction:column}.wallet-balance-card{padding:24px}.wallet-live-section{padding:18px}.wallet-live-row{grid-template-columns:38px minmax(0,1fr)}.wallet-live-row>strong{grid-column:2}}
    `;
    document.head.appendChild(style);
  }

  function renderSkeleton() {
    app.innerHTML = `<div class="wallet-skeleton" aria-label="Đang mở Ví Lạc Coin"><div class="sk sk-title"></div><div class="sk sk-balance"></div><div class="sk sk-packs"></div><div class="sk sk-history"></div></div>`;
  }

  function renderLoggedOut() {
    app.innerHTML = `<div class="empty-state"><h2>Đăng nhập để mở Ví Lạc Coin</h2><p>Số dư và giao dịch được bảo vệ theo tài khoản của bạn.</p><button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập / Đăng ký</button></div>`;
  }

  function transactionRow(t) {
    const amount = Number(t.coinAmount || 0);
    const details = [new Date(t.createdAt).toLocaleString("vi-VN")];
    if (Number(t.moneyAmount || 0) > 0) details.push(money(t.moneyAmount));
    if (t.referenceCode) details.push(`#${esc(t.referenceCode)}`);
    return `<div class="wallet-live-row"><span class="tx-icon">🪙</span><div><b>${esc(t.description || t.type || "Giao dịch Lạc Coin")}</b><small>${details.join(" · ")}</small></div><strong class="${amount >= 0 ? "plus" : "minus"}">${amount >= 0 ? "+" : ""}${fmt(amount)} LC</strong></div>`;
  }

  function renderWallet(wallet, packs) {
    const transactions = Array.isArray(wallet.data) ? wallet.data : [];
    const packageList = Array.isArray(packs.data) ? packs.data : [];
    app.innerHTML = `
      <div class="wallet-live">
        <div class="wallet-live-head"><div><span class="eyebrow">LACVIET WALLET</span><h1>Ví Lạc Coin</h1></div></div>
        <section class="wallet-balance-card"><span>Số dư khả dụng</span><strong>${fmt(wallet.balance)} LC</strong></section>
        <section class="wallet-live-section"><h2>Nạp Lạc Coin</h2><p>Chọn gói Lạc Coin và thanh toán qua payOS.</p><div class="wallet-live-packs">${packageList.length ? packageList.map(p => `<button class="wallet-live-pack" type="button" data-wallet-package-id="${Number(p.id)}"><span class="wallet-coin-icon">🪙</span><span class="pack-name">${esc(p.name || "Gói Lạc Coin")}</span><strong>${fmt(p.totalCoin ?? (Number(p.coinAmount || 0) + Number(p.bonusCoin || 0)))} LC</strong><small>${money(p.amountVnd)}</small>${Number(p.bonusCoin || 0) > 0 ? `<span class="bonus">+${fmt(p.bonusCoin)} LC thưởng</span>` : ""}</button>`).join("") : '<div class="wallet-live-empty">Hiện chưa có gói Lạc Coin đang mở bán.</div>'}</div></section>
        <section class="wallet-live-section"><h2>Lịch sử giao dịch</h2><div class="wallet-live-transactions">${transactions.length ? transactions.map(transactionRow).join("") : '<div class="wallet-live-empty">Chưa có giao dịch.</div>'}</div></section>
      </div>`;
  }

  function renderError(message) {
    app.innerHTML = `<div class="wallet-live-error"><strong>Không thể tải Ví Lạc Coin</strong><div style="margin-top:7px">${esc(message)}</div><button class="btn btn-secondary" type="button" data-wallet-retry>Thử lại</button></div>`;
  }

  async function loadWallet() {
    const session = readSession();
    if (!session?.token) return renderLoggedOut();
    renderSkeleton();
    try {
      const [wallet, packs] = await Promise.all([
        api("/api/store/wallet/transactions"),
        api("/api/store/payments/packs", { auth: false })
      ]);
      renderWallet(wallet, packs);
      if (window.LVGSession?.cacheServerAccount) {
        window.LVGSession.cacheServerAccount({ coinBalance: Number(wallet.balance || 0) });
      }
    } catch (error) {
      if (error.status === 401) return renderLoggedOut();
      renderError(error.message || "Không thể kết nối máy chủ.");
    }
  }

  async function createPayment(button, packageId) {
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<strong>Đang tạo thanh toán…</strong>`;
    try {
      const result = await api("/api/store/payments/orders", {
        method: "POST",
        body: { packageId, provider: "payos" }
      });
      const checkoutUrl = result.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("Không nhận được đường dẫn thanh toán từ payOS.");
      location.href = checkoutUrl;
    } catch (error) {
      button.disabled = false;
      button.innerHTML = original;
      const message = error.code === "PAYMENT_NOT_CONFIGURED" ? "Hệ thống thanh toán chưa được cấu hình hoàn tất." : error.message;
      alert(message);
    }
  }

  ensureStyle();
  loadWallet();

  document.addEventListener("click", event => {
    const pack = event.target.closest("[data-wallet-package-id]");
    if (pack) {
      const packageId = Number(pack.dataset.walletPackageId);
      if (Number.isInteger(packageId) && packageId > 0) createPayment(pack, packageId);
      return;
    }
    if (event.target.closest("[data-wallet-retry]")) loadWallet();
  });

  window.addEventListener("lvg:session-hydrated", () => {
    if (!app.querySelector(".wallet-live") && readSession()?.token) loadWallet();
  });
  window.addEventListener("lvg:session-invalid", renderLoggedOut);
})();
