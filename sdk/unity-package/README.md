# LacVietGames Unity SDK 1.1

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

Thời gian server là nguồn dữ liệu thật. Unity không gửi `totalPlayTime` tự khai báo.

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
