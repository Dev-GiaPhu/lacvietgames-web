using System;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;

/// <summary>
/// LacVietGames SDK for Unity WebGL.
///
/// SECURITY MODEL:
/// - The Unity build never receives the LacVietGames bearer token.
/// - The Unity build never sends a coin amount.
/// - Unity only reports an eventKey such as "win" or "quest_daily_1".
/// - The LacVietGames parent page attaches the authenticated account + active play session.
/// - The backend decides reward amount, minimum play time, cooldown and limits.
///
/// Put exactly one instance in the first scene and keep it alive between scenes.
/// </summary>
public sealed class LacVietGamesBridge : MonoBehaviour
{
    public static LacVietGamesBridge Instance { get; private set; }

    [Header("Gameplay")]
    [Tooltip("Enable only when this scene immediately starts real gameplay. Disable if the game opens at a main menu.")]
    [SerializeField] private bool autoStartGameplay;

    [Tooltip("Keep the SDK alive between Unity scenes.")]
    [SerializeField] private bool dontDestroyOnLoad = true;

    [Header("Editor simulation only")]
    [Tooltip("Only used inside Unity Editor. It never gives real Lạc Coin.")]
    [SerializeField] private bool simulateLoggedInInEditor;
    [SerializeField] private string editorDisplayName = "Developer";
    [SerializeField] private long editorCoinBalance = 1000;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void LVG_InitBridge();
    [DllImport("__Internal")] private static extern IntPtr LVG_PollMessage();
    [DllImport("__Internal")] private static extern void LVG_FreeMessage(IntPtr ptr);
    [DllImport("__Internal")] private static extern void LVG_RequestAuth(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestWallet(string requestId);
    [DllImport("__Internal")] private static extern void LVG_ClaimReward(string eventKey, string requestId);
    [DllImport("__Internal")] private static extern void LVG_GameplayStart();
    [DllImport("__Internal")] private static extern void LVG_GameplayEnd();
    [DllImport("__Internal")] private static extern void LVG_ReturnToStore();
#endif

    public bool IsLoggedIn { get; private set; }
    public int AccountId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public long CoinBalance { get; private set; }
    public bool GameplayActive => gameplayActive;

    public event Action<LvgAccount> Authenticated;
    public event Action<long> WalletUpdated;
    public event Action<LvgRewardResult> RewardCompleted;
    public event Action<LvgSdkError> Error;

    private bool gameplayActive;
    private bool bridgeInitialized;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        gameObject.name = "LacVietGames";
        if (dontDestroyOnLoad) DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        InitializeBridge();

#if UNITY_EDITOR
        if (simulateLoggedInInEditor)
        {
            ApplyAccount(new LvgAccount
            {
                accountId = 1,
                displayName = editorDisplayName,
                email = "developer@editor.local",
                coinBalance = editorCoinBalance
            });
        }
#endif

        if (autoStartGameplay) GameplayStarted();
    }

    private void Update()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        if (!bridgeInitialized) return;

