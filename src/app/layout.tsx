import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";

import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--nx-font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--nx-font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "AIONIX NEXUS", template: "%s · NEXUS" },
  description: "Painel central de comando do ecossistema AIONIX.",
  applicationName: "AIONIX NEXUS",
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: "NEXUS", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07080b" },
  ],
};

/** Aplica o tema antes da primeira pintura — sem flash entre light e dark. */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("nexus-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.dataset.themePref=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
