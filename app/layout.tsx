import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "InstaAuto — Instagram Automation", template: "%s | InstaAuto" },
  description: "Automate your Instagram comment replies and DMs. Grow your business on autopilot.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "only light" }} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
