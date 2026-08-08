using System;

public static class LVG
{
    private static LacVietGamesBridge Sdk => LacVietGamesBridge.Instance ?? throw new InvalidOperationException("LacVietGamesBridge chưa được khởi tạo. Dùng Tools > LacVietGames > Setup.");

    public static class Account
    {
        public static bool IsLoggedIn => Sdk.IsLoggedIn;
        public static int Id => Sdk.AccountId;
        public static string DisplayName => Sdk.DisplayName;
        public static void Login() => Sdk.RequestLogin();
        public static event Action<LvgAccount> Updated { add => Sdk.Authenticated += value; remove => Sdk.Authenticated -= value; }
    }

    public static class Wallet
    {
        public static long Balance => Sdk.CoinBalance;
        public static LvgGameTransaction[] Transactions => Sdk.LastTransactions;
        public static void Refresh() => Sdk.RefreshWallet();
        public static void RefreshTransactions(int limit = 30, long beforeId = 0) => Sdk.RequestGameTransactions(limit, beforeId);
        public static event Action<long> BalanceChanged { add => Sdk.WalletUpdated += value; remove => Sdk.WalletUpdated -= value; }
        public static event Action<LvgGameTransaction[]> TransactionsUpdated { add => Sdk.TransactionsReceived += value; remove => Sdk.TransactionsReceived -= value; }
    }

    public static class Playtime
    {
        public static LvgPlaytimeSummary Summary => Sdk.LastPlaytimeSummary;
        public static LvgPlaySessionInfo[] Sessions => Sdk.LastPlaytimeSessions;
        public static long TotalSeconds => Summary?.totalSeconds ?? 0;
        public static DateTime? FirstPlayedAtUtc => Summary?.FirstPlayedAtUtc;
        public static DateTime? CurrentSessionStartedAtUtc => Summary?.CurrentSessionStartedAtUtc;
        public static DateTime? LastSessionStartedAtUtc => Summary?.LastSessionStartedAtUtc;
        public static DateTime? LastExitAtUtc => Summary?.LastExitAtUtc;
        public static int LastSessionDurationSeconds => Summary?.lastSessionDurationSeconds ?? 0;
        public static void Refresh() => Sdk.RequestPlaytimeSummary();
        public static void RefreshSessions(int limit = 20) => Sdk.RequestPlaytimeSessions(limit);
        public static void Start() => Sdk.GameplayStarted();
        public static void End() => Sdk.GameplayEnded();
        public static event Action<LvgPlaytimeSummary> Updated { add => Sdk.PlaytimeSummaryReceived += value; remove => Sdk.PlaytimeSummaryReceived -= value; }
        public static event Action<LvgPlaySessionInfo[]> SessionsUpdated { add => Sdk.PlaytimeSessionsReceived += value; remove => Sdk.PlaytimeSessionsReceived -= value; }
    }

    public static class Entitlement
    {
        public static LvgEntitlement Current => Sdk.LastEntitlement;
        public static bool IsOwned => Current?.owned ?? false;
        public static void Refresh() => Sdk.RequestEntitlement();
        public static event Action<LvgEntitlement> Updated { add => Sdk.EntitlementReceived += value; remove => Sdk.EntitlementReceived -= value; }
    }

    public static class Stats
    {
        public static LvgPlayerStat[] Current => Sdk.LastStats;
        public static void Refresh() => Sdk.RequestStats();
        public static void Submit(string key, long value) => Sdk.SubmitStat(key, value);
        public static event Action<LvgPlayerStat[]> Updated { add => Sdk.StatsReceived += value; remove => Sdk.StatsReceived -= value; }
        public static event Action<LvgStatSubmitResult> Submitted { add => Sdk.StatSubmitted += value; remove => Sdk.StatSubmitted -= value; }
    }

    public static class Leaderboards
    {
        public static LvgLeaderboard Last => Sdk.LastLeaderboard;
        public static void Get(string key, int limit = 50) => Sdk.RequestLeaderboard(key, limit, 0);
        public static void GetAroundMe(string key, int radius = 5) => Sdk.RequestLeaderboard(key, 10, radius);
        public static void Submit(string key, long score) => Sdk.SubmitLeaderboardScore(key, score);
        public static event Action<LvgLeaderboard> Updated { add => Sdk.LeaderboardReceived += value; remove => Sdk.LeaderboardReceived -= value; }
        public static event Action<LvgStatSubmitResult> Submitted { add => Sdk.LeaderboardScoreSubmitted += value; remove => Sdk.LeaderboardScoreSubmitted -= value; }
    }

    public static class Rewards
    {
        public static void Claim(string eventKey) => Sdk.ClaimReward(eventKey);
        public static event Action<LvgRewardResult> Completed { add => Sdk.RewardCompleted += value; remove => Sdk.RewardCompleted -= value; }
    }

    public static class Security
    {
        public static void RequestGameIdentity() => Sdk.RequestGameIdentityToken();
        public static event Action<LvgGameIdentity> IdentityReceived { add => Sdk.GameIdentityReceived += value; remove => Sdk.GameIdentityReceived -= value; }
        public static event Action<LvgSdkError> Error { add => Sdk.Error += value; remove => Sdk.Error -= value; }
    }

    public static void ReturnToStore() => Sdk.ReturnToLacVietGames();
}
