const fs = require("fs");
const path = require("path");

const withIconKitchenAssets = require("./plugins/withIconKitchenAssets");

// Write google-services.json from env var during EAS cloud builds
if (process.env.GOOGLE_SERVICES_JSON) {
  fs.writeFileSync(
    path.resolve(__dirname, "google-services.json"),
    process.env.GOOGLE_SERVICES_JSON
  );
}

// Fail the build instead of shipping an app that crashes on launch (ConvexReactClient throws if URL is missing).
if (process.env.EAS_BUILD === "true" || process.env.EAS_BUILD_PROFILE) {
  const required = [
    "EXPO_PUBLIC_CONVEX_URL",
    "EXPO_PUBLIC_CONVEX_SITE_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `EAS build is missing required env vars: ${missing.join(", ")}. ` +
        "Add them with eas env:create (scope: project, same environment as your build profile, e.g. production). " +
        "See https://docs.expo.dev/build-reference/variables/",
    );
  }
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Stageworth",
  // Must match the slug of the EAS project linked via extra.eas.projectId (expo.dev/.../theatre-diary).
  slug: "theatre-diary",
  version: "1.2.0",
  orientation: "portrait",
  icon: "./assets/icon-kitchen-v1/ios/AppIcon~ios-marketing.png",
  scheme: "stageworth",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.theatrediary.app",
    icon: "./assets/icon-kitchen-v1/ios/AppIcon~ios-marketing.png",
    buildNumber: "3",
    usesAppleSignIn: true,
    appleTeamId: "M8M7T576K8",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Stageworth uses your location to show nearby theatres and venues on the map.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.theatrediary.app",
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-kitchen-v1/android/res/mipmap-xxxhdpi/ic_launcher_foreground.png",
      backgroundImage:
        "./assets/icon-kitchen-v1/android/res/mipmap-xxxhdpi/ic_launcher_background.png",
      backgroundColor: "#536DFE",
      monochromeImage:
        "./assets/icon-kitchen-v1/android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    output: "static",
    favicon: "./assets/icon-kitchen-v1/web/icon-192.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Stageworth needs access to your photos so you can set a profile picture.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.907289279863-tl52ra1s7itgbhqogjo93ub1qdlohgfh",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/icon-kitchen-v1/web/icon-512.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#536DFE",
        dark: {
          backgroundColor: "#1a0d2e",
        },
      },
    ],
    withIconKitchenAssets,
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "236dda1b-8b4c-492c-9fce-b5aac73fd282",
    },
  },
};
