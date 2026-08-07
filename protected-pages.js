document.addEventListener("DOMContentLoaded", () => {
  let session = null;
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem("lacvietgamesStoreSession");
      if (raw) { session = JSON.parse(raw); break; }
    } catch {}
  }

  if (!session?.token) {
    const loginLink = document.querySelector('.header-actions a[href="./auth.html"]');
    if (loginLink) loginLink.outerHTML = '<button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập</button>';
  }

  const page = document.body.dataset.page;
  if (!session?.token && ["play", "wallet"].includes(page)) {
    const app = document.getElementById("app");
    if (app) app.innerHTML = `
      <div class="empty-state">
        <h2>${page === "play" ? "Đăng nhập để chơi game" : "Đăng nhập để mở ví Lạc Coin"}</h2>
        <p>Dữ liệu game, thư viện và số dư được xác nhận bởi server. Bạn chưa có ví Lạc Coin khi chưa đăng nhập.</p>
        <button class="btn btn-primary" type="button" data-open-server-auth>Đăng nhập / Đăng ký</button>
      </div>`;
  }
});
