# LacVietGames Web

Cổng game thương mại của LacVietGames, triển khai bằng GitHub Pages và kết nối API ASP.NET Core trên Railway.

## Trang chính

- `index.html`: trang chủ cửa hàng game
- `catalog.html`: tìm kiếm, lọc và sắp xếp game
- `game.html?id=<game-id>`: trang thông tin chi tiết từng game
- `play.html?id=<game-id>`: trang chơi web game
- `library.html`: thư viện, game gần đây và danh sách yêu thích
- `wallet.html`: ví Lạc Coin và lịch sử giao dịch
- `profile.html`: trang cá nhân, thống kê và thành tích
- `edit-profile.html`: chỉnh sửa hồ sơ và đổi mật khẩu
- `auth.html`: đăng nhập, đăng ký và khôi phục mật khẩu
- `verify.html`: xác minh email trước khi tạo tài khoản
- `success.html`: hoàn tất đăng ký

## Hệ thống hiện tại

- Frontend: GitHub Pages
- Backend tài khoản: `https://lacvietgames-api-production.up.railway.app`
- Email giao dịch: Brevo HTTP API
- Đăng ký chỉ ghi tài khoản vào database sau khi mã email chính xác
- Đăng nhập, quên mật khẩu, đặt lại mật khẩu và đổi mật khẩu dùng API thật
- Dữ liệu catalog được quản lý trong `games.js`

## Trạng thái thương mại

Giao diện, luồng mua game, thư viện, yêu thích, hồ sơ và ví Lạc Coin đã được dựng hoàn chỉnh ở frontend. Hiện các phần ví, giao dịch, game đã sở hữu và hồ sơ mở rộng lưu bằng `localStorage` để phục vụ trình diễn.

Trước khi nhận thanh toán thật cần triển khai thêm:

1. JWT/refresh token và phân quyền người dùng.
2. API game, thư viện, wishlist, hồ sơ và ví Lạc Coin.
3. Cổng thanh toán có webhook xác minh giao dịch.
4. Lưu file game trên object storage/CDN và dùng URL tải có chữ ký.
5. Trang quản trị game, đơn hàng, người dùng và hoàn tiền.
6. Điều khoản, chính sách bảo mật và quy trình hỗ trợ khách hàng.

## GitHub Pages

Vào **Settings → Pages → Source → GitHub Actions**.

Website: `https://dev-giaphu.github.io/lacvietgames-web/`
