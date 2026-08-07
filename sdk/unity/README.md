# LacVietGames Unity WebGL Bridge

## Install once per Unity game

Copy these two files into the Unity project:

- `LacVietGamesBridge.cs` -> any Scripts folder.
- `Plugins/WebGL/LacVietGamesBridge.jslib` -> exactly under `Assets/Plugins/WebGL/`.

Create one GameObject named `LacVietGames` and attach `LacVietGamesBridge`.

### Game opens directly into gameplay
Enable **Auto Start Gameplay** in the Inspector. No game-specific ID, API URL, token or secret is required.

### Game has its own main menu
Leave **Auto Start Gameplay** disabled.

Connect the game's Play button to:

`LacVietGamesBridge.GameplayStarted()`

Connect Back To Menu / End Game to:

`LacVietGamesBridge.GameplayEnded()`

If the game has a button that exits the embedded game and returns to the LacVietGames store, connect it to:

`LacVietGamesBridge.ReturnToLacVietGames()`

## What happens outside Unity

The LacVietGames parent page owns authentication and server timing. Unity only sends START/END signals through `postMessage`.

The web page creates the server play session, sends a lightweight lease checkpoint approximately every two minutes, and sends END on normal exit. `pagehide`/`sendBeacon` and server stale-session handling cover browser close, crash, power loss and missing END cases.

The server, not Unity, calculates credited play time and task rewards. Unity never sends a duration or a coin amount.