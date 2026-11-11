import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lost Cause: we specialise in lost causes",
  description:
    "Snap the scene, spend a credit, follow the circles. AI that finds your keys, remote and that one sock.",
};

export const viewport: Viewport = {
  themeColor: "#fff4e0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${mono.variable} antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
