import type { MetadataRoute } from "next";
import {
  BRAND_SPLASH_BACKGROUND,
  BRAND_THEME_COLOR,
} from "@/lib/brand-colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Theatre Diary",
    short_name: "Theatre Diary",
    description:
      "Never miss a show, rank your favorites, and plan your next theatre trip.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_SPLASH_BACKGROUND,
    theme_color: BRAND_THEME_COLOR,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
