import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kollywood Index — Find films worth your time",
  description: "Search, sort and explore Tamil films through a transparent seven-measure rating method.",
  icons: { icon: "/KI/favicon.svg" },
  openGraph: { title: "Kollywood Index", description: "Find films worth your time.", images: ["https://drgkr.github.io/KI/og-v2.png"] },
  twitter: { card: "summary_large_image", title: "Kollywood Index", description: "Find films worth your time.", images: ["https://drgkr.github.io/KI/og-v2.png"] },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
