# LacVietGames Unity WebGL SDK

SDK này cho game Unity WebGL dùng tài khoản LacVietGames, hiển thị ví Lạc Coin, gửi gameplay START/END và yêu cầu server reward.

## 1. Copy 3 file vào Unity

- `LacVietGamesBridge.cs` -> `Assets/Scripts/LacVietGames/`
- `LacVietGamesExampleUsage.cs` -> `Assets/Scripts/LacVietGames/` (file ví dụ, có thể xóa sau khi tích hợp)
- `Plugins/WebGL/LacVietGamesBridge.jslib` -> **đúng** đường dẫn `Assets/Plugins/WebGL/LacVietGamesBridge.jslib`

Tạo một GameObject tên `LacVietGames` ở scene đầu tiên và attach `LacVietGamesBridge`.

Bridge tự `DontDestroyOnLoad`, vì vậy chỉ cần một object cho toàn game.

## 2. Đăng nhập tài khoản trong game

Nút Đăng nhập của game gọi:

```csharp
LacVietGamesBridge.Instance.RequestLogin();
```

Nếu người chơi chưa đăng nhập, LacVietGames mở form đăng nhập bên ngoài iframe game. Sau khi đăng nhập, Unity nhận **chỉ**:

- accountId
- displayName
- email
- coinBalance

Unity **không nhận bearer token, mật khẩu, R2 key hoặc server secret**.

Đọc trạng thái hiện tại:

```csharp
var sdk = LacVietGamesBridge.Instance;
Debug.Log(sdk.IsLoggedIn);
Debug.Log(sdk.DisplayName);
Debug.Log(sdk.CoinBalance);
```

Lắng nghe tài khoản/ví:

```csharp
private void Start()
{
    var sdk = LacVietGamesBridge.Instance;
    sdk.Authenticated += account =>
    {
        playerNameText.text = account.displayName;
        walletText.text = account.coinBalance.ToString("N0") + " LC";
    };

    sdk.WalletUpdated += balance =>
    {
        walletText.text = balance.ToString("N0") + " LC";
    };
}
```

Lấy lại số dư thật từ server:

```csharp
LacVietGamesBridge.Instance.RefreshWallet();
```

Không lưu số dư game economy vào PlayerPrefs để làm nguồn dữ liệu chính. `CoinBalance` trong Unity chỉ là bản hiển thị của số dư server.

## 3. START / END gameplay

Nếu game có Main Menu, để `Auto Start Gameplay = false`.

Khi bấm Play và gameplay thật sự bắt đầu:

```csharp
LacVietGamesBridge.Instance.GameplayStarted();
```

Khi run/match kết thúc hoặc trở về menu trong game:

```csharp
LacVietGamesBridge.Instance.GameplayEnded();
```

Nếu game mở thẳng vào gameplay, có thể bật `Auto Start Gameplay` trên Inspector.

Khi muốn thoát iframe và quay về trang game LacVietGames:

```csharp
LacVietGamesBridge.Instance.ReturnToLacVietGames();
```

## 4. Reward khi thắng / hoàn thành nhiệm vụ

Trong Unity **không truyền số coin**.

Đúng:

```csharp
LacVietGamesBridge.Instance.ClaimReward("win");
```

hoặc:

```csharp
LacVietGamesBridge.Instance.ClaimReward("quest_daily_1");
```

Không có API kiểu này:

```csharp
// KHÔNG TỒN TẠI
AddCoin(20);
Reward(999999);
```

Server có rule riêng cho từng game. Ví dụ server cấu hình:

```text
Event key: win
Reward: 20 LC
Minimum play time: 60 giây
Cooldown: 30 giây
Maximum / session: 5
Maximum / day: 20
```

Game chỉ biết báo `win`. Backend kiểm tra account, game, play-session, session token, server time, cooldown, giới hạn phiên/ngày rồi mới cộng 20 LC vào database.

Nhận kết quả:

