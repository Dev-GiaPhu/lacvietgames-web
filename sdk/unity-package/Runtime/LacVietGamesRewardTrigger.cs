using UnityEngine;

/// <summary>
/// No-code Inspector trigger for Admin-approved ClientCapped reward events.
/// Set only the public event key. Coin value and all limits remain on LacVietGames server.
/// Link TriggerReward() to an existing UnityEvent such as OnWin/OnQuestCompleted.
/// </summary>
public sealed class LacVietGamesRewardTrigger : MonoBehaviour
{
    [Tooltip("Public event key configured by LacVietGames Admin, e.g. win or quest_daily_1. Never enter a coin amount here.")]
    [SerializeField] private string eventKey = "win";

    public void TriggerReward()
    {
        var sdk = LacVietGamesBridge.Instance;
        if (sdk == null)
        {
            Debug.LogWarning("[LacVietGames] Missing LacVietGamesBridge. Run Tools > LacVietGames > Setup first.");
            return;
        }
        sdk.ClaimReward(eventKey);
    }
}
