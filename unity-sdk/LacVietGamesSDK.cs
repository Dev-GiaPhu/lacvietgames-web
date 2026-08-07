using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// LacVietGames WebGL bridge.
/// Drag this component onto one persistent GameObject in your Unity project.
/// The website owns authentication, play-session time and Lạc Coin rewards.
/// Unity only reports gameplay lifecycle signals.
/// </summary>
public sealed class LacVietGamesSDK : MonoBehaviour
{
    public static LacVietGamesSDK Instance { get; private set; }

    [Header("Optional")]
    [Tooltip("Enable only when this scene means gameplay has already started. Usually leave OFF and call GameplayStarted from your Play button.")]
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
        if (dontDestroyOnLoad)
            DontDestroyOnLoad(gameObject);
    }

    private void Start()
    {
        if (autoStartGameplay)
            GameplayStarted();
    }

    /// <summary>
    /// Call this when the player actually presses Play / enters gameplay.
    /// Calling it more than once is safe.
    /// </summary>
    public void GameplayStarted()
    {
        if (gameplayActive) return;
        gameplayActive = true;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayStart();
#else
        Debug.Log("[LacVietGamesSDK] Gameplay START");
#endif
    }

    /// <summary>
    /// Call this before returning to your game's main menu.
    /// The website sends END to the server and the server calculates duration/rewards.
    /// </summary>
    public void GameplayEnded()
    {
        if (!gameplayActive) return;
        gameplayActive = false;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_GameplayEnd();
#else
        Debug.Log("[LacVietGamesSDK] Gameplay END");
#endif
    }

    /// <summary>
    /// Optional: end gameplay and return from the embedded WebGL game to its LacVietGames store page.
    /// </summary>
    public void ReturnToLacVietGames()
    {
        gameplayActive = false;

#if UNITY_WEBGL && !UNITY_EDITOR
        LVG_ReturnToStore();
#else
        Debug.Log("[LacVietGamesSDK] Return to LacVietGames");
#endif
    }

    private void OnApplicationQuit()
    {
        // Useful on platforms that invoke it. WebGL browser-close safety is also handled
        // independently by the LacVietGames parent page using pagehide/sendBeacon + lease checkpoints.
        if (gameplayActive)
            GameplayEnded();
    }
}