        // Drain a small bounded queue each frame so a broken/malicious parent cannot stall Unity.
        for (var i = 0; i < 8; i++)
        {
            var ptr = LVG_PollMessage();
            if (ptr == IntPtr.Zero) break;

            try
            {
                var json = PtrToUtf8(ptr);
                if (!string.IsNullOrWhiteSpace(json)) HandleMessage(json);
            }
            finally
            {
                LVG_FreeMessage(ptr);
            }
        }
#endif
    }

    private void InitializeBridge()
    {
        if (bridgeInitialized) return;
        bridgeInitialized = true;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_InitBridge();
#else
        Debug.Log("[LacVietGames] SDK bridge initialized (Editor simulation).");
#endif
    }

    /// <summary>
    /// Call from your in-game Login button.
    /// On WebGL this asks the LacVietGames parent page to open its login UI if necessary.
    /// The main account bearer token is never returned to Unity.
    /// </summary>
    public void RequestLogin()
    {
        InitializeBridge();
        var requestId = NewRequestId();

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestAuth(requestId);
#else
        if (simulateLoggedInInEditor)
        {
            ApplyAccount(new LvgAccount
            {
                accountId = 1,
                displayName = editorDisplayName,
                email = "developer@editor.local",
                coinBalance = editorCoinBalance
            });
        }
        else
        {
            RaiseError("EDITOR_NOT_AUTHENTICATED", "Editor không có tài khoản server. Bật Simulate Logged In In Editor để test UI.");
        }
#endif
    }

    /// <summary>Refreshes server Lạc Coin and account display data.</summary>
    public void RefreshWallet()
    {
        InitializeBridge();
        var requestId = NewRequestId();

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestWallet(requestId);
#else
        if (simulateLoggedInInEditor)
        {
            CoinBalance = editorCoinBalance;
            WalletUpdated?.Invoke(CoinBalance);
        }
        else
        {
            RaiseError("EDITOR_NOT_AUTHENTICATED", "Editor không có ví server.");
        }
#endif
    }

    /// <summary>
    /// Requests a reward by SERVER event key.
    /// NEVER pass a coin amount here. Example: ClaimReward("win").
    /// Server configuration decides how many coins are awarded and whether the claim is eligible.
    /// </summary>
    public void ClaimReward(string eventKey)
    {
        eventKey = NormalizeEventKey(eventKey);
        if (string.IsNullOrEmpty(eventKey))
        {
            RaiseError("INVALID_EVENT_KEY", "eventKey chỉ được dùng a-z, 0-9, '.', '_' và '-'.");
            return;
        }

        InitializeBridge();
        var requestId = NewRequestId();

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ClaimReward(eventKey, requestId);
#else
        Debug.Log($"[LacVietGames] Editor reward request: {eventKey}. No real coin is granted in Editor.");
        RewardCompleted?.Invoke(new LvgRewardResult
        {
            success = false,
            code = "EDITOR_SIMULATION",
            message = "Editor không cộng Lạc Coin thật.",
            eventKey = eventKey,
            coinBalance = CoinBalance
        });
#endif
    }

    /// <summary>Call exactly when real gameplay begins, not when the game's main menu opens.</summary>
    public void GameplayStarted()
    {
        if (gameplayActive) return;
        gameplayActive = true;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayStart();
#else
        Debug.Log("[LacVietGames] Gameplay START");
#endif
    }

    /// <summary>Call when a run/match ends or the player returns to the game's own menu.</summary>
    public void GameplayEnded()
    {
        if (!gameplayActive) return;
        gameplayActive = false;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayEnd();
#else
        Debug.Log("[LacVietGames] Gameplay END");
#endif
    }

    /// <summary>Ends gameplay and asks LacVietGames to navigate back to the store game page.</summary>
    public void ReturnToLacVietGames()
    {
        gameplayActive = false;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ReturnToStore();
#else
        Debug.Log("[LacVietGames] RETURN TO STORE");
#endif
    }

    private void HandleMessage(string json)
    {
        LvgBridgeMessage message;
        try
        {
            message = JsonUtility.FromJson<LvgBridgeMessage>(json);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[LacVietGames] Invalid bridge message: {ex.Message}");
            return;
        }

        if (message == null || string.IsNullOrEmpty(message.type)) return;

        switch (message.type)
        {
            case "LVG_HOST_READY":
                // Host is available. We intentionally do not auto-open login here.
                break;

            case "LVG_AUTH_RESULT":
                if (!message.success)
                {
                    RaiseError(message.code, message.message);
                    return;
                }
                ApplyAccount(new LvgAccount
                {
                    accountId = message.accountId,
                    displayName = message.displayName ?? string.Empty,
                    email = message.email ?? string.Empty,
                    coinBalance = message.coinBalance
                });
                break;

            case "LVG_WALLET_RESULT":
                if (!message.success)
                {
                    RaiseError(message.code, message.message);
                    return;
                }
                if (message.accountId > 0)
                {
                    AccountId = message.accountId;
                    DisplayName = message.displayName ?? DisplayName;
                    Email = message.email ?? Email;
                    IsLoggedIn = true;
                }
                CoinBalance = message.coinBalance;
                WalletUpdated?.Invoke(CoinBalance);
                break;

            case "LVG_REWARD_RESULT":
                var reward = new LvgRewardResult
                {
                    success = message.success,
                    code = message.code ?? string.Empty,
                    message = message.message ?? string.Empty,
                    eventKey = message.eventKey ?? string.Empty,
                    title = message.title ?? string.Empty,
                    rewardCoin = message.rewardCoin,
                    coinBalance = message.coinBalance,
                    elapsedSeconds = message.elapsedSeconds,
                    alreadyProcessed = message.alreadyProcessed
                };

                if (reward.success)
                {
                    CoinBalance = reward.coinBalance;
                    IsLoggedIn = true;
                    WalletUpdated?.Invoke(CoinBalance);
                }
                else
                {
                    RaiseError(reward.code, reward.message);
                }

                RewardCompleted?.Invoke(reward);
                break;
        }
    }

    private void ApplyAccount(LvgAccount account)
    {
        AccountId = account.accountId;
        DisplayName = account.displayName ?? string.Empty;
        Email = account.email ?? string.Empty;
        CoinBalance = account.coinBalance;
        IsLoggedIn = AccountId > 0;

        Authenticated?.Invoke(account);
        WalletUpdated?.Invoke(CoinBalance);
    }

    private void RaiseError(string code, string message)
    {
        var error = new LvgSdkError
        {
            code = string.IsNullOrWhiteSpace(code) ? "SDK_ERROR" : code,
            message = string.IsNullOrWhiteSpace(message) ? "LacVietGames request failed." : message
        };
        Debug.LogWarning($"[LacVietGames] {error.code}: {error.message}");
        Error?.Invoke(error);
    }

    private static string NormalizeEventKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        value = value.Trim().ToLowerInvariant();
        if (value.Length > 80) return string.Empty;

        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            var valid = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '.';
            if (!valid) return string.Empty;
        }
        return value;
    }

    private static string NewRequestId() => Guid.NewGuid().ToString("N");

#if UNITY_WEBGL && !UNITY_EDITOR
    private static string PtrToUtf8(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero) return string.Empty;
        var length = 0;
        while (Marshal.ReadByte(ptr, length) != 0) length++;
        if (length == 0) return string.Empty;
        var bytes = new byte[length];
        Marshal.Copy(ptr, bytes, 0, length);
        return Encoding.UTF8.GetString(bytes);
    }
#endif

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }

    [Serializable]
    private sealed class LvgBridgeMessage
    {
        public string type;
        public string requestId;
        public bool success;
        public string code;
        public string message;
        public int accountId;
        public string displayName;
        public string email;
        public long coinBalance;
        public string eventKey;
        public string title;
        public long rewardCoin;
        public int elapsedSeconds;
        public bool alreadyProcessed;
        public bool loggedIn;
    }
}

[Serializable]
public sealed class LvgAccount
{
    public int accountId;
    public string displayName;
    public string email;
    public long coinBalance;
}

[Serializable]
public sealed class LvgRewardResult
{
    public bool success;
    public string code;
    public string message;
    public string eventKey;
    public string title;
    public long rewardCoin;
    public long coinBalance;
    public int elapsedSeconds;
    public bool alreadyProcessed;
}

[Serializable]
public sealed class LvgSdkError
{
    public string code;
    public string message;
}
