import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Inkwell — From idea to publish-ready article",
    template: "%s | Inkwell",
  },
  description:
    "Plan every section, write alongside AI, and finish thoughtful articles faster without losing your voice.",
  keywords: [
    "AI writing assistant",
    "article writing",
    "blog writing",
    "content outline",
  ],
  icons: {
    icon: "/images/inkwell-icon.png",
  },
  openGraph: {
    title: "Inkwell — From idea to publish-ready article",
    description:
      "A guided AI writing workspace that keeps your ideas, structure, and voice connected.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffdfa",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${newsreader.variable}`}>
        {children}
      </body>
    </html>
  );
}
