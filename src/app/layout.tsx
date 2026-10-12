import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piggybank — a little money, a little more possibility",
  description: "A simple place to keep track of the cash in your piggybank.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Piggybank", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f6f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
