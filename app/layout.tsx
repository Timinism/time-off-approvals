import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Time Off",
    template: "%s · Time Off",
  },
  description:
    "Request PTO or sick time. Your Microsoft Entra manager approves it, and the history stays here.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#100e16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
