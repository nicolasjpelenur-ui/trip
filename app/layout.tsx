import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { OnboardingHost } from "@/components/OnboardingHost";
import { PageTransition } from "@/components/PageTransition";

const geist = Geist({ subsets: ["latin"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trip Coordinator",
  description: "Coordinate visits and trips with family",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} ${playfair.variable} min-h-full bg-[#faf7f2]`}>
        <DesktopSidebar />
        <OnboardingHost />
        <div className="page-content min-h-screen">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
