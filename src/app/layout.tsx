import { Providers } from "@/components/providers";
import PwaRegister from "@/components/shared/PwaRegister";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WEBSITE_DETAILS } from "@/lib/constants";
import ReduxProvider from "@/redux/ReduxProvider";
import type { Metadata, Viewport } from "next";
import {
  Hind_Siliguri,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

// Primary English & numeric font (variable font): modern, friendly fintech clarity
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

// Primary Bangla font: clean UI legibility that pairs smoothly with Plus Jakarta Sans
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hind-siliguri",
});

// Monospace font (variable font) for transaction IDs, codes, and aligned figures
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jb-mono",
});

export const metadata: Metadata = {
  title: WEBSITE_DETAILS.SITE_NAME,
  description: WEBSITE_DETAILS.SITE_DESCRIPTION,
  applicationName: WEBSITE_DETAILS.SITE_ONLY_NAME,
  appleWebApp: {
    capable: true,
    title: WEBSITE_DETAILS.SITE_ONLY_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#046c4e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${hindSiliguri.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ReduxProvider>
          <TooltipProvider>
            <svg
              width="0"
              height="0"
              className="absolute pointer-events-none -z-10"
            >
              <defs>
                <linearGradient
                  id="golden-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#FC9607" />
                  <stop offset="50%" stopColor="#FDAB05" />
                  <stop offset="100%" stopColor="#FFCB3D" />
                </linearGradient>
              </defs>
            </svg>
            <Providers>{children}</Providers>
            <PwaRegister />
          </TooltipProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
