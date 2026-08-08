using System;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using UnityEngine;

public sealed class LacVietGamesBridge : MonoBehaviour
{
    public static LacVietGamesBridge Instance { get; private set; }

    [Header("LacVietGames Integration")]
    [SerializeField] private string integrationId = "";
    [Header("Gameplay")]
    [SerializeField] private bool autoStartGameplay;
    [SerializeField] private bool dontDestroyOnLoad = true;
    [Header("Editor simulation only")]
    [SerializeField] private bool simulateLoggedInInEditor;
    [SerializeField] private string editorDisplayName = "Developer";
    [SerializeField] private long editorCoinBalance = 1000;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void LVG_InitBridge(string integrationId);
    [DllImport("__Internal")] private static extern IntPtr LVG_PollMessage();
    [DllImport("__Internal")] private static extern void LVG_FreeMessage(IntPtr ptr);
    [DllImport("__Internal")] private static extern void LVG_RequestAuth(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestWallet(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestIdentity(string requestId);
    [DllImport("__Internal")] private static extern void LVG_ClaimReward(string eventKey, string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestPlaytimeSummary(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestPlaytimeSessions(int limit, string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestTransactions(int limit, string beforeId, string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestEntitlement(string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestStats(string requestId);
    [DllImport("__Internal")] private static extern void LVG_SubmitStat(string key, string value, string requestId);
    [DllImport("__Internal")] private static extern void LVG_RequestLeaderboard(string key, int limit, int around, string requestId);
    [DllImport("__Internal")] private static extern void LVG_SubmitLeaderboard(string key, string value, string requestId);
    [DllImport("__Internal")] private static extern void LVG_GameplayStart();
    [DllImport("__Internal")] private static extern void LVG_GameplayEnd();
    [DllImport("__Internal")] private static extern void LVG_ReturnToStore();
#endif

    public string IntegrationId => integrationId;
    public bool IsLoggedIn { get; private set; }
    public bool HostApproved { get; private set; }
    public int AccountId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public long CoinBalance { get; private set; }
    public bool GameplayActive => gameplayActive;

    public LvgPlaytimeSummary LastPlaytimeSummary { get; private set; }
    public LvgPlaySessionInfo[] LastPlaytimeSessions { get; private set; } = Array.Empty<LvgPlaySessionInfo>();
    public LvgGameTransaction[] LastTransactions { get; private set; } = Array.Empty<LvgGameTransaction>();
    public LvgEntitlement LastEntitlement { get; private set; }
    public LvgPlayerStat[] LastStats { get; private set; } = Array.Empty<LvgPlayerStat>();
    public LvgLeaderboard LastLeaderboard { get; private set; }

    public event Action<LvgAccount> Authenticated;
    public event Action<long> WalletUpdated;
    public event Action<LvgRewardResult> RewardCompleted;
    public event Action<LvgGameIdentity> GameIdentityReceived;
    public event Action<LvgPlaytimeSummary> PlaytimeSummaryReceived;
    public event Action<LvgPlaySessionInfo[]> PlaytimeSessionsReceived;
    public event Action<LvgGameTransaction[]> TransactionsReceived;
    public event Action<LvgEntitlement> EntitlementReceived;
    public event Action<LvgPlayerStat[]> StatsReceived;
    public event Action<LvgStatSubmitResult> StatSubmitted;
    public event Action<LvgLeaderboard> LeaderboardReceived;
    public event Action<LvgStatSubmitResult> LeaderboardScoreSubmitted;
    public event Action<LvgSdkError> Error;

    private bool gameplayActive;
    private bool bridgeInitialized;

    public void ConfigureIntegrationId(string value)
    {
        if (bridgeInitialized) throw new InvalidOperationException("Configure Integration ID before the bridge initializes.");
        integrationId = (value ?? string.Empty).Trim();
    }

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
        if (simulateLoggedInInEditor) ApplyAccount(new LvgAccount { accountId = 1, displayName = editorDisplayName, email = "", coinBalance = editorCoinBalance });
#endif
        if (autoStartGameplay) GameplayStarted();
    }

    private void Update()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        if (!bridgeInitialized) return;
        for (var i = 0; i < 12; i++)
        {
            var ptr = LVG_PollMessage(); if (ptr == IntPtr.Zero) break;
            try { var json = PtrToUtf8(ptr); if (!string.IsNullOrWhiteSpace(json)) HandleMessage(json); }
            finally { LVG_FreeMessage(ptr); }
        }
#endif
    }

    private void Init()
    {
        if (bridgeInitialized) return;
        integrationId = (integrationId ?? string.Empty).Trim();
#if UNITY_WEBGL && !UNITY_EDITOR
        if (string.IsNullOrWhiteSpace(integrationId)) { RaiseError("INTEGRATION_ID_REQUIRED", "Thiếu Integration ID."); return; }
        bridgeInitialized = true; LVG_InitBridge(integrationId);
#else
        bridgeInitialized = true;
#endif
    }

    public void RequestLogin(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestAuth(NewId());
#else
        if(simulateLoggedInInEditor)ApplyAccount(new LvgAccount{accountId=1,displayName=editorDisplayName,email="",coinBalance=editorCoinBalance});else RaiseError("EDITOR_NOT_AUTHENTICATED","Editor không có tài khoản production.");
#endif
    }
    public void RefreshWallet(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestWallet(NewId());
#else
        if(simulateLoggedInInEditor){CoinBalance=editorCoinBalance;WalletUpdated?.Invoke(CoinBalance);}else RaiseError("EDITOR_NOT_AUTHENTICATED","Editor không có ví production.");
#endif
    }
    public void RequestGameIdentityToken(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestIdentity(NewId());
#else
        RaiseError("EDITOR_IDENTITY_UNAVAILABLE","Identity production chỉ có khi chạy trên LacVietGames.");
#endif
    }
    public void ClaimReward(string eventKey){eventKey=NormalizeKey(eventKey);if(string.IsNullOrEmpty(eventKey)){RaiseError("INVALID_EVENT_KEY","eventKey không hợp lệ.");return;}Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ClaimReward(eventKey,NewId());
#else
        RewardCompleted?.Invoke(new LvgRewardResult{success=false,code="EDITOR_SIMULATION",message="Editor không cộng Lạc Coin thật.",eventKey=eventKey,coinBalance=CoinBalance});
#endif
    }

    public void RequestPlaytimeSummary(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestPlaytimeSummary(NewId());
#else
        LastPlaytimeSummary=new LvgPlaytimeSummary();PlaytimeSummaryReceived?.Invoke(LastPlaytimeSummary);
#endif
    }
    public void RequestPlaytimeSessions(int limit=20){Init();if(!bridgeInitialized)return;limit=Mathf.Clamp(limit,1,50);
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestPlaytimeSessions(limit,NewId());
#else
        LastPlaytimeSessions=Array.Empty<LvgPlaySessionInfo>();PlaytimeSessionsReceived?.Invoke(LastPlaytimeSessions);
#endif
    }
    public void RequestGameTransactions(int limit=30,long beforeId=0){Init();if(!bridgeInitialized)return;limit=Mathf.Clamp(limit,1,100);
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestTransactions(limit,beforeId>0?beforeId.ToString(CultureInfo.InvariantCulture):"",NewId());
#else
        LastTransactions=Array.Empty<LvgGameTransaction>();TransactionsReceived?.Invoke(LastTransactions);
#endif
    }
    public void RequestEntitlement(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestEntitlement(NewId());
#else
        LastEntitlement=new LvgEntitlement{owned=true,source="Editor"};EntitlementReceived?.Invoke(LastEntitlement);
#endif
    }
    public void RequestStats(){Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestStats(NewId());
#else
        LastStats=Array.Empty<LvgPlayerStat>();StatsReceived?.Invoke(LastStats);
#endif
    }
    public void SubmitStat(string key,long value){key=NormalizeKey(key);if(string.IsNullOrEmpty(key)){RaiseError("INVALID_STAT_KEY","Stat key không hợp lệ.");return;}Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_SubmitStat(key,value.ToString(CultureInfo.InvariantCulture),NewId());
#else
        StatSubmitted?.Invoke(new LvgStatSubmitResult{key=key,value=value,alreadyProcessed=false});
#endif
    }
    public void RequestLeaderboard(string key,int limit=50,int around=0){key=NormalizeKey(key);if(string.IsNullOrEmpty(key)){RaiseError("INVALID_LEADERBOARD_KEY","Leaderboard key không hợp lệ.");return;}Init();if(!bridgeInitialized)return;limit=Mathf.Clamp(limit,1,100);around=Mathf.Clamp(around,0,25);
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_RequestLeaderboard(key,limit,around,NewId());
#else
        LastLeaderboard=new LvgLeaderboard{key=key,entries=Array.Empty<LvgLeaderboardEntry>()};LeaderboardReceived?.Invoke(LastLeaderboard);
#endif
    }
    public void SubmitLeaderboardScore(string key,long value){key=NormalizeKey(key);if(string.IsNullOrEmpty(key)){RaiseError("INVALID_LEADERBOARD_KEY","Leaderboard key không hợp lệ.");return;}Init();if(!bridgeInitialized)return;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_SubmitLeaderboard(key,value.ToString(CultureInfo.InvariantCulture),NewId());
#else
        LeaderboardScoreSubmitted?.Invoke(new LvgStatSubmitResult{key=key,value=value,alreadyProcessed=false});
#endif
    }

    public void GameplayStarted(){Init();if(!bridgeInitialized||gameplayActive)return;gameplayActive=true;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayStart();
#endif
    }
    public void GameplayEnded(){if(!gameplayActive)return;gameplayActive=false;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayEnd();
#endif
    }
    public void ReturnToLacVietGames(){gameplayActive=false;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ReturnToStore();
#endif
    }

    private void HandleMessage(string json)
    {
        LvgBridgeMessage m;try{m=JsonUtility.FromJson<LvgBridgeMessage>(json);}catch(Exception e){Debug.LogWarning("[LacVietGames] Invalid bridge message: "+e.Message);return;}if(m==null||string.IsNullOrEmpty(m.type))return;
        if(!m.success && m.type.EndsWith("_RESULT",StringComparison.Ordinal) && m.type!="LVG_HOST_READY"){RaiseError(m.code,m.message);return;}
        switch(m.type)
        {
            case "LVG_HOST_READY": HostApproved=m.approved;if(!m.approved)RaiseError(string.IsNullOrWhiteSpace(m.code)?"INTEGRATION_NOT_APPROVED":m.code,m.message);return;
            case "LVG_AUTH_RESULT": ApplyAccount(new LvgAccount{accountId=m.accountId,displayName=m.displayName??"",email=m.email??"",coinBalance=m.coinBalance});return;
            case "LVG_WALLET_RESULT": if(m.accountId>0){AccountId=m.accountId;DisplayName=m.displayName??DisplayName;Email=m.email??Email;IsLoggedIn=true;}CoinBalance=m.coinBalance;WalletUpdated?.Invoke(CoinBalance);return;
            case "LVG_IDENTITY_RESULT": GameIdentityReceived?.Invoke(new LvgGameIdentity{identityToken=m.identityToken??"",gameId=m.gameId,gameSlug=m.gameSlug??"",playSessionId=m.playSessionId??"",expiresAt=m.expiresAt??""});return;
            case "LVG_REWARD_RESULT": var reward=new LvgRewardResult{success=m.success,code=m.code??"",message=m.message??"",eventKey=m.eventKey??"",title=m.title??"",rewardCoin=m.rewardCoin,coinBalance=m.coinBalance,elapsedSeconds=m.elapsedSeconds,alreadyProcessed=m.alreadyProcessed};CoinBalance=reward.coinBalance;IsLoggedIn=true;WalletUpdated?.Invoke(CoinBalance);RewardCompleted?.Invoke(reward);return;
            case "LVG_PLAYTIME_SUMMARY_RESULT": LastPlaytimeSummary=Parse<LvgPlaytimeSummary>(m.payloadJson);PlaytimeSummaryReceived?.Invoke(LastPlaytimeSummary);return;
            case "LVG_PLAYTIME_SESSIONS_RESULT": LastPlaytimeSessions=ParseArray<LvgPlaySessionInfo>(m.payloadJson);PlaytimeSessionsReceived?.Invoke(LastPlaytimeSessions);return;
            case "LVG_TRANSACTIONS_RESULT": LastTransactions=ParseArray<LvgGameTransaction>(m.payloadJson);TransactionsReceived?.Invoke(LastTransactions);return;
            case "LVG_ENTITLEMENT_RESULT": LastEntitlement=Parse<LvgEntitlement>(m.payloadJson);EntitlementReceived?.Invoke(LastEntitlement);return;
            case "LVG_STATS_RESULT": LastStats=ParseArray<LvgPlayerStat>(m.payloadJson);StatsReceived?.Invoke(LastStats);return;
            case "LVG_STAT_SUBMIT_RESULT": StatSubmitted?.Invoke(Parse<LvgStatSubmitResult>(m.payloadJson));return;
            case "LVG_LEADERBOARD_RESULT": LastLeaderboard=Parse<LvgLeaderboard>(m.payloadJson);LeaderboardReceived?.Invoke(LastLeaderboard);return;
            case "LVG_LEADERBOARD_SUBMIT_RESULT": LeaderboardScoreSubmitted?.Invoke(Parse<LvgStatSubmitResult>(m.payloadJson));return;
        }
    }

    private void ApplyAccount(LvgAccount a){AccountId=a.accountId;DisplayName=a.displayName??"";Email=a.email??"";CoinBalance=a.coinBalance;IsLoggedIn=AccountId>0;Authenticated?.Invoke(a);WalletUpdated?.Invoke(CoinBalance);}
    private void RaiseError(string code,string message){var e=new LvgSdkError{code=string.IsNullOrWhiteSpace(code)?"SDK_ERROR":code,message=string.IsNullOrWhiteSpace(message)?"Yêu cầu không thành công.":message};Debug.LogWarning($"[LacVietGames] {e.code}: {e.message}");Error?.Invoke(e);}
    private static T Parse<T>(string json) where T:new(){if(string.IsNullOrWhiteSpace(json)||json=="null")return new T();try{return JsonUtility.FromJson<T>(json)??new T();}catch{return new T();}}
    private static T[] ParseArray<T>(string json){if(string.IsNullOrWhiteSpace(json)||json=="null")return Array.Empty<T>();try{var w=JsonUtility.FromJson<LvgArrayWrapper<T>>("{\"items\":"+json+"}");return w?.items??Array.Empty<T>();}catch{return Array.Empty<T>();}}
    private static string NormalizeKey(string value){if(string.IsNullOrWhiteSpace(value))return"";value=value.Trim().ToLowerInvariant();if(value.Length>80)return"";foreach(var c in value)if(!((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='_'||c=='-'||c=='.'))return"";return value;}
    private static string NewId()=>Guid.NewGuid().ToString("N");
#if UNITY_WEBGL && !UNITY_EDITOR
    private static string PtrToUtf8(IntPtr ptr){if(ptr==IntPtr.Zero)return"";var length=0;while(Marshal.ReadByte(ptr,length)!=0)length++;if(length==0)return"";var bytes=new byte[length];Marshal.Copy(ptr,bytes,0,length);return Encoding.UTF8.GetString(bytes);}
#endif
    private void OnDestroy(){if(Instance==this)Instance=null;}

    [Serializable] private sealed class LvgBridgeMessage{public string type,requestId,code,message,displayName,email,eventKey,title,payloadJson;public bool success,alreadyProcessed,loggedIn,approved;public int accountId,elapsedSeconds,gameId;public long coinBalance,rewardCoin;public string identityToken,gameSlug,playSessionId,expiresAt;}
    [Serializable] private sealed class LvgArrayWrapper<T>{public T[] items;}
}

[Serializable] public sealed class LvgAccount{public int accountId;public string displayName;public string email;public long coinBalance;}
[Serializable] public sealed class LvgRewardResult{public bool success;public string code;public string message;public string eventKey;public string title;public long rewardCoin;public long coinBalance;public int elapsedSeconds;public bool alreadyProcessed;}
[Serializable] public sealed class LvgGameIdentity{public string identityToken;public int gameId;public string gameSlug;public string playSessionId;public string expiresAt;}
[Serializable] public sealed class LvgSdkError{public string code;public string message;}

[Serializable] public sealed class LvgPlaytimeSummary
{
    public int gameId,sessionCount,currentSessionElapsedSeconds,lastSessionDurationSeconds; public long totalSeconds; public string gameSlug,firstPlayedAt,currentSessionStartedAt,lastSessionStartedAt,lastPlayedAt,lastExitAt,serverTime;
    public DateTime? FirstPlayedAtUtc=>LvgDate.Parse(firstPlayedAt);public DateTime? CurrentSessionStartedAtUtc=>LvgDate.Parse(currentSessionStartedAt);public DateTime? LastSessionStartedAtUtc=>LvgDate.Parse(lastSessionStartedAt);public DateTime? LastPlayedAtUtc=>LvgDate.Parse(lastPlayedAt);public DateTime? LastExitAtUtc=>LvgDate.Parse(lastExitAt);
}
[Serializable] public sealed class LvgPlaySessionInfo{public string startedAt,lastSeenAt,endedAt,status;public int durationSeconds;public DateTime? StartedAtUtc=>LvgDate.Parse(startedAt);public DateTime? EndedAtUtc=>LvgDate.Parse(endedAt);}
[Serializable] public sealed class LvgGameTransaction{public long id,coinAmount;public double moneyAmount;public string type,status,description,createdAt;public DateTime? CreatedAtUtc=>LvgDate.Parse(createdAt);}
[Serializable] public sealed class LvgEntitlement{public bool owned;public string acquiredAt,source;public DateTime? AcquiredAtUtc=>LvgDate.Parse(acquiredAt);}
[Serializable] public sealed class LvgPlayerStat{public string key,title,writeMode,aggregation,updatedAt;public long value;public DateTime? UpdatedAtUtc=>LvgDate.Parse(updatedAt);}
[Serializable] public sealed class LvgStatSubmitResult{public string key;public long value;public bool alreadyProcessed;}
[Serializable] public sealed class LvgLeaderboard{public string key,title,sourceType,serverTime;public LvgLeaderboardEntry[] entries=Array.Empty<LvgLeaderboardEntry>();public LvgLeaderboardEntry me;}
[Serializable] public sealed class LvgLeaderboardEntry{public long rank,score;public string playerId,displayName,updatedAt;public bool isCurrentPlayer;public DateTime? UpdatedAtUtc=>LvgDate.Parse(updatedAt);}
public static class LvgDate{public static DateTime? Parse(string value){if(string.IsNullOrWhiteSpace(value))return null;return DateTime.TryParse(value,CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal|DateTimeStyles.AssumeUniversal,out var dt)?dt:null;}}
