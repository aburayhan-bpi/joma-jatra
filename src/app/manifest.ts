import type { MetadataRoute } from "next";

/**
 * Web App Manifest (/manifest.webmanifest)
 * Enables native-like "Add to Home Screen" installation on Android, iOS, and Desktop browsers.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JomaJatra — Group Savings Ledger",
    short_name: "JomaJatra",
    description:
      "Transparent friend-group savings ledger for deposits, returns, account tracking, and monthly goals.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6faf7",
    theme_color: "#046c4e",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
