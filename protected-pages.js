(() => {
  const PROTECTED_PAGES = new Set([
    "library",
    "wallet",
    "play",
    "profile",
    "editProfile",
    "publisher",
    "admin"
  ]);

  const page = document.body?.dataset?.page || "";
  const isProtectedPage = PROTECTED_PAGES.has(page);

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

  // Quan trọng: chỉ reload khi trang được mở LÚC CHƯA đăng nhập rồi người dùng
  // đăng nhập thành công ngay trên chính trang đó. Nếu đã có session từ lúc boot,
  // /api/store/me hydrate bình thường sẽ KHÔNG gây reload vòng lặp.
  const hadSessionAtBoot = !!readSession()?.token;
  let reloadingAfterLogin = false;

  function refreshProtectedPageAfterLogin() {
    if (!isProtectedPage || hadSessionAtBoot || reloadingAfterLogin) return;
    if (!readSession()?.token) return;
    reloadingAfterLogin = true;
    location.reload();
  }

  // store-session.js gọi hydrateServerUi() ngay sau khi login; config.js phát event
  // này khi /api/store/me trả thành công. Không polling và không tạo request mới.
  window.addEventListener("lvg:session-hydrated", refreshProtectedPageAfterLogin);
  window.addEventListener("lvg:login-success", refreshProtectedPageAfterLogin);

  // Đồng bộ trường hợp đăng nhập từ tab khác.
  window.addEventListener("storage", event => {
    if (event.key === "lacvietgamesStoreSession" && event.newValue) {
      refreshProtectedPageAfterLogin();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const session = readSession();

    if (!session?.token) {
      const loginLink = document.querySelector('.header-actions a[href="./auth.html"]');
      if (loginLink) {
        loginLink.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
      }
    }

    // store.js xử lý Library/Profile; publisher.js và admin.js xử lý portal riêng.
    // Guard này chỉ dựng trạng thái khóa cơ bản cho Play/Wallet trước khi controller
    // chuyên biệt render, tránh lộ nội dung khi chưa có session.
    if (!session?.token && ["play", "wallet"].includes(page)) {
      const app = document.getElementById("app");
      if (app) {
        app.innerHTML = `
          <div class="empty-state">
            <h2>${page === "play" ? "Đăng nhập để chơi game" : "Đăng nhập để mở ví Lạc Coin"}</h2>
            <p>Dữ liệu game, thư viện và số dư được bảo vệ theo tài khoản của bạn.</p>
            <button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập / Đăng ký</button>
          </div>`;
      }
    }
  });
})();
