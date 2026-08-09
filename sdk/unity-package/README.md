# LacVietGames Unity SDK 1.1

## Hai cơ chế phần thưởng cùng tồn tại

LacVietGames hỗ trợ song song hai cách phát phần thưởng:

### 1. Platform Auto Reward — mặc định, không cần sửa game

Dùng cho các điều kiện mà LacVietGames tự xác minh được, trước mắt là thời gian chơi được chốt từ `game_play_sessions`.

- Publisher không cần gọi API reward.
- Game không biết số Lạc Coin được thưởng.
- LacVietGames Admin tạo chiến dịch, chọn game, mốc thời gian và số Lạc Coin.
- Server tự cộng tiến độ khi play session kết thúc hoặc bị chốt do hết lease.
- Khi đủ điều kiện, server tự ghi transaction, notification và cộng Lạc Coin đúng một lần.
- Client không thể gửi `totalPlayTime` hoặc tự chọn số coin.

Cơ chế này là lựa chọn mặc định cho nhiệm vụ có Lạc Coin vì Publisher/Unity không nằm trong trust boundary của ví.

### 2. SDK / ServerVerified Reward — giữ nguyên cho tích hợp nâng cao

Dùng khi reward phụ thuộc dữ liệu nội bộ gameplay như win, boss, level, achievement hoặc tournament.

```csharp
LVG.Rewards.Claim("quest_daily_1");
LVG.Rewards.Completed += reward => { };
```

Event key không chứa số coin. Reward amount và limits do backend LacVietGames quyết định. `ClientCapped` chỉ dành cho reward nhỏ/casual. Reward giá trị cao nên dùng `ServerVerified` với backend game tin cậy.

Hai cơ chế dùng song song; thêm Platform Auto Reward không xóa hoặc thay đổi API SDK hiện có.

## Cài đặt

Unity Package Manager → **Add package from git URL**:

```text
https://github.com/Dev-GiaPhu/lacvietgames-web.git?path=/sdk/unity-package#main
```

Sau đó mở `Tools > LacVietGames > Setup`, dán Integration ID của đúng game và chạy Setup.

## API nhanh

### Account

```csharp
LVG.Account.Login();
bool loggedIn = LVG.Account.IsLoggedIn;
int accountId = LVG.Account.Id;
string displayName = LVG.Account.DisplayName;
LVG.Account.Updated += account => { };
```

Game production không nhận mật khẩu hoặc bearer token của website.

### Wallet

```csharp
LVG.Wallet.Refresh();
long balance = LVG.Wallet.Balance;
LVG.Wallet.BalanceChanged += balance => { };

LVG.Wallet.RefreshTransactions(30);
LvgGameTransaction[] transactions = LVG.Wallet.Transactions;
LVG.Wallet.TransactionsUpdated += items => { };
```

`RefreshTransactions` chỉ trả các giao dịch thuộc đúng account + game hiện tại. SDK không có `AddCoin`, `SetBalance` hoặc API cho client tự chọn số Lạc Coin.

### Playtime

```csharp
LVG.Playtime.Start();
LVG.Playtime.End();

LVG.Playtime.Refresh();
long totalSeconds = LVG.Playtime.TotalSeconds;
DateTime? firstPlay = LVG.Playtime.FirstPlayedAtUtc;
DateTime? currentStart = LVG.Playtime.CurrentSessionStartedAtUtc;
DateTime? lastStart = LVG.Playtime.LastSessionStartedAtUtc;
DateTime? lastExit = LVG.Playtime.LastExitAtUtc;
int lastDuration = LVG.Playtime.LastSessionDurationSeconds;

LVG.Playtime.RefreshSessions(20);
LvgPlaySessionInfo[] history = LVG.Playtime.Sessions;
```

Thời gian server là nguồn dữ liệu thật. Unity không gửi `totalPlayTime` tự khai báo. Platform Auto Reward cũng sử dụng nguồn thời gian này.

### Entitlement

```csharp
LVG.Entitlement.Refresh();
bool owned = LVG.Entitlement.IsOwned;
LVG.Entitlement.Updated += value => { };
```

### Game Stats

Stat được cấu hình riêng cho từng game bởi LacVietGames Admin.

```csharp
LVG.Stats.Refresh();
LVG.Stats.Updated += stats => { };

LVG.Stats.Submit("high_score", 128500);
LVG.Stats.Submitted += result => { };
```

`ClientCapped` được backend kiểm tra active play session, request ID chống gửi trùng, khoảng giá trị, max delta, cooldown và aggregation. Điểm competitive/có giải thưởng không nên dùng ClientCapped làm nguồn xác minh cuối cùng.

### Leaderboards

```csharp
LVG.Leaderboards.Get("high_score", 50);
LVG.Leaderboards.GetAroundMe("high_score", 5);

LVG.Leaderboards.Updated += board =>
{
    foreach (var row in board.entries)
        Debug.Log($"#{row.rank} {row.displayName}: {row.score}");
};

LVG.Leaderboards.Submit("high_score", 128500);
```

Leaderboard có thể lấy từ:

- `GameStat`: stat riêng của game.
- `PlayTimeTotal`: tổng thời gian đã được server chốt, client không gửi score.

Leaderboard chỉ xuất `DisplayName` và `playerId` giả danh riêng theo game. Không xuất email, số dư ví, credential hoặc account ID toàn cục.

### Rewards

```csharp
LVG.Rewards.Claim("quest_daily_1");
LVG.Rewards.Completed += reward => { };
```

Event key không chứa số coin. Reward amount và limits do backend quyết định.

### ServerVerified

```csharp
LVG.Security.RequestGameIdentity();
LVG.Security.IdentityReceived += identity => { };
```

Identity token được gửi tới backend tin cậy của game nếu game có ServerVerified. **Game Server Key không bao giờ được đặt trong Unity/WebGL**.

### Store

```csharp
LVG.ReturnToStore();
```

## Capability theo từng game

```text
account.basic
account.email
wallet.balance
wallet.transactions
entitlement.read
playtime.read
rewards.playtime
rewards.client
rewards.server_verified
stats.read
stats.write.client
leaderboard.read
leaderboard.submit.client
```

Mỗi game có Integration ID và quyền riêng. Integration ID là định danh công khai, không phải credential. Backend kiểm tra lại capability ở mọi API được bảo vệ.
