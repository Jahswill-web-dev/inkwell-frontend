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
    default: "Inkwell — Turn your expertise into articles that sound like you",
    template: "%s | Inkwell",
  },
  description:
    "Talk through your ideas with an AI interviewer. Inkwell turns your expertise into an article draft you can review, refine, and export in your own voice.",
  keywords: [
    "consultant article writing",
    "AI interview",
    "thought leadership articles",
    "AI writing for consultants",
  ],
  icons: {
    icon: "/images/inkwell-icon.png",
  },
  openGraph: {
    title: "Inkwell — Turn your expertise into articles that sound like you",
    description:
      "Speak about what you know, then review and refine an article draft that keeps your perspective at the center.",
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
