#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;

public sealed class LacVietGamesSetupWindow : EditorWindow
{
    private const string GuideUrl = "https://dev-giaphu.github.io/lacvietgames-web/sdk-guide.html";
    private string integrationId = "";
    private int gameStartMode;

    private static readonly string[] StartModes =
    {
        "Có Boot / Bootstrap Scene",
        "Main Menu là scene đầu tiên",
        "Mở game là vào gameplay ngay"
    };

    [MenuItem("Tools/LacVietGames/Setup")]
    public static void Open()
    {
        var window = GetWindow<LacVietGamesSetupWindow>(true, "LacVietGames Setup");
        window.minSize = new Vector2(500, 360);
        window.Show();
    }

    private void OnGUI()
    {
        GUILayout.Label("LacVietGames WebGL SDK", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox(
            "Người chơi KHÔNG cần nút Login trong game. Khi game chạy từ LacVietGames, SDK tự đồng bộ tài khoản đang đăng nhập trên website. Nếu người chơi chưa đăng nhập, website sẽ mở bảng đăng nhập tự động.",
            MessageType.Info);

        GUILayout.Space(6);
        integrationId = EditorGUILayout.TextField("Integration ID", integrationId);
        gameStartMode = EditorGUILayout.Popup("Cấu trúc game", gameStartMode, StartModes);

        GUILayout.Space(8);
        var sceneName = SceneManager.GetActiveScene().name;
        if (gameStartMode == 0)
        {
            EditorGUILayout.HelpBox(
                $"Scene hiện tại: {sceneName}\nHãy mở BOOT/BOOTSTRAP scene rồi bấm Setup. SDK sẽ sống xuyên scene. GameplayStarted() phải được gọi khi người chơi thực sự bắt đầu chơi.",
                MessageType.None);
        }
        else if (gameStartMode == 1)
        {
            EditorGUILayout.HelpBox(
                $"Scene hiện tại: {sceneName}\nHãy mở MAIN MENU scene rồi bấm Setup. Không Setup lại ở Gameplay/Result. Gọi GameplayStarted() khi bấm Play và GameplayEnded() khi trận kết thúc.",
                MessageType.None);
        }
        else
        {
            EditorGUILayout.HelpBox(
                $"Scene hiện tại: {sceneName}\nGame mở vào gameplay ngay: Setup trong scene này. SDK sẽ tự gọi GameplayStarted() khi khởi động.",
                MessageType.None);
        }

        GUILayout.Space(10);
        using (new EditorGUI.DisabledScope(string.IsNullOrWhiteSpace(integrationId) || !integrationId.Trim().StartsWith("lvg_int_")))
        {
            if (GUILayout.Button("Setup SDK in Current Scene", GUILayout.Height(40))) Setup();
        }

        GUILayout.Space(6);
        if (GUILayout.Button("Open Full Integration Guide", GUILayout.Height(28))) Application.OpenURL(GuideUrl);

        GUILayout.Space(8);
        EditorGUILayout.HelpBox(
            "Không đặt password, bearer token, R2 key hoặc Game Server Key trong Unity. Integration ID là định danh công khai; quyền thật vẫn do LacVietGames server kiểm soát.",
            MessageType.Warning);
    }

    private void Setup()
    {
#pragma warning disable CS0618
        var bridge = Object.FindObjectOfType<LacVietGamesBridge>();
#pragma warning restore CS0618
        if (bridge == null)
        {
            var go = new GameObject("LacVietGames");
            Undo.RegisterCreatedObjectUndo(go, "Create LacVietGames SDK");
            bridge = Undo.AddComponent<LacVietGamesBridge>(go);
        }

        var so = new SerializedObject(bridge);
        so.FindProperty("integrationId").stringValue = integrationId.Trim();
        so.FindProperty("autoStartGameplay").boolValue = gameStartMode == 2;
        so.FindProperty("dontDestroyOnLoad").boolValue = true;
        so.ApplyModifiedProperties();
        EditorUtility.SetDirty(bridge);
        Selection.activeObject = bridge.gameObject;
        EditorGUIUtility.PingObject(bridge.gameObject);

        Debug.Log(gameStartMode == 2
            ? "[LacVietGames] Setup complete. Web account auto-sync enabled; gameplay starts automatically in this scene."
            : "[LacVietGames] Setup complete. Web account auto-sync enabled. Call GameplayStarted/GameplayEnded from your game flow.");
    }
}
#endif
