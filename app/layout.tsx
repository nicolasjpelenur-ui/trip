import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { OnboardingHost } from "@/components/OnboardingHost";

const geist = Geist({ subsets: ["latin"] });

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
      <body className={`${geist.className} min-h-full bg-[#faf8f5]`}>
        <DesktopSidebar />
        <OnboardingHost />
        <div className="page-content min-h-screen">
          <div className="page-enter">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
