import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { OnboardingHost } from "@/components/OnboardingHost";
import { PageTransition } from "@/components/PageTransition";
import { ToastProvider } from "@/components/Toast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { I18nProvider } from "@/lib/i18n";
import { PreferencesProvider } from "@/lib/preferences";

const geist = Geist({ subsets: ["latin"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trip Coordinator",
  description: "Coordinate visits and trips with family",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trip",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5b4cf5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} ${playfair.variable} min-h-full bg-[#faf7f2]`}>
        <PreferencesProvider>
          <I18nProvider>
            <ToastProvider>
              <ServiceWorkerRegister />
              <DesktopSidebar />
              <OnboardingHost />
              <div className="page-content min-h-screen">
                <PageTransition>{children}</PageTransition>
              </div>
            </ToastProvider>
          </I18nProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
