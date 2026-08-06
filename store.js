(() => {
  const games = window.LVG_GAMES || [];
  const page = document.body.dataset.page || "home";
  const qs = new URLSearchParams(location.search);
  const byId = (id) => document.getElementById(id);
  const apiBase = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const readSession = () => {
    try {
      const raw = localStorage.getItem("lacvietgamesSession") || sessionStorage.getItem("lacvietgamesSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const session = readSession();
  const defaultProfile = {
    displayName: session?.name || "Game thủ Lạc Việt",
    username: session?.email?.split("@")[0] || "lacviet_player",
    email: session?.email || "",
    phone: "",
    birthday: "",
    location: "Việt Nam",
    bio: "Khám phá thế giới game Việt cùng LacVietGames.",
    favoriteGenre: "Casual",
    avatar: (session?.name || "LV").trim().charAt(0).toUpperCase()
  };
  const profile = { ...defaultProfile, ...readJSON("lacvietgamesProfile", {}) };
  const wallet = readJSON("lacvietgamesWallet", {
    balance: 2500,
    transactions: [
      { id: 1, title: "Quà chào mừng", note: "Tài khoản LacVietGames", amount: 2500, date: "Hôm nay", icon: "🎁" }
    ]
  });
  const owned = readJSON("lacvietgamesLibrary", ["alien-outpost", "bloom-with-ai", "database-mystery"]);
  const wishlist = readJSON("lacvietgamesWishlist", ["space-garbage"]);
  const recentlyPlayed = readJSON("lacvietgamesRecent", []);

  function formatCoin(value) { return new Intl.NumberFormat("vi-VN").format(value); }
  function getGame(id) { return games.find((game) => game.id === id); }
  function isOwned(id) { return owned.includes(id); }
  function toast(message) {
    let el = byId("globalToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "globalToast";
      el.className = "toast";
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__lvgToast);
    window.__lvgToast = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function escapeHTML(value = "") {
    return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function navLink(label, href, key) {
    return `<a href="${href}" class="${page === key ? "active" : ""}">${label}</a>`;
  }

  function renderHeader() {
    const target = byId("siteHeader");
    if (!target) return;
    target.innerHTML = `
      <header class="site-header">
        <div class="topbar">
          <a class="logo" href="./index.html"><span class="logo-mark">LV</span><span>LacVietGames</span></a>
          <nav class="main-nav" aria-label="Điều hướng chính">
            ${navLink("Trang chủ", "./index.html", "home")}
            ${navLink("Khám phá", "./catalog.html", "catalog")}
            ${navLink("Web game", "./catalog.html?type=web", "web")}
            ${navLink("Thư viện", "./library.html", "library")}
          </nav>
          <form class="search-shell" id="globalSearch">
            <input id="globalSearchInput" type="search" placeholder="Tìm game, thể loại, studio..." aria-label="Tìm kiếm game">
            <button type="submit" aria-label="Tìm kiếm">⌕</button>
          </form>
          <div class="header-actions">
            <a class="coin-pill" href="./wallet.html" title="Ví Lạc Coin"><span>🪙</span><b>${formatCoin(wallet.balance)}</b></a>
            <a class="icon-btn" href="./library.html#wishlist" title="Yêu thích">♡</a>
            ${session ? `
              <a class="account-btn" href="./profile.html"><span class="avatar-mini">${escapeHTML(profile.avatar)}</span><span>${escapeHTML(profile.displayName.split(" ").slice(-2).join(" "))}</span></a>
            ` : `<a class="btn btn-primary" href="./auth.html">Đăng nhập</a>`}
          </div>
        </div>
      </header>`;

    byId("globalSearch")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = byId("globalSearchInput").value.trim();
      location.href = `./catalog.html${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    });
  }

  function renderFooter() {
    const target = byId("siteFooter");
    if (!target) return;
    target.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-grid">
            <div>
              <a class="logo" href="./index.html"><span class="logo-mark">LV</span><span>LacVietGames</span></a>
              <p class="footer-copy">Nền tảng game Việt dành cho web game, game tải về và cộng đồng người chơi. Một tài khoản, một ví Lạc Coin, mọi trải nghiệm.</p>
            </div>
            <div class="footer-column"><h4>Nền tảng</h4><a href="./catalog.html">Khám phá game</a><a href="./catalog.html?type=web">Web game</a><a href="./library.html">Thư viện</a><a href="./wallet.html">Lạc Coin</a></div>
            <div class="footer-column"><h4>Tài khoản</h4><a href="./profile.html">Trang cá nhân</a><a href="./edit-profile.html">Chỉnh sửa hồ sơ</a><a href="./auth.html">Đăng nhập</a><a href="./auth.html?tab=register">Đăng ký</a></div>
            <div class="footer-column"><h4>Hỗ trợ</h4><a href="#">Trung tâm trợ giúp</a><a href="#">Điều khoản sử dụng</a><a href="#">Chính sách bảo mật</a><a href="#">Liên hệ đối tác</a></div>
          </div>
          <div class="footer-bottom"><span>© 2026 LacVietGames. All rights reserved.</span><span>Made for Vietnamese gamers</span></div>
        </div>
      </footer>`;
  }

  function gameCard(game) {
    const wished = wishlist.includes(game.id);
    const price = game.price === 0
      ? `<span class="price free">Miễn phí</span>`
      : `<span class="price">${game.oldPrice ? `<span class="old-price">${formatCoin(game.oldPrice)}</span>` : ""}${formatCoin(game.price)} LC</span>`;
    return `
      <article class="game-card" data-game="${game.id}">
        <a href="./game.html?id=${game.id}" aria-label="Xem ${escapeHTML(game.title)}">
          <div class="game-cover theme-${game.theme}"><span>${game.icon}</span><span class="game-badge">${escapeHTML(game.badge)}</span></div>
        </a>
        <button class="wishlist-btn ${wished ? "active" : ""}" data-wishlist="${game.id}" aria-label="Yêu thích">${wished ? "♥" : "♡"}</button>
        <div class="game-info">
          <div class="game-meta"><span>${game.type === "web" ? "WEB GAME" : "TẢI VỀ"}</span><span>${game.platform[0]}</span></div>
          <a href="./game.html?id=${game.id}"><h3>${escapeHTML(game.title)}</h3><p>${escapeHTML(game.category.join(" · "))}</p></a>
          <div class="game-foot"><span class="rating">★ ${game.rating} <span style="color:#7e89a1">(${formatCoin(game.reviews)})</span></span>${price}</div>
        </div>
      </article>`;
  }

  function bindWishlist() {
    document.querySelectorAll("[data-wishlist]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const id = button.dataset.wishlist;
        const index = wishlist.indexOf(id);
        if (index >= 0) wishlist.splice(index, 1); else wishlist.push(id);
        writeJSON("lacvietgamesWishlist", wishlist);
        button.classList.toggle("active", index < 0);
        button.textContent = index < 0 ? "♥" : "♡";
        toast(index < 0 ? "Đã thêm vào danh sách yêu thích" : "Đã bỏ khỏi danh sách yêu thích");
      });
    });
  }

  function renderHome() {
    byId("app").innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Nền tảng game Việt thế hệ mới</span>
          <h1>Chơi ngay.<br><span>Tải về. Kết nối.</span></h1>
          <p>Khám phá web game chơi tức thì, những tựa game tải về độc quyền và hệ sinh thái Lạc Coin dành cho cộng đồng game thủ Việt.</p>
          <div class="hero-actions"><a class="btn btn-primary" href="./catalog.html">Khám phá kho game</a><a class="btn btn-secondary" href="./catalog.html?type=web">Chơi web game</a></div>
          <div class="hero-stats"><div><strong>40+</strong><small>Tựa game</small></div><div><strong>120K</strong><small>Người chơi</small></div><div><strong>4.8/5</strong><small>Đánh giá</small></div></div>
        </div>
        <div class="hero-art">🎮</div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Khám phá theo thể loại</h2><p>Tìm nhanh trải nghiệm phù hợp với bạn.</p></div><a class="section-link" href="./catalog.html">Xem tất cả →</a></div>
        <div class="category-grid">
          ${[["⚡","Hành động","12 game"],["🏁","Đua xe","8 game"],["🧩","Puzzle","14 game"],["🌱","Mô phỏng","10 game"],["🧟","Sinh tồn","7 game"],["🎯","Casual","18 game"]].map(([icon,name,count]) => `<a class="category-card" href="./catalog.html?category=${encodeURIComponent(name)}"><span>${icon}</span><div><strong>${name}</strong><small>${count}</small></div></a>`).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Được tuyển chọn</span><h2>Game nổi bật tuần này</h2></div><a class="section-link" href="./catalog.html">Khám phá thêm →</a></div>
        <div class="game-grid">${games.slice(0,4).map(gameCard).join("")}</div>
      </section>

      <section class="section promo-row">
        <article class="promo"><span class="eyebrow">Lạc Coin</span><h3>Một ví cho mọi game</h3><p>Mua game, mở khóa nội dung và nhận thưởng trong toàn bộ hệ sinh thái LacVietGames.</p><a class="btn btn-primary" href="./wallet.html">Mở ví Lạc Coin</a><div class="promo-icon">🪙</div></article>
        <article class="promo green"><span class="eyebrow">Chơi ngay</span><h3>Không cần cài đặt</h3><p>Mở trình duyệt, chọn game và bắt đầu trong vài giây.</p><a class="btn btn-secondary" href="./catalog.html?type=web">Xem web game</a><div class="promo-icon">🚀</div></article>
      </section>

      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Instant play</span><h2>Web game được yêu thích</h2><p>Chơi trên máy tính và điện thoại, không cần tải về.</p></div></div>
        <div class="game-grid">${games.filter(g=>g.type==="web").slice(0,4).map(gameCard).join("")}</div>
      </section>

      <section class="section">
        <div class="section-head"><div><span class="eyebrow">Premium</span><h2>Game tải về nổi bật</h2><p>Sở hữu trọn vẹn, cập nhật lâu dài trong thư viện của bạn.</p></div></div>
        <div class="game-grid">${games.filter(g=>g.type==="download").slice(0,4).map(gameCard).join("")}</div>
      </section>`;
    bindWishlist();
  }

  function renderCatalog() {
    const initialQuery = qs.get("q") || "";
    const initialType = qs.get("type") || "all";
    const initialCategory = qs.get("category") || "";
    const categories = [...new Set(games.flatMap(g => g.category))].sort();
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Game store</span><h2>Khám phá kho game</h2><p>Web game, game tải về và những trải nghiệm độc quyền.</p></div></div>
      <div class="catalog-layout">
        <aside class="filter-panel">
          <h3>Bộ lọc</h3><div class="filter-groups">
          <div class="filter-group"><strong>Loại game</strong>
            ${[["all","Tất cả"],["web","Web game"],["download","Tải về"]].map(([v,l])=>`<label><input type="radio" name="type" value="${v}" ${initialType===v?"checked":""}> ${l}</label>`).join("")}
          </div>
          <div class="filter-group"><strong>Thể loại</strong>
            <label><input type="radio" name="category" value="" ${!initialCategory?"checked":""}> Tất cả</label>
            ${categories.map(c=>`<label><input type="radio" name="category" value="${c}" ${initialCategory===c?"checked":""}> ${c}</label>`).join("")}
          </div>
          <div class="filter-group"><strong>Mức giá</strong>
            <label><input type="radio" name="price" value="all" checked> Tất cả</label><label><input type="radio" name="price" value="free"> Miễn phí</label><label><input type="radio" name="price" value="paid"> Trả phí</label>
          </div></div>
        </aside>
        <section>
          <div class="catalog-toolbar"><input id="catalogSearch" class="field-control" type="search" value="${escapeHTML(initialQuery)}" placeholder="Tìm trong kho game..."><div><span id="resultCount" class="result-count"></span> <select id="sortGames"><option value="featured">Nổi bật</option><option value="rating">Đánh giá cao</option><option value="priceAsc">Giá thấp đến cao</option><option value="priceDesc">Giá cao đến thấp</option></select></div></div>
          <div id="catalogGrid" class="game-grid"></div>
        </section>
      </div>`;

    const update = () => {
      const query = byId("catalogSearch").value.trim().toLowerCase();
      const type = document.querySelector('input[name="type"]:checked').value;
      const category = document.querySelector('input[name="category"]:checked').value;
      const price = document.querySelector('input[name="price"]:checked').value;
      const sort = byId("sortGames").value;
      let filtered = games.filter(g => {
        const haystack = `${g.title} ${g.studio} ${g.category.join(" ")} ${g.tagline}`.toLowerCase();
        return (!query || haystack.includes(query)) && (type === "all" || g.type === type) && (!category || g.category.includes(category)) && (price === "all" || (price === "free" ? g.price === 0 : g.price > 0));
      });
      if (sort === "rating") filtered.sort((a,b)=>b.rating-a.rating);
      if (sort === "priceAsc") filtered.sort((a,b)=>a.price-b.price);
      if (sort === "priceDesc") filtered.sort((a,b)=>b.price-a.price);
      byId("resultCount").textContent = `${filtered.length} game`;
      byId("catalogGrid").innerHTML = filtered.length ? filtered.map(gameCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><h3>Không tìm thấy game phù hợp</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>`;
      bindWishlist();
    };
    document.querySelectorAll(".filter-panel input").forEach(input=>input.addEventListener("change",update));
    byId("catalogSearch").addEventListener("input",update);
    byId("sortGames").addEventListener("change",update);
    update();
  }

  function purchaseGame(game) {
    if (!session) { location.href = "./auth.html"; return; }
    if (isOwned(game.id)) { toast("Game đã có trong thư viện của bạn"); return; }
    if (game.price > wallet.balance) { showModal("Số dư chưa đủ", `Bạn cần thêm ${formatCoin(game.price-wallet.balance)} Lạc Coin để sở hữu ${game.title}.`, `<a class="btn btn-primary" href="./wallet.html">Nạp Lạc Coin</a>`); return; }
    wallet.balance -= game.price;
    wallet.transactions.unshift({ id: Date.now(), title: game.title, note: "Mua game", amount: -game.price, date: "Vừa xong", icon: game.icon });
    owned.push(game.id);
    writeJSON("lacvietgamesWallet", wallet); writeJSON("lacvietgamesLibrary", owned);
    showModal("Đã thêm vào thư viện", `${game.title} đã thuộc sở hữu của bạn.`, `<a class="btn btn-primary" href="./library.html">Mở thư viện</a>`);
    renderHeader();
  }

  function showModal(title, text, action = "") {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<section class="modal-card"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px">${action}<button class="btn btn-secondary" data-close-modal>Đóng</button></div></section>`;
    document.body.append(wrap);
    wrap.addEventListener("click", e => { if (e.target === wrap || e.target.closest("[data-close-modal]")) wrap.remove(); });
  }

  function renderGameDetail() {
    const game = getGame(qs.get("id")) || games[0];
    const ownedGame = isOwned(game.id) || game.price === 0;
    byId("app").innerHTML = `
      <section class="detail-hero">
        <div class="detail-visual theme-${game.theme}">${game.icon}</div>
        <div class="detail-copy"><span class="eyebrow">${game.type === "web" ? "Web game" : "Game tải về"}</span><h1>${escapeHTML(game.title)}</h1><p class="detail-tagline">${escapeHTML(game.tagline)}</p>
          <div class="tag-row">${game.category.map(c=>`<span class="tag">${c}</span>`).join("")}<span class="tag">★ ${game.rating}</span><span class="tag">${game.platform.join(" · ")}</span></div>
          <div class="detail-price">${game.price===0?"Miễn phí":`${formatCoin(game.price)} Lạc Coin`}</div>
          <div class="detail-actions">
            ${ownedGame ? `<a class="btn btn-primary" href="${game.type === "web" ? `./play.html?id=${game.id}` : `./library.html?install=${game.id}`}">${game.type === "web" ? "▶ Chơi ngay" : "↓ Tải xuống"}</a>` : `<button id="buyGame" class="btn btn-primary">Mua ngay</button>`}
            <button class="btn btn-secondary" data-wishlist="${game.id}">${wishlist.includes(game.id)?"♥ Đã yêu thích":"♡ Thêm yêu thích"}</button>
          </div>
        </div>
      </section>
      <section class="detail-grid">
        <div class="profile-section">
          <article class="content-card"><h2>Giới thiệu</h2><p>${escapeHTML(game.description)}</p><h3>Tính năng nổi bật</h3><ul class="feature-list">${game.features.map(f=>`<li>✓ ${escapeHTML(f)}</li>`).join("")}</ul></article>
          <article class="content-card"><h2>Đánh giá người chơi</h2><div class="dashboard-grid"><div class="stat-card"><small>Điểm đánh giá</small><strong>★ ${game.rating}</strong></div><div class="stat-card"><small>Lượt đánh giá</small><strong>${formatCoin(game.reviews)}</strong></div><div class="stat-card"><small>Mức độ đề xuất</small><strong>${Math.round(game.rating/5*100)}%</strong></div></div></article>
          <article class="content-card"><h2>Có thể bạn cũng thích</h2><div class="game-grid" style="grid-template-columns:repeat(3,1fr)">${games.filter(g=>g.id!==game.id).slice(0,3).map(gameCard).join("")}</div></article>
        </div>
        <aside class="profile-section"><article class="content-card"><h3>Thông tin game</h3><div class="requirement-list"><div><span>Nhà phát hành</span><b>${escapeHTML(game.studio)}</b></div><div><span>Ngày phát hành</span><b>${game.release}</b></div><div><span>Dung lượng</span><b>${game.size}</b></div><div><span>Nền tảng</span><b>${game.platform.join(", ")}</b></div></div></article>
        <article class="content-card"><h3>Cấu hình đề nghị</h3><div class="requirement-list">${Object.entries(game.requirements).map(([k,v])=>`<div><span>${({os:"Hệ điều hành",cpu:"CPU",ram:"RAM",gpu:"GPU",storage:"Dung lượng"})[k]}</span><b>${v}</b></div>`).join("")}</div></article></aside>
      </section>`;
    byId("buyGame")?.addEventListener("click",()=>purchaseGame(game));
    bindWishlist();
  }

  function renderLibrary() {
    const libraryGames = owned.map(getGame).filter(Boolean);
    const wishedGames = wishlist.map(getGame).filter(Boolean);
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Bộ sưu tập</span><h2>Thư viện của tôi</h2><p>Quản lý game đã sở hữu, gần đây và danh sách yêu thích.</p></div></div>
      ${!session ? `<div class="empty-state"><h3>Đăng nhập để đồng bộ thư viện</h3><p>Game của bạn sẽ xuất hiện trên mọi thiết bị.</p><a class="btn btn-primary" href="./auth.html">Đăng nhập</a></div>` : `
      <div class="library-tabs"><button class="active" data-library-tab="owned">Đã sở hữu (${libraryGames.length})</button><button data-library-tab="recent">Chơi gần đây (${recentlyPlayed.length})</button><button data-library-tab="wishlist">Yêu thích (${wishedGames.length})</button></div>
      <div id="libraryContent" class="game-grid"></div>`}`;
    if (!session) return;
    const showTab = (tab) => {
      let list = tab === "recent" ? recentlyPlayed.map(getGame).filter(Boolean) : tab === "wishlist" ? wishedGames : libraryGames;
      byId("libraryContent").innerHTML = list.length ? list.map(gameCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><h3>Chưa có game</h3><p>Khám phá kho game để bắt đầu bộ sưu tập.</p><a class="btn btn-primary" href="./catalog.html">Khám phá game</a></div>`;
      bindWishlist();
    };
    document.querySelectorAll("[data-library-tab]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("[data-library-tab]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");showTab(btn.dataset.libraryTab)}));
    const hashTab = location.hash === "#wishlist" ? "wishlist" : "owned";
    document.querySelector(`[data-library-tab="${hashTab}"]`)?.click();
  }

  function renderWallet() {
    const packs = [[500,"49.000đ"],[1200,"99.000đ"],[2600,"199.000đ"],[7000,"499.000đ"]];
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">LacViet Wallet</span><h2>Ví Lạc Coin</h2><p>Thanh toán game và nội dung số trong hệ sinh thái LacVietGames.</p></div></div>
      <section class="wallet-hero"><div class="wallet-balance"><small>Số dư khả dụng</small><strong>${formatCoin(wallet.balance)} <span>Lạc Coin</span></strong><p style="color:#d3daf0">1 Lạc Coin chỉ dùng trong nền tảng LacVietGames.</p></div><div class="wallet-mark">🪙</div></section>
      <section class="section"><div class="section-head"><div><h2>Nạp Lạc Coin</h2><p>Gói nạp bên dưới đang ở chế độ mô phỏng, chưa kết nối cổng thanh toán thật.</p></div></div><div class="coin-pack-grid">${packs.map(([coins,price])=>`<button class="coin-pack" data-pack="${coins}"><div class="coin-icon">🪙</div><strong>${formatCoin(coins)} LC</strong><small>${price}</small></button>`).join("")}</div></section>
      <section class="section content-card"><div class="section-head"><div><h2>Lịch sử giao dịch</h2></div></div><div class="transaction-list">${wallet.transactions.map(t=>`<div class="transaction"><div class="transaction-icon">${t.icon}</div><div><b>${escapeHTML(t.title)}</b><small>${escapeHTML(t.note)} · ${t.date}</small></div><b class="${t.amount>=0?"positive":"negative"}">${t.amount>=0?"+":""}${formatCoin(t.amount)} LC</b></div>`).join("")}</div></section>`;
    document.querySelectorAll("[data-pack]").forEach(btn=>btn.addEventListener("click",()=>{
      if (!session) { location.href="./auth.html"; return; }
      const amount=Number(btn.dataset.pack);
      showModal("Mô phỏng nạp tiền", `Gói ${formatCoin(amount)} Lạc Coin chưa được kết nối cổng thanh toán. Trong bản thương mại, bước này sẽ chuyển đến nhà cung cấp thanh toán an toàn.`);
    }));
  }

  function renderProfile() {
    if (!session) { byId("app").innerHTML=`<div class="empty-state"><h2>Bạn chưa đăng nhập</h2><p>Đăng nhập để xem hồ sơ, thành tích và ví Lạc Coin.</p><a class="btn btn-primary" href="./auth.html">Đăng nhập</a></div>`; return; }
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Player profile</span><h2>Trang cá nhân</h2></div><a class="btn btn-secondary" href="./edit-profile.html">✎ Chỉnh sửa hồ sơ</a></div>
      <div class="profile-layout">
        <aside class="profile-card"><div class="profile-avatar">${escapeHTML(profile.avatar)}</div><h2>${escapeHTML(profile.displayName)}</h2><p>@${escapeHTML(profile.username)}</p><span class="tag">Thành viên từ 2026</span><div class="level-bar"><span></span></div><small style="color:var(--muted)">Cấp 12 · 680/1000 XP</small><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px"><div class="stat-card"><small>Game</small><strong>${owned.length}</strong></div><div class="stat-card"><small>Thành tích</small><strong>18</strong></div></div><button id="logoutProfile" class="btn btn-ghost" style="width:100%;margin-top:18px">Đăng xuất</button></aside>
        <div class="profile-section">
          <div class="dashboard-grid"><div class="stat-card"><small>Số dư Lạc Coin</small><strong>${formatCoin(wallet.balance)}</strong></div><div class="stat-card"><small>Giờ chơi</small><strong>42.5h</strong></div><div class="stat-card"><small>Điểm thành tựu</small><strong>1,840</strong></div></div>
          <article class="content-card"><h2>Giới thiệu</h2><p>${escapeHTML(profile.bio)}</p><div class="requirement-list"><div><span>Email</span><b>${escapeHTML(profile.email)}</b></div><div><span>Khu vực</span><b>${escapeHTML(profile.location)}</b></div><div><span>Thể loại yêu thích</span><b>${escapeHTML(profile.favoriteGenre)}</b></div></div></article>
          <article class="content-card"><h2>Thành tích gần đây</h2><div class="achievement-grid"><div class="achievement"><span>🏆</span><div><b>Tân binh xuất sắc</b><small>Hoàn thành 5 game</small></div></div><div class="achievement"><span>⚡</span><div><b>Phản xạ ánh sáng</b><small>10.000 điểm arcade</small></div></div><div class="achievement"><span>🪙</span><div><b>Nhà sưu tầm</b><small>Sở hữu 5 game</small></div></div></div></article>
          <article class="content-card"><h2>Game đang chơi</h2><div class="game-grid" style="grid-template-columns:repeat(3,1fr)">${owned.map(getGame).filter(Boolean).slice(0,3).map(gameCard).join("")}</div></article>
        </div>
      </div>`;
    byId("logoutProfile").addEventListener("click",()=>{localStorage.removeItem("lacvietgamesSession");sessionStorage.removeItem("lacvietgamesSession");location.href="./index.html"});
    bindWishlist();
  }

  function renderEditProfile() {
    if (!session) { location.href="./auth.html"; return; }
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Account settings</span><h2>Chỉnh sửa thông tin cá nhân</h2><p>Cập nhật hồ sơ hiển thị trên LacVietGames.</p></div><a class="btn btn-secondary" href="./profile.html">← Quay lại hồ sơ</a></div>
      <div class="detail-grid">
        <form id="profileForm" class="content-card"><h2>Thông tin hồ sơ</h2><div class="form-grid">
          <div class="form-field"><label>Tên hiển thị</label><input id="displayName" value="${escapeHTML(profile.displayName)}" required maxlength="60"></div>
          <div class="form-field"><label>Tên người dùng</label><input id="username" value="${escapeHTML(profile.username)}" required maxlength="30"></div>
          <div class="form-field"><label>Email tài khoản</label><input value="${escapeHTML(profile.email)}" disabled></div>
          <div class="form-field"><label>Số điện thoại</label><input id="phone" value="${escapeHTML(profile.phone)}" placeholder="09xx xxx xxx"></div>
          <div class="form-field"><label>Ngày sinh</label><input id="birthday" type="date" value="${escapeHTML(profile.birthday)}"></div>
          <div class="form-field"><label>Khu vực</label><input id="location" value="${escapeHTML(profile.location)}"></div>
          <div class="form-field"><label>Thể loại yêu thích</label><select id="favoriteGenre">${["Casual","Hành động","Đua xe","Mô phỏng","Puzzle","Sinh tồn"].map(x=>`<option ${profile.favoriteGenre===x?"selected":""}>${x}</option>`).join("")}</select></div>
          <div class="form-field"><label>Ký tự đại diện</label><input id="avatar" value="${escapeHTML(profile.avatar)}" maxlength="2"></div>
          <div class="form-field full"><label>Giới thiệu</label><textarea id="bio" maxlength="240">${escapeHTML(profile.bio)}</textarea></div>
        </div><div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="btn btn-primary" type="submit">Lưu thay đổi</button></div></form>
        <aside class="profile-section"><form id="passwordForm" class="content-card"><h3>Đổi mật khẩu</h3><div class="form-field"><label>Mật khẩu hiện tại</label><input id="currentPassword" type="password" required></div><div class="form-field" style="margin-top:12px"><label>Mật khẩu mới</label><input id="newPassword" type="password" minlength="8" required></div><button class="btn btn-secondary" style="width:100%;margin-top:16px" type="submit">Cập nhật mật khẩu</button></form><article class="content-card"><h3>Bảo mật tài khoản</h3><p>Email đã xác minh. Không chia sẻ mật khẩu hoặc mã xác nhận cho bất kỳ ai.</p></article></aside>
      </div>`;
    byId("profileForm").addEventListener("submit",e=>{e.preventDefault();const updated={...profile,displayName:byId("displayName").value.trim(),username:byId("username").value.trim(),phone:byId("phone").value.trim(),birthday:byId("birthday").value,location:byId("location").value.trim(),favoriteGenre:byId("favoriteGenre").value,avatar:byId("avatar").value.trim()||"LV",bio:byId("bio").value.trim()};writeJSON("lacvietgamesProfile",updated);toast("Đã lưu thông tin hồ sơ");setTimeout(()=>location.href="./profile.html",700)});
    byId("passwordForm").addEventListener("submit",async e=>{e.preventDefault();const btn=e.currentTarget.querySelector("button");btn.disabled=true;try{const res=await fetch(`${apiBase}/api/Accounts/change-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accEmail:session.email,accPassword:byId("currentPassword").value,newPassword:byId("newPassword").value})});const data=await res.json();if(!res.ok||data.success===false)throw new Error(data.message||"Không đổi được mật khẩu");e.currentTarget.reset();toast(data.message||"Đổi mật khẩu thành công")}catch(err){toast(err.message)}finally{btn.disabled=false}});
  }

  function renderPlay() {
    const game = getGame(qs.get("id")) || games.find(g=>g.type==="web");
    if (game.type !== "web") { location.href=`./game.html?id=${game.id}`; return; }
    if (game.price > 0 && !isOwned(game.id)) { byId("app").innerHTML=`<div class="empty-state"><h2>Bạn chưa sở hữu ${escapeHTML(game.title)}</h2><p>Mua game để bắt đầu chơi.</p><a class="btn btn-primary" href="./game.html?id=${game.id}">Xem trang game</a></div>`; return; }
    if (!recentlyPlayed.includes(game.id)) { recentlyPlayed.unshift(game.id); writeJSON("lacvietgamesRecent",recentlyPlayed.slice(0,10)); }
    byId("app").innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Đang chơi</span><h2>${escapeHTML(game.title)}</h2><p>${escapeHTML(game.tagline)}</p></div><a class="btn btn-secondary" href="./game.html?id=${game.id}">Thông tin game</a></div>
      <div class="play-shell"><section class="game-stage" id="gameStage"><canvas id="arcadeCanvas"></canvas><div class="game-hud"><span class="hud-chip">Điểm: <b id="gameScore">0</b></span><span class="hud-chip">Kỷ lục: <b id="gameHighScore">${localStorage.getItem(`lvgHigh_${game.id}`)||0}</b></span></div></section>
      <aside class="play-sidebar"><article class="content-card"><h3>Cách chơi</h3><div class="control-list"><div class="control-row"><span>Di chuyển</span><span><span class="key">←</span> <span class="key">→</span></span></div><div class="control-row"><span>Bắt đầu / chơi lại</span><span class="key">Space</span></div><div class="control-row"><span>Tạm dừng</span><span class="key">P</span></div></div></article><article class="content-card"><h3>Mục tiêu</h3><p>Thu thập Lạc Coin màu vàng, tránh khối đỏ. Tốc độ tăng dần theo điểm số.</p><button id="startGame" class="btn btn-primary" style="width:100%">Bắt đầu chơi</button></article><article class="content-card"><h3>Lưu ý</h3><p>Điểm số hiện lưu trên thiết bị này. Bảng xếp hạng online sẽ kết nối khi API game được triển khai.</p></article></aside></div>`;
    initArcade(game.id);
  }

  function initArcade(gameId) {
    const canvas=byId("arcadeCanvas"), stage=byId("gameStage"), ctx=canvas.getContext("2d");
    let running=false,paused=false,last=0,score=0,player={x:.5,y:.86,w:44,h:44},items=[],keys={};
    const resize=()=>{const r=stage.getBoundingClientRect();canvas.width=Math.max(600,Math.floor(r.width*devicePixelRatio));canvas.height=Math.max(480,Math.floor(r.height*devicePixelRatio));ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)};resize();addEventListener("resize",resize);
    const spawn=()=>items.push({x:Math.random()*(stage.clientWidth-36)+18,y:-30,size:22+Math.random()*12,speed:170+score*1.5,type:Math.random()<.72?"coin":"hazard"});
    const reset=()=>{score=0;items=[];player.x=stage.clientWidth/2;running=true;paused=false;byId("gameScore").textContent=0};
    const end=()=>{running=false;const high=Math.max(score,Number(localStorage.getItem(`lvgHigh_${gameId}`)||0));localStorage.setItem(`lvgHigh_${gameId}`,high);byId("gameHighScore").textContent=high;showModal("Kết thúc lượt chơi",`Bạn đạt ${score} điểm. Nhấn Space hoặc nút Bắt đầu để chơi lại.`)};
    let spawnTimer=0;
    const loop=(time)=>{const dt=Math.min(.033,(time-last)/1000||0);last=time;ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);const grad=ctx.createLinearGradient(0,0,0,stage.clientHeight);grad.addColorStop(0,"#11183a");grad.addColorStop(1,"#070a13");ctx.fillStyle=grad;ctx.fillRect(0,0,stage.clientWidth,stage.clientHeight);for(let i=0;i<40;i++){ctx.fillStyle=`rgba(255,255,255,${.08+(i%5)*.02})`;ctx.fillRect((i*83)%stage.clientWidth,(i*47+time*.02)%stage.clientHeight,2,2)}if(running&&!paused){const speed=320;if(keys.ArrowLeft||keys.a)player.x-=speed*dt;if(keys.ArrowRight||keys.d)player.x+=speed*dt;player.x=Math.max(8,Math.min(stage.clientWidth-player.w-8,player.x));spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=Math.max(.28,.75-score*.004)}items.forEach(it=>it.y+=it.speed*dt);for(let i=items.length-1;i>=0;i--){const it=items[i],hit=it.x<player.x+player.w&&it.x+it.size>player.x&&it.y<player.y*stage.clientHeight+player.h&&it.y+it.size>player.y*stage.clientHeight;if(hit){if(it.type==="coin"){score+=10;byId("gameScore").textContent=score;items.splice(i,1)}else{end();items.splice(i,1)}}else if(it.y>stage.clientHeight+40)items.splice(i,1)}}items.forEach(it=>{ctx.font=`${it.size}px sans-serif`;ctx.fillText(it.type==="coin"?"🪙":"🟥",it.x,it.y)});ctx.fillStyle="#7c5cff";ctx.shadowColor="#7c5cff";ctx.shadowBlur=20;ctx.fillRect(player.x,player.y*stage.clientHeight,player.w,player.h);ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.fillRect(player.x+10,player.y*stage.clientHeight+9,7,7);ctx.fillRect(player.x+28,player.y*stage.clientHeight+9,7,7);if(!running){ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(0,0,stage.clientWidth,stage.clientHeight);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="700 26px Be Vietnam Pro";ctx.fillText("Nhấn Space để bắt đầu",stage.clientWidth/2,stage.clientHeight/2);ctx.textAlign="start"}requestAnimationFrame(loop)};requestAnimationFrame(loop);
    addEventListener("keydown",e=>{keys[e.key]=true;if(e.code==="Space"&&!running){e.preventDefault();reset()}if(e.key.toLowerCase()==="p"&&running)paused=!paused});addEventListener("keyup",e=>keys[e.key]=false);byId("startGame").addEventListener("click",reset);
  }

  renderHeader(); renderFooter();
  ({home:renderHome,catalog:renderCatalog,game:renderGameDetail,library:renderLibrary,wallet:renderWallet,profile:renderProfile,editProfile:renderEditProfile,play:renderPlay}[page] || renderHome)();
})();
