import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { SITE, THEMES, type ThemeName } from "@/config/site";
import "./globals.css";

// next/font downloads the fonts at BUILD time and serves them from this app, so the CSP stays font-src 'self'.
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "greek"] });
const mono = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin", "greek"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.tagline,
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#03060f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get("theme")?.value as ThemeName | undefined;
  const theme = saved && THEMES.includes(saved) ? saved : SITE.defaultTheme;
  return (
    <html lang={SITE.lang} data-theme={theme} className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
