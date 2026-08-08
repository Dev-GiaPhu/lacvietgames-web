# LacVietGames WebGL SDK

## Hướng dẫn đầy đủ

https://dev-giaphu.github.io/lacvietgames-web/sdk-guide.html

## Cài đặt nhanh

1. Sau khi Admin duyệt tích hợp, Publisher Center hiển thị **Integration ID** và **Unity Package Git URL**.
2. Unity → **Window → Package Manager → + → Add package from git URL...**.
3. Dán URL package.
4. Mở scene khởi động đầu tiên của game.
5. Unity → **Tools → LacVietGames → Setup**.
6. Dán Integration ID dạng `lvg_int_...`, chọn đúng cấu trúc game và bấm **Setup SDK in Current Scene**.

Chỉ Setup một scene. Object `LacVietGames` dùng `DontDestroyOnLoad` và sống xuyên các scene còn lại.

## Tài khoản người chơi tự đồng bộ từ website

Không cần tạo form Email/Mật khẩu và không cần gọi `RequestLogin()` trong luồng bình thường.

Khi WebGL chạy từ LacVietGames:

- Nếu người chơi đã đăng nhập website, SDK tự nhận account và ví.
- Nếu người chơi chưa đăng nhập, website LacVietGames tự mở bảng đăng nhập.
- Sau khi đăng nhập thành công, Unity tự nhận `AccountId`, `DisplayName` và `CoinBalance`.
- Unity không nhận password hoặc bearer token.

`RequestLogin()` vẫn được giữ làm fallback nếu game muốn có nút đăng nhập thủ công riêng.

## Gameplay

Game có Boot/Main Menu:

```csharp
LacVietGamesBridge.Instance.GameplayStarted();
```

gọi khi người chơi thực sự bắt đầu chơi, và:

```csharp
LacVietGamesBridge.Instance.GameplayEnded();
```

gọi khi trận kết thúc/quay lại menu.

Nếu game mở thẳng vào gameplay, chọn tùy chọn đó trong Setup Wizard; SDK tự bật Auto Start Gameplay.

PlayTime reward được LacVietGames server tính thời gian. Không truyền phút chơi hoặc số coin từ Unity.

## Reward nhỏ

Có thể dùng `LacVietGamesRewardTrigger` trong Inspector hoặc:

```csharp
LacVietGamesBridge.Instance.ClaimReward("quest_complete");
```

Unity chỉ gửi Event Key. Số Lạc Coin, cooldown và giới hạn do server/Admin quyết định.

## ServerVerified

Nếu Admin bật `ServerVerified`, game có thể gọi `RequestGameIdentityToken()`. Identity Token không có quyền cộng coin. Nó phải được gửi tới backend tin cậy của game; backend đó xác minh kết quả thật rồi mới gọi LacVietGames ServerVerified API bằng Game Server Key lưu trong secret manager/server environment.

Không bao giờ đặt Game Server Key, R2 key, bearer token hoặc password trong Unity/WebGL.
