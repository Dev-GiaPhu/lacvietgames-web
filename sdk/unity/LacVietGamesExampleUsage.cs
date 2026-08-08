using UnityEngine;

/// <summary>
/// Integration example. Never store a Game Server Key in this Unity project.
/// </summary>
public sealed class LacVietGamesExampleUsage : MonoBehaviour
{
    [Header("ClientCapped event keys only")]
    [SerializeField] private string lowValueQuestEventKey = "quest_daily_1";
    private LacVietGamesBridge sdk;

    private void Start()
    {
        sdk = LacVietGamesBridge.Instance;
        if (sdk == null) { Debug.LogError("Missing LacVietGamesBridge in the scene."); enabled = false; return; }
        sdk.Authenticated += OnAuthenticated;
        sdk.WalletUpdated += OnWalletUpdated;
        sdk.RewardCompleted += OnRewardCompleted;
        sdk.GameIdentityReceived += OnGameIdentity;
        sdk.Error += OnSdkError;
    }

    private void OnDestroy()
    {
        if (sdk == null) return;
        sdk.Authenticated -= OnAuthenticated;
        sdk.WalletUpdated -= OnWalletUpdated;
        sdk.RewardCompleted -= OnRewardCompleted;
        sdk.GameIdentityReceived -= OnGameIdentity;
        sdk.Error -= OnSdkError;
    }

    public void LoginButton() => sdk.RequestLogin();
    public void StartGameButton() => sdk.GameplayStarted();
    public void EndGame() => sdk.GameplayEnded();
    public void RefreshWalletButton() => sdk.RefreshWallet();
    public void BackToLacVietGamesButton() => sdk.ReturnToLacVietGames();

    /// <summary>
    /// LOW-VALUE client event only. Admin must configure this event as ClientCapped.
    /// LacVietGames server still decides amount/time/cooldown/caps.
    /// </summary>
    public void LowValueQuestCompleted() => sdk.ClaimReward(lowValueQuestEventKey);

    /// <summary>
    /// HIGH-VALUE win/competitive reward flow.
    /// Do NOT call ClaimReward("win"). Ask for a scoped identity and send it to YOUR backend.
    /// Your backend verifies the real match result, then calls LacVietGames with its secret Game Server Key.
    /// </summary>
    public void PlayerWonServerVerified() => sdk.RequestGameIdentityToken();

    private void OnGameIdentity(LvgGameIdentity identity)
    {
        Debug.Log($"Scoped identity ready for game backend. Game={identity.gameSlug}, expires={identity.expiresAt}");

        // Send ONLY identity.identityToken + your own match/run id to YOUR HTTPS backend.
        // Example conceptual payload:
        // POST https://api.yourgame.com/match/finish
        // { identityToken, matchId }
        //
        // Your backend must independently validate the actual win/result.
        // Only after validation does YOUR backend call:
        // POST https://lacvietgames-api-production.up.railway.app/api/store/game-sdk/server/rewards/claim
        // Header: X-LVG-Game-Key: <SERVER SECRET FROM ENV>
        // Body: { identityToken, eventKey: "win", externalEventId: matchId }
        //
        // NEVER send the Game Server Key to Unity.
    }

    private void OnAuthenticated(LvgAccount a) => Debug.Log($"Logged in: {a.displayName} | Wallet: {a.coinBalance} LC");
    private void OnWalletUpdated(long balance) => Debug.Log($"Wallet updated: {balance} LC");
    private void OnRewardCompleted(LvgRewardResult r)
    {
        if (!r.success) { Debug.LogWarning($"Reward denied: {r.code} - {r.message}"); return; }
        Debug.Log($"Reward: {r.title} +{r.rewardCoin} LC | Wallet: {r.coinBalance} LC");
    }
    private void OnSdkError(LvgSdkError e) => Debug.LogWarning($"LacVietGames SDK: {e.code} - {e.message}");
}
