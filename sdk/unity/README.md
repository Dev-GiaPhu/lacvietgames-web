# LacVietGames Unity WebGL SDK

SDK dùng tài khoản LacVietGames, ví Lạc Coin server-side, gameplay session, PlayTime reward, ClientCapped reward và ServerVerified reward.

## Cài vào Unity

Copy:

- `LacVietGamesBridge.cs` -> `Assets/Scripts/LacVietGames/`
- `LacVietGamesExampleUsage.cs` -> file ví dụ
- `Plugins/WebGL/LacVietGamesBridge.jslib` -> `Assets/Plugins/WebGL/LacVietGamesBridge.jslib`

Tạo một GameObject `LacVietGames`, attach `LacVietGamesBridge`. Bridge tự `DontDestroyOnLoad`.

## Account và ví

```csharp
LacVietGamesBridge.Instance.RequestLogin();
LacVietGamesBridge.Instance.RefreshWallet();
```

Unity chỉ nhận accountId, displayName, email và coinBalance để hiển thị. Bearer token chính không được trả cho Unity. Số dư thật luôn nằm trong database server; không dùng PlayerPrefs làm nguồn Lạc Coin.

## Gameplay session

```csharp
LacVietGamesBridge.Instance.GameplayStarted(); // khi gameplay thật bắt đầu
LacVietGamesBridge.Instance.GameplayEnded();   // khi run/match kết thúc
```

Server ghi thời gian, lease/checkpoint và trạng thái session. Unity không gửi playedMinutes.

## Ba chế độ reward

### 1. ServerTime — dùng cho PlayTime

Admin tạo rule `PlayTime`. LacVietGames tự đo thời gian server và tự cấp reward khi đủ mốc. Unity không cần gọi `ClaimReward`.

Ví dụ: chơi 10 phút -> 20 LC. Người chơi chỉnh clock/client code không thể biến thành 10 phút vì duration không lấy từ Unity.

### 2. ClientCapped — chỉ dùng reward nhỏ trong game WebGL không có backend riêng

Unity gọi:

```csharp
LacVietGamesBridge.Instance.ClaimReward("quest_daily_1");
```

Unity KHÔNG truyền số coin. Server quyết định reward, min play, cooldown, max/session, max/day, max/account và Daily Coin Cap.

Vì WebGL client-only không thể chứng minh mật mã rằng một event như `win` thật sự xảy ra, LacVietGames khóa ClientCapped ở server:

- tối đa 50 LC/lần
- tối đa 10 lần/ngày/rule
- tối đa 5 lần/session
- tối đa 500 LC/ngày/rule
- tối thiểu 30 giây server play time

Dùng ClientCapped cho quest nhỏ/casual, không dùng cho reward thắng trận có giá trị cao.

### 3. ServerVerified — dùng cho `win`, competitive, leaderboard, reward có giá trị

**Không gọi `ClaimReward("win")` cho rule này.** Client endpoint không thể truy cập ServerVerified rule.

Unity xin identity token ngắn hạn:

```csharp
LacVietGamesBridge.Instance.GameIdentityReceived += identity =>
{
    // Gửi identity.identityToken + matchId tới BACKEND game của bạn qua HTTPS.
};

LacVietGamesBridge.Instance.RequestGameIdentityToken();
```

Identity token chỉ ràng buộc:

- account
- game
- play session
- thời hạn khoảng 10 phút

Nó không chứa account bearer token và **không phải bằng chứng thắng**.

Backend game của developer phải tự xác minh match/result. Sau khi xác minh thật sự thắng, backend game gọi LacVietGames:

```http
POST /api/store/game-sdk/server/rewards/claim
X-LVG-Game-Key: lvg_sk_...
Content-Type: application/json
```

```json
{
  "identityToken": "<token Unity gửi tới backend game>",
  "eventKey": "win",
  "externalEventId": "match-unique-id-123"
}
```

`externalEventId` phải duy nhất cho kết quả/match. LacVietGames hash nó thành receipt idempotent: backend retry do timeout/mất mạng vẫn chỉ trả đúng một reward.

## Game Server Key

Admin tạo key trong **Admin -> Reward Lạc Coin -> Game Server Keys**.

Key bí mật chỉ hiển thị đúng một lần. Lưu trong environment/secret manager của backend game, ví dụ:

```text
LVG_GAME_SERVER_KEY=lvg_sk_...
```

**Cấm:**

- đặt key trong Unity
- đặt key trong `.jslib`
- đặt key trong WebGL JavaScript
- commit key lên GitHub
- gửi key cho client

Nếu key lộ, Admin bấm **Thu hồi key** và tạo key mới. Key cũ bị vô hiệu ngay.

## Reward transaction và chống mất thưởng

Mỗi reward có receipt/idempotency. Các thao tác sau nằm trong cùng database transaction:

1. tạo `game_reward_claims`
2. cộng `accounts.coin_balance`
3. ghi `store_transactions`

Nếu request timeout sau khi server đã commit, host/backend retry với cùng request id/external event id. Server trả receipt cũ, không cộng lần hai. Nếu transaction lỗi trước commit thì không bước nào được ghi. Vì vậy tránh cả double-credit lẫn trường hợp coin đã cộng mà không có ledger.

## Anti-abuse / hack alerts

Server ghi `game_reward_attempts` và tạo `security_incidents` cho tín hiệu đáng ngờ như:

- sai play-session token
- session/account mismatch
- event không tồn tại
- claim quá sớm
- reward request flood
- Game Server Key sai/revoked
- identity token sai/hết hạn
- server key của game A dùng với identity game B

Raw IP/User-Agent không được lưu trong incident; hệ thống dùng fingerprint HMAC server-side. High/Critical incident gửi notification cho Admin và xuất hiện trong **Admin -> Bảo mật & Ban**.

## Ban người dùng

Admin có thể:

- ban theo phút/giờ/ngày
- ban vĩnh viễn
- ghi lý do
- gỡ ban

Khi ban, server:

- tăng `session_version` để thu hồi session hiện tại
- đóng play session đang chạy
- chặn authenticated Store API
- chặn ServerVerified reward
- lưu audit log

Admin account không thể bị ban từ UI quản lý user này.

## Admin Reward Rules

Admin có thể cấu hình:

- Game
- Event Key
- Trigger Type
- Verification Mode: ServerTime / ClientCapped / ServerVerified
- Reward Coin
- Min Play Time
- Cooldown
- Max / Session
- Max / Day
- Max / Account
- Daily Coin Cap
- Start / End Date
- Active

Rule đã từng phát tiền không bị hard-delete; khi Admin xóa, server chỉ disable để giữ monetary audit trail.

## Security boundary cần hiểu

Không có cách làm cho WebGL client-only trở thành authoritative chỉ bằng obfuscation. Người chơi sở hữu trình duyệt và có thể quan sát/mô phỏng client code. Vì vậy LacVietGames không dùng bí mật nằm trong Unity để bảo vệ tiền.

Kiến trúc an toàn là:

```text
Client-only nhỏ        -> ClientCapped + server caps
PlayTime               -> ServerTime
Win / competitive      -> developer authoritative backend -> ServerVerified -> LacVietGames wallet
```

Với ServerVerified, người chơi dù đăng nhập và tự gọi `ClaimReward("win")`/Postman vào client reward endpoint cũng không chạm được rule `win`, vì rule được lưu thành server-only trigger và chỉ endpoint có Game Server Key mới đọc/chi trả nó.
