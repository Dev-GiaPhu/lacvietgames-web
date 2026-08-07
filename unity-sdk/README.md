# LacVietGames Unity WebGL SDK

Bộ bridge tối thiểu để một Unity WebGL game dùng hệ thống tính thời gian chơi và nhiệm vụ của LacVietGames.

## Cài đặt

1. Copy `LacVietGamesSDK.cs` vào `Assets/LacVietGames/`.
2. Copy `LacVietGamesWebGL.jslib` vào `Assets/Plugins/WebGL/`.
3. Tạo một GameObject tên `LacVietGamesSDK` trong scene đầu tiên và gắn component `LacVietGamesSDK`.
4. Để `Auto Start Gameplay` tắt nếu game có Main Menu riêng.
5. Ở nút Play của game, thêm `LacVietGamesSDK.GameplayStarted()`.
6. Ở nút Back To Menu, thêm `LacVietGamesSDK.GameplayEnded()` trước khi đổi scene/menu.
7. Nếu có nút thoát hẳn khỏi game về store, gọi `LacVietGamesSDK.ReturnToLacVietGames()`.

## Ví dụ code nút Play

```csharp
public void PlayGame()
{
    LacVietGamesSDK.Instance?.GameplayStarted();
    // Load gameplay scene ở đây.
}
```

## Ví dụ code nút về Menu

```csharp
public void BackToMenu()
{
    LacVietGamesSDK.Instance?.GameplayEnded();
    // Load Main Menu scene ở đây.
}
```

## Cơ chế server

- Website tạo play session khi người dùng mở trang Play.
- Unity gửi START/END lifecycle qua `postMessage` cho trang cha, không nhận token tài khoản.
- Trang cha gửi checkpoint lease rất nhẹ theo chu kỳ để xử lý crash, mất điện, kill browser hoặc sleep.
- END bình thường dùng thời gian server.
- Nếu END bị mất, backend chỉ tính tới checkpoint hợp lệ gần nhất rồi đánh dấu session `Abandoned`.
- Lạc Coin và tiến độ nhiệm vụ do backend tự tính; game không được gửi số phút hoặc số coin.

Không đưa API key, token người dùng hoặc logic giá trị phần thưởng vào Unity build.
