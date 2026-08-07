using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// LacVietGames WebGL bridge.
/// Add this component to one persistent GameObject.
/// The game never receives the LacVietGames account token or API URL.
/// </summary>
public sealed class LacVietGamesBridge : MonoBehaviour
{
    public static LacVietGamesBridge Instance { get; private set; }

    [Header("LacVietGames")]
    [Tooltip("Enable when this scene immediately starts gameplay. Disable when the game opens on its own main menu.")]
    [SerializeField] private bool autoStartGameplay = false;

    [Tooltip("Keep the bridge when changing Unity scenes.")]
    [SerializeField] private bool dontDestroyOnLoad = true;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void LVG_GameplayStart();
    [DllImport("__Internal")] private static extern void LVG_GameplayEnd();
    [DllImport("__Internal")] private static extern void LVG_ReturnToStore();
#endif

    private bool gameplayActive;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        if (dontDestroyOnLoad) DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        if (autoStartGameplay) GameplayStarted();
    }

    /// <summary>Connect this to the game's Play/Start button when the game has an internal menu.</summary>
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

    /// <summary>Connect this to Back To Menu / End Game before returning to the game's own menu.</summary>
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

    /// <summary>Ends gameplay and asks the parent LacVietGames page to return to the store game page.</summary>
    public void ReturnToLacVietGames()
    {
        gameplayActive = false;
#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ReturnToStore();
#else
        Debug.Log("[LacVietGames] RETURN TO STORE");
#endif
    }

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }
}