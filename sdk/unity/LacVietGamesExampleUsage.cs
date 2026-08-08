using UnityEngine;

/// <summary>
/// Example only. Attach this beside LacVietGamesBridge while integrating,
/// then replace these callbacks with your own UI/game logic.
/// </summary>
public sealed class LacVietGamesExampleUsage : MonoBehaviour
{
    [Header("Server event keys")]
    [SerializeField] private string winEventKey = "win";
    [SerializeField] private string questEventKey = "quest_daily_1";

    private LacVietGamesBridge sdk;

    private void Start()
    {
        sdk = LacVietGamesBridge.Instance;
        if (sdk == null)
        {
            Debug.LogError("Missing LacVietGamesBridge in the scene.");
            enabled = false;
            return;
        }

        sdk.Authenticated += OnAuthenticated;
        sdk.WalletUpdated += OnWalletUpdated;
        sdk.RewardCompleted += OnRewardCompleted;
        sdk.Error += OnSdkError;
    }

    private void OnDestroy()
    {
        if (sdk == null) return;
        sdk.Authenticated -= OnAuthenticated;
        sdk.WalletUpdated -= OnWalletUpdated;
        sdk.RewardCompleted -= OnRewardCompleted;
        sdk.Error -= OnSdkError;
    }

    // Connect your in-game "Đăng nhập" button here.
    public void LoginButton()
    {
        sdk.RequestLogin();
    }

    // Connect your "Play" button here, exactly when gameplay really starts.
    public void StartGameButton()
    {
        sdk.GameplayStarted();
    }

    // Call ONLY when your own game logic decides that the player won.
    // Unity sends only "win". The backend decides the reward amount and limits.
    public void PlayerWon()
    {
        sdk.ClaimReward(winEventKey);
    }

    // Example quest completion.
    public void DailyQuestCompleted()
    {
        sdk.ClaimReward(questEventKey);
    }

    // Call when the match/run ends or when returning to the game's own menu.
    public void EndGame()
    {
        sdk.GameplayEnded();
    }

    public void RefreshWalletButton()
    {
        sdk.RefreshWallet();
    }

    public void BackToLacVietGamesButton()
    {
        sdk.ReturnToLacVietGames();
    }

    private void OnAuthenticated(LvgAccount account)
    {
        Debug.Log($"Logged in: {account.displayName} | Wallet: {account.coinBalance} LC");
        // Example UI:
        // playerNameText.text = account.displayName;
        // walletText.text = account.coinBalance.ToString("N0") + " LC";
    }

    private void OnWalletUpdated(long coinBalance)
    {
        Debug.Log($"Wallet updated: {coinBalance} LC");
        // walletText.text = coinBalance.ToString("N0") + " LC";
    }

    private void OnRewardCompleted(LvgRewardResult reward)
    {
        if (!reward.success)
        {
            Debug.LogWarning($"Reward denied: {reward.code} - {reward.message}");
            return;
        }

        Debug.Log($"Reward: {reward.title} +{reward.rewardCoin} LC | Wallet: {reward.coinBalance} LC");
        // rewardPopup.Show($"+{reward.rewardCoin} Lạc Coin");
    }

    private void OnSdkError(LvgSdkError error)
    {
        Debug.LogWarning($"LacVietGames SDK: {error.code} - {error.message}");
    }
}
