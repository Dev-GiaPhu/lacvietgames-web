using System;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;

/// <summary>
/// LacVietGames SDK for Unity WebGL.
/// SECURITY:
/// - Unity never receives the LacVietGames account bearer token.
/// - Unity never sends a Lạc Coin amount.
/// - ClaimReward(eventKey) is only for ServerTime/ClientCapped rules; the server decides money and limits.
/// - High-value ServerVerified rewards CANNOT be claimed by this client method.
/// - RequestGameIdentityToken returns only a short-lived game/session-scoped identity token for sending to YOUR trusted game backend.
/// - NEVER put a Game Server Key inside Unity/WebGL. Only your backend may hold that key.
/// </summary>
public sealed class LacVietGamesBridge : MonoBehaviour
{
    public static LacVietGamesBridge Instance { get; private set; }

    [Header("Gameplay")]
    [SerializeField] private bool autoStartGameplay;
    [SerializeField] private bool dontDestroyOnLoad = true;

    [Header("Editor simulation only")]
    [SerializeField] private bool simulateLoggedInInEditor;
    [SerializeField] private string editorDisplayName = "Developer";
    [SerializeField] private long editorCoinBalance = 1000;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void LVG_InitBridge();
    [DllImport("__Internal")] private static extern IntPtr LVG_PollMessage();
    [DllImport("__Internal")] private static extern void LVG_FreeMessage(IntPtr ptr);
    [DllImport("__Internal")] private static extern void LVG_RequestAuth(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestWallet(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestIdentity(string requestId);
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
    public event Action<LvgGameIdentity> GameIdentityReceived;
    public event Action<LvgSdkError> Error;

    private bool gameplayActive;
    private bool bridgeInitialized;

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        gameObject.name = "LacVietGames";
        if (dontDestroyOnLoad) DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        Init();
#if UNITY_EDITOR
        if (simulateLoggedInInEditor) ApplyAccount(new LvgAccount { accountId = 1, displayName = editorDisplayName, email = "developer@editor.local", coinBalance = editorCoinBalance });
#endif
        if (autoStartGameplay) GameplayStarted();
    }

    private void Update()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        if (!bridgeInitialized) return;
        for (var i = 0; i < 8; i++)
        {
            var ptr = LVG_PollMessage(); if (ptr == IntPtr.Zero) break;
            try { var json = PtrToUtf8(ptr); if (!string.IsNullOrWhiteSpace(json)) HandleMessage(json); }
            finally { LVG_FreeMessage(ptr); }
        }
#endif
    }

    private void Init()
    {
        if (bridgeInitialized) return; bridgeInitialized = true;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_InitBridge();
#else
        Debug.Log("[LacVietGames] SDK initialized in Editor simulation.");
#endif
    }

    public void RequestLogin()
    {
        Init();
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestAuth(NewId());
#else
        if (simulateLoggedInInEditor) ApplyAccount(new LvgAccount { accountId = 1, displayName = editorDisplayName, email = "developer@editor.local", coinBalance = editorCoinBalance });
        else RaiseError("EDITOR_NOT_AUTHENTICATED", "Editor không có tài khoản server.");
#endif
    }

    public void RefreshWallet()
    {
        Init();
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestWallet(NewId());
#else
        if (simulateLoggedInInEditor) { CoinBalance = editorCoinBalance; WalletUpdated?.Invoke(CoinBalance); }
        else RaiseError("EDITOR_NOT_AUTHENTICATED", "Editor không có ví server.");
#endif
    }

    /// <summary>
    /// Requests a short-lived identity token scoped to this account + game + current play session.
    /// Send the returned token to YOUR trusted game backend over HTTPS. Your backend validates the real match/result,
    /// then calls LacVietGames ServerVerified API using a Game Server Key stored only in backend secrets.
    /// This token is user-visible by design and is NOT permission to mint coins by itself.
    /// </summary>
    public void RequestGameIdentityToken()
    {
        Init();
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestIdentity(NewId());
#else
        RaiseError("EDITOR_IDENTITY_UNAVAILABLE", "Game Identity Token thật chỉ được cấp khi chạy qua LacVietGames WebGL host.");
#endif
    }

    /// <summary>
    /// Client reward request. Use only for rules configured as ClientCapped. PlayTime is automatic.
    /// A ServerVerified rule is deliberately unreachable from this function.
    /// </summary>
    public void ClaimReward(string eventKey)
    {
        eventKey = NormalizeEventKey(eventKey);
        if (string.IsNullOrEmpty(eventKey)) { RaiseError("INVALID_EVENT_KEY", "eventKey chỉ được dùng a-z, 0-9, '.', '_' và '-'."); return; }
        Init();
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ClaimReward(eventKey, NewId());
#else
        RewardCompleted?.Invoke(new LvgRewardResult { success = false, code = "EDITOR_SIMULATION", message = "Editor không cộng Lạc Coin thật.", eventKey = eventKey, coinBalance = CoinBalance });
#endif
    }

