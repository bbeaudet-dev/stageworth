/**
 * Expo’s icon plugin always starts from a small set of sources in app.config
 * (`icon`, `ios.icon`, `android.adaptiveIcon.*`): it generates an initial
 * AppIcon.appiconset + mipmaps during prebuild. This plugin runs in the
 * `finalized` phase and overwrites those outputs with Icon Kitchen’s full
 * per-slot iOS PNGs and per-density Android mipmaps so the OS still picks the
 * best size, but pixels match Kitchen exactly.
 *
 * Source folder: `assets/icon-kitchen-v1` — full per-slot iOS + mipmap Android
 * tree (Icon Kitchen). `icon-kitchen-v0` holds single-file rasters for Expo config
 * (see app.config.js); v2 is reference only.
 */
const fs = require("fs");
const path = require("path");
const { withFinalizedMod } = require("expo/config-plugins");

const KITCHEN_REL = "assets/icon-kitchen-v1";

function rmRecursive(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/** Must not walk `Pods/` — a dependency can ship its own AppIcon.appiconset first. */
function getAppTargetAppIconSet(platformProjectRoot, projectName) {
  if (!projectName) return null;
  const appIcon = path.join(
    platformProjectRoot,
    projectName,
    "Images.xcassets",
    "AppIcon.appiconset",
  );
  const contents = path.join(appIcon, "Contents.json");
  return fs.existsSync(contents) ? appIcon : null;
}

/** Expo still sets android:roundIcon; Icon Kitchen often omits ic_launcher_round — duplicate legacy icon. */
function ensureRoundLauncherCopies(resDest) {
  for (const name of fs.readdirSync(resDest)) {
    if (!name.startsWith("mipmap-") || name === "mipmap-anydpi-v26") continue;
    const dir = path.join(resDest, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const legacy = path.join(dir, "ic_launcher.png");
    const round = path.join(dir, "ic_launcher_round.png");
    if (fs.existsSync(legacy) && !fs.existsSync(round)) {
      fs.copyFileSync(legacy, round);
    }
  }
}

function withIconKitchenIos(config) {
  return withFinalizedMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const { projectName } = cfg.modRequest;
      const src = path.join(projectRoot, KITCHEN_REL, "ios");
      if (!fs.existsSync(iosRoot) || !fs.existsSync(src)) {
        return cfg;
      }
      const appIcon = getAppTargetAppIconSet(iosRoot, projectName);
      if (!appIcon) {
        return cfg;
      }
      for (const name of fs.readdirSync(appIcon)) {
        fs.unlinkSync(path.join(appIcon, name));
      }
      for (const name of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, name), path.join(appIcon, name));
      }
      return cfg;
    },
  ]);
}

function withIconKitchenAndroid(config) {
  return withFinalizedMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const resDest = path.join(androidRoot, "app", "src", "main", "res");
      const srcRes = path.join(projectRoot, KITCHEN_REL, "android", "res");
      if (!fs.existsSync(resDest) || !fs.existsSync(srcRes)) {
        return cfg;
      }
      for (const e of fs.readdirSync(srcRes, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const name = e.name;
        if (!name.startsWith("mipmap-")) continue;
        const destDir = path.join(resDest, name);
        rmRecursive(destDir);
        copyRecursive(path.join(srcRes, name), destDir);
      }
      const anydpi = path.join(srcRes, "mipmap-anydpi-v26");
      if (fs.existsSync(anydpi)) {
        const destAny = path.join(resDest, "mipmap-anydpi-v26");
        rmRecursive(destAny);
        copyRecursive(anydpi, destAny);
      }
      ensureRoundLauncherCopies(resDest);
      return cfg;
    },
  ]);
}

module.exports = function withIconKitchenAssets(config) {
  config = withIconKitchenIos(config);
  config = withIconKitchenAndroid(config);
  return config;
}
