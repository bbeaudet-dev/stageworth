const fs = require("fs");
const path = require("path");

// Write google-services.json from env var during EAS cloud builds
if (process.env.GOOGLE_SERVICES_JSON) {
  fs.writeFileSync(
    path.resolve(__dirname, "google-services.json"),
    process.env.GOOGLE_SERVICES_JSON
  );
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Theatre Diary",
  slug: "theatre-diary",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "theatrediary",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.theatrediary.app",
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
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
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
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
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
