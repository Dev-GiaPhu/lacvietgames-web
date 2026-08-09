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
  const REFRESH_AFTER_EXPLICIT_LOGIN = new Set(["library", "play", "profile", "editProfile", "publisher"]);
  const page = document.body?.dataset?.page || "";
  const isProtectedPage = PROTECTED_PAGES.has(page);
  let explicitLoginRefreshStarted = false;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    try {
      const raw = sessionStorage.getItem("lacvietgamesStoreSession");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Chỉ làm mới đúng một lần sau thao tác đăng nhập chủ động trên các trang mà renderer
  // cũ cần dựng lại nội dung. Không reload theo /me hydrate, 401, storage event hoặc timer.
  function refreshAfterExplicitLogin() {
    if (!isProtectedPage || !REFRESH_AFTER_EXPLICIT_LOGIN.has(page) || explicitLoginRefreshStarted) return;
    if (!readSession()?.token) return;
    explicitLoginRefreshStarted = true;
    setTimeout(() => location.replace(location.href), 80);
  }

  window.addEventListener("lvg:login-success", refreshAfterExplicitLogin, { once:true });

  document.addEventListener("DOMContentLoaded", () => {
    const session = readSession();

    if (!session?.token) {
      const loginLink = document.querySelector('.header-actions a[href="./auth.html"]');
      if (loginLink) {
        loginLink.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
      }
    }

    // Wallet có renderer riêng và tự cập nhật sau lvg:session-hydrated, không reload trang.
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