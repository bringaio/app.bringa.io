import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { appConfig } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.app.name,
  description: appConfig.app.description,
  metadataBase: new URL(appConfig.app.canonicalUrl),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: appConfig.branding.iconPath,
    apple: appConfig.branding.appleTouchIconPath,
  },
  appleWebApp: {
    capable: true,
    title: appConfig.app.shortName,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={appConfig.app.defaultLocale} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