    public void GameplayStarted()
    {
        if (gameplayActive) return; gameplayActive = true;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayStart();
#else
        Debug.Log("[LacVietGames] Gameplay START");
#endif
    }

    public void GameplayEnded()
    {
        if (!gameplayActive) return; gameplayActive = false;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayEnd();
#else
        Debug.Log("[LacVietGames] Gameplay END");
#endif
    }

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
        LvgBridgeMessage m;
        try { m = JsonUtility.FromJson<LvgBridgeMessage>(json); }
        catch (Exception e) { Debug.LogWarning("[LacVietGames] Invalid bridge message: " + e.Message); return; }
        if (m == null || string.IsNullOrEmpty(m.type)) return;

        switch (m.type)
        {
            case "LVG_HOST_READY": return;
            case "LVG_AUTH_RESULT":
                if (!m.success) { RaiseError(m.code, m.message); return; }
                ApplyAccount(new LvgAccount { accountId = m.accountId, displayName = m.displayName ?? "", email = m.email ?? "", coinBalance = m.coinBalance });
                return;
            case "LVG_WALLET_RESULT":
                if (!m.success) { RaiseError(m.code, m.message); return; }
                if (m.accountId > 0) { AccountId = m.accountId; DisplayName = m.displayName ?? DisplayName; Email = m.email ?? Email; IsLoggedIn = true; }
                CoinBalance = m.coinBalance; WalletUpdated?.Invoke(CoinBalance); return;
            case "LVG_IDENTITY_RESULT":
                if (!m.success) { RaiseError(m.code, m.message); return; }
                GameIdentityReceived?.Invoke(new LvgGameIdentity { identityToken = m.identityToken ?? "", gameId = m.gameId, gameSlug = m.gameSlug ?? "", playSessionId = m.playSessionId ?? "", expiresAt = m.expiresAt ?? "" });
                return;
            case "LVG_REWARD_RESULT":
                var reward = new LvgRewardResult { success = m.success, code = m.code ?? "", message = m.message ?? "", eventKey = m.eventKey ?? "", title = m.title ?? "", rewardCoin = m.rewardCoin, coinBalance = m.coinBalance, elapsedSeconds = m.elapsedSeconds, alreadyProcessed = m.alreadyProcessed };
                if (reward.success) { CoinBalance = reward.coinBalance; IsLoggedIn = true; WalletUpdated?.Invoke(CoinBalance); } else RaiseError(reward.code, reward.message);
                RewardCompleted?.Invoke(reward); return;
        }
    }

    private void ApplyAccount(LvgAccount a)
    {
        AccountId = a.accountId; DisplayName = a.displayName ?? ""; Email = a.email ?? ""; CoinBalance = a.coinBalance; IsLoggedIn = AccountId > 0;
        Authenticated?.Invoke(a); WalletUpdated?.Invoke(CoinBalance);
    }

    private void RaiseError(string code, string message)
    {
        var e = new LvgSdkError { code = string.IsNullOrWhiteSpace(code) ? "SDK_ERROR" : code, message = string.IsNullOrWhiteSpace(message) ? "LacVietGames request failed." : message };
        Debug.LogWarning($"[LacVietGames] {e.code}: {e.message}"); Error?.Invoke(e);
    }

    private static string NormalizeEventKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return ""; value = value.Trim().ToLowerInvariant(); if (value.Length > 80) return "";
        foreach (var c in value) if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '.')) return "";
        return value;
    }
    private static string NewId() => Guid.NewGuid().ToString("N");

#if UNITY_WEBGL && !UNITY_EDITOR
    private static string PtrToUtf8(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero) return ""; var length = 0; while (Marshal.ReadByte(ptr, length) != 0) length++; if (length == 0) return "";
        var bytes = new byte[length]; Marshal.Copy(ptr, bytes, 0, length); return Encoding.UTF8.GetString(bytes);
    }
#endif
    private void OnDestroy() { if (Instance == this) Instance = null; }

    [Serializable]
    private sealed class LvgBridgeMessage
    {
        public string type, requestId, code, message, displayName, email, eventKey, title;
        public bool success, alreadyProcessed, loggedIn;
        public int accountId, elapsedSeconds, gameId;
        public long coinBalance, rewardCoin;
        public string identityToken, gameSlug, playSessionId, expiresAt;
    }
}

[Serializable] public sealed class LvgAccount { public int accountId; public string displayName; public string email; public long coinBalance; }
[Serializable] public sealed class LvgRewardResult { public bool success; public string code; public string message; public string eventKey; public string title; public long rewardCoin; public long coinBalance; public int elapsedSeconds; public bool alreadyProcessed; }
[Serializable] public sealed class LvgGameIdentity { public string identityToken; public int gameId; public string gameSlug; public string playSessionId; public string expiresAt; }
[Serializable] public sealed class LvgSdkError { public string code; public string message; }
