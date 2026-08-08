#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

public sealed class LacVietGamesSetupWindow : EditorWindow
{
    private string integrationId = "";
    private bool autoStartGameplay;

    [MenuItem("Tools/LacVietGames/Setup")]
    public static void Open()
    {
        var window = GetWindow<LacVietGamesSetupWindow>(true, "LacVietGames Setup");
        window.minSize = new Vector2(460, 260);
        window.Show();
    }

    private void OnGUI()
    {
        GUILayout.Label("LacVietGames WebGL SDK", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox("Dán Integration ID công khai do LacVietGames Admin cấp. Không dán API token, Secret Access Key hoặc Game Server Key vào Unity.", MessageType.Info);
        integrationId = EditorGUILayout.TextField("Integration ID", integrationId);
        autoStartGameplay = EditorGUILayout.Toggle(new GUIContent("Auto Start Gameplay", "Chỉ bật nếu game vào gameplay ngay khi mở. Nếu có Main Menu, để tắt và gọi GameplayStarted từ nút Play."), autoStartGameplay);

        GUILayout.Space(12);
        using (new EditorGUI.DisabledScope(string.IsNullOrWhiteSpace(integrationId) || !integrationId.Trim().StartsWith("lvg_int_")))
        {
            if (GUILayout.Button("Setup SDK in Current Scene", GUILayout.Height(38))) Setup();
        }
        GUILayout.Space(8);
        EditorGUILayout.HelpBox("Sau Setup: gắn trực tiếp các Button Unity UI vào RequestLogin / RefreshWallet / GameplayStarted / GameplayEnded / ClaimReward. Không cần tự viết code HTTP hay lưu token.", MessageType.None);
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
        so.FindProperty("autoStartGameplay").boolValue = autoStartGameplay;
        so.FindProperty("dontDestroyOnLoad").boolValue = true;
        so.ApplyModifiedProperties();
        EditorUtility.SetDirty(bridge);
        Selection.activeObject = bridge.gameObject;
        EditorGUIUtility.PingObject(bridge.gameObject);
        Debug.Log("[LacVietGames] Setup complete. Integration ID configured; no secret was stored in the project.");
    }
}
#endif
