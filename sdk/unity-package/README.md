# LacVietGames WebGL SDK

## Cài đặt không cần viết code mạng

1. Sau khi Admin duyệt tích hợp, Publisher Center hiển thị **Integration ID** và **Unity Package Git URL**.
2. Unity → **Window → Package Manager → + → Add package from git URL...**.
3. Dán URL package.
4. Unity → **Tools → LacVietGames → Setup**.
5. Dán Integration ID dạng `lvg_int_...` và bấm **Setup SDK in Current Scene**.

Integration ID là định danh công khai, không phải secret. Package không chứa mật khẩu, bearer token, R2 key hay Game Server Key.

## Gắn UI bằng Inspector

Unity Button có thể gọi trực tiếp các method của `LacVietGamesBridge`:

- `RequestLogin()`
- `RefreshWallet()`
- `GameplayStarted()`
- `GameplayEnded()`
- `ReturnToLacVietGames()`
- `ClaimReward(string eventKey)` — chỉ dùng khi Admin đã cấp **Client reward nhỏ**.

PlayTime reward được LacVietGames server tính thời gian. Không truyền phút chơi hoặc số coin từ Unity.

## ServerVerified

Nếu Admin bật `ServerVerified`, game có thể gọi `RequestGameIdentityToken()`. Identity Token không có quyền cộng coin. Nó phải được gửi tới backend tin cậy của game; backend đó xác minh kết quả thật rồi mới gọi LacVietGames ServerVerified API bằng Game Server Key lưu trong secret manager/server environment.

Không bao giờ đặt Game Server Key trong Unity/WebGL.