```csharp
LacVietGamesBridge.Instance.RewardCompleted += reward =>
{
    if (!reward.success)
    {
        Debug.LogWarning(reward.code + ": " + reward.message);
        return;
    }

    Debug.Log($"+{reward.rewardCoin} LC");
    Debug.Log($"Wallet = {reward.coinBalance} LC");
};
```

## 5. Reward theo thời gian chơi

Không cần Unity tự tính phút chơi.

Admin tạo rule server có:

```text
Trigger type: PlayTime
Event key: play_10_minutes
Reward: 20 LC
Minimum play time: 600 giây
```

Trang LacVietGames tự kiểm tra định kỳ. Khi server xác nhận phiên đã chơi đủ 600 giây, server tự cộng reward và Unity nhận `RewardCompleted` để có thể hiện popup `+20 Lạc Coin`.

Tắt tab, mất mạng, crash hoặc chỉnh đồng hồ client không làm server tin thời gian Unity gửi vì Unity không gửi duration.

## 6. Server reward rules

Reward economy chỉ Admin được thay đổi.

Backend hiện có:

```text
GET    /api/store/admin/game-rewards
GET    /api/store/admin/game-rewards/games
POST   /api/store/admin/game-rewards
PUT    /api/store/admin/game-rewards/{id}
POST   /api/store/admin/game-rewards/{id}/toggle
DELETE /api/store/admin/game-rewards/{id}
```

Body tạo một reward thắng game 20 LC:

```json
{
  "gameId": 1,
  "eventKey": "win",
  "title": "Thắng một ván",
  "triggerType": "Event",
  "rewardCoin": 20,
  "minPlaySeconds": 60,
  "cooldownSeconds": 30,
  "maxPerSession": 5,
  "maxPerDay": 20,
  "isActive": true
}
```

Reward chơi đủ 10 phút:

```json
{
  "gameId": 1,
  "eventKey": "play_10_minutes",
  "title": "Chơi đủ 10 phút",
  "triggerType": "PlayTime",
  "rewardCoin": 20,
  "minPlaySeconds": 600,
  "cooldownSeconds": 0,
  "maxPerSession": 1,
  "maxPerDay": 1,
  "isActive": true
}
```

## 7. Bảo mật chống người chơi tự gọi Reward

LacVietGames hiện bảo vệ các lớp sau:

- Bearer token chính không nằm trong Unity build.
- Play-session client token cũng không được đưa vào Unity.
- Unity không được quyết định số coin.
- Reward rule nằm trong database backend.
- Reward bắt buộc gắn đúng account + đúng game + active play-session.
- Play-session hết lease/stale bị từ chối.
- Server tự tính thời gian từ `started_at`.
- Mỗi reward có minimum play time.
- Có cooldown.
- Có maximum claims / session.
- Có maximum claims / ngày.
- Mỗi request có idempotency key phía host để tránh retry mạng cộng trùng.
- Cộng coin + reward claim + transaction được xử lý server-side trong transaction database.

### Giới hạn cần hiểu

Với game WebGL client-only, không có cách mật mã nào chứng minh tuyệt đối rằng người chơi **thật sự thắng** nếu toàn bộ logic thắng/thua nằm trên máy người chơi. Người dùng có DevTools vẫn có thể cố phát tín hiệu `win`.

Các rule `minPlaySeconds`, cooldown và claim limits ngăn việc spam/mint coin tùy ý, nhưng reward có giá trị lớn hoặc game cạnh tranh nên dùng game server authoritative: game server xác nhận match result rồi backend LacVietGames mới cấp reward.

Đối với casual game và reward nhỏ, mô hình hiện tại phù hợp: client báo sự kiện, server quyết định tiền và giới hạn.

## 8. Flow thực tế

```text
Unity GameplayStarted()
        ↓
LacVietGames parent
        ↓
Backend tạo play session
        ↓
Unity ClaimReward("win")
        ↓
Parent thêm account + play-session bí mật
        ↓
Backend kiểm tra rule + thời gian + cooldown + limit
        ↓
Database cộng Lạc Coin + transaction log
        ↓
Unity nhận RewardCompleted
        ↓
UI cập nhật ví / popup reward
```

Không đặt API secret hoặc private signing key trong Unity/WebGL build.