const fs = require("fs");
const path = require("path");

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
  name: "Theatre Diary",
  slug: "theatre-diary",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "theatrediary",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.theatrediary.app",
    buildNumber: "2",
    usesAppleSignIn: true,
    appleTeamId: "M8M7T576K8",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Theatre Diary uses your location to show nearby theatres and venues on the map.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.theatrediary.app",
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundColor: "#536DFE",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
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
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.436999476070-l97q7s44m1p9irm4ve8objjm0dt11pgn",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#536DFE",
        dark: {
          backgroundColor: "#1a0d2e",
        },
      },
    ],
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
