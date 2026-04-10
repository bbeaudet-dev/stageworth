# Physical iPhone (USB) dev testing

Use this when you want to run the local dev build on your real iPhone (not TestFlight).

## One-time setup

1. Connect iPhone to Mac with USB and tap **Trust This Computer** on the phone.
2. Open Xcode once and confirm your iPhone appears under **Window -> Devices and Simulators**.
3. In Xcode, sign in to your Apple ID (**Xcode -> Settings -> Accounts**) if needed.
4. On iPhone, enable **Developer Mode** if prompted (Settings -> Privacy & Security -> Developer Mode).

## Run on physical iPhone

1. From repo root, install the native dev client on your phone:
   ```bash
   npx expo run:ios --device
   ```
   If multiple devices appear, pick your iPhone.
2. Start Metro in a separate terminal:
   ```bash
   bun run dev:expo
   ```
3. Keep phone + Mac on the same network for easiest dev-server connection.
4. Open the app on iPhone. If needed, open Expo dev menu and point it to the running Metro server.

## If build/install fails

- In Xcode, select your iPhone target and retry; accept any signing/provisioning prompts.
- If app immediately crashes or native config seems stale, uninstall app on iPhone and rerun:
  ```bash
  npx expo run:ios --device
  ```
- If `npx expo run:ios` cannot find tooling, run:
  ```bash
  npx expo prebuild --platform ios
  ```
  then rerun the install command.

## Google/Convex auth notes

- Physical iPhone dev does **not** require a special Google Cloud environment.
- Keep the same iOS bundle id + OAuth client config you already use (see `docs/SIMULATORS_FIX.md`).
- "Not authenticated" from Convex usually means the user is not signed in in that app install/session; sign in again on device.

