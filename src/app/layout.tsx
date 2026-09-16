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
    default: "Inkwell — Client expertise, ready for your content team",
    template: "%s | Inkwell",
  },
  description:
    "Give content agencies an AI-led client interview, structured source material, and a writer-ready path from article setup to publish-ready copy.",
  keywords: [
    "content agency software",
    "client interview",
    "editorial workflow",
    "AI content writing",
  ],
  icons: {
    icon: "/images/inkwell-icon.png",
  },
  openGraph: {
    title: "Inkwell — Client expertise, ready for your content team",
    description:
      "A guided agency workspace for turning client expertise into stronger content.",
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
