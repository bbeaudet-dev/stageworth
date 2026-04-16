# Dev client + Google Sign-In (quick reset)

Use this when iOS shows missing URL schemes, `invalid_audience`, or simulators/emulators run an **old native** build while JS is new.

## Principles

- **`bun run dev:expo`** serves JS only. It does **not** update native config (URL schemes, OAuth wiring, `google-services.json`).
- **`npx expo run:ios` / `npx expo run:android`** rebuild and **install** the native dev client on a specific device.
- **iOS:** `GoogleSignin.configure({ iosClientId, webClientId })` must match **one Google Cloud project**. The **reversed** iOS URL scheme must match `iosClientId` and appear in native `Info.plist` (see `app.config.js` plugin + `ios/Stageworth/Info.plist` after prebuild).
- **Android:** same `webClientId` in JS; package `com.theatrediary.app` + **SHA-1** must match an Android OAuth client in Google Cloud.

## iOS simulator

1. Uninstall **Stageworth** on the simulator (or wipe if needed).
2. Boot **one** simulator if you want predictable installs.
3. From repo root:
   ```bash
   npx expo run:ios --device "Your Simulator Name"
   ```
4. Start Metro:
   ```bash
   bun run dev:expo
   ```
5. Open the app on the simulator; connect to your dev server. If the CLI errors on “open” but the app installed, launching manually is fine.

**Drift:** If `app.config.js` has the right `iosUrlScheme` but sign-in still complains, check `ios/Stageworth/Info.plist` `CFBundleURLTypes` for `com.googleusercontent.apps....` and align with your current iOS client ID, then rebuild with step 3.

## Android emulator / device

1. Uninstall old build: Settings → Apps → Uninstall, or `adb uninstall com.theatrediary.app`.
2. List targets and install:
   ```bash
   npx expo run:android --device
   ```
   Or pass the device id from `adb devices`.
3. Run Metro (`bun run dev:expo`), open the app, attach to dev server.

**Google errors on Android:** Compare your **debug** keystore SHA-1 to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) Android OAuth clients for this package; add the fingerprint that matches the build you run.

## Google Cloud / Convex sanity check

- **Web client** ID + secret → Convex `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Better Auth).
- **iOS client** → `iosClientId` in app code; **reversed** scheme in `app.config.js` (and native plist after sync).
- All of the above stay in **one** GCP project to avoid `invalid_audience`.

## Optional

- `bun run dev:expo -- --clear` — clears Metro cache when JS looks stale; does **not** fix native plist or missing URL schemes.
