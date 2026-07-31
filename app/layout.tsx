import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kollywood Index — Tamil cinema, scored with context",
  description: "A transparent, seven-dimension scoring index for Tamil cinema.",
  icons: { icon: "/KI/favicon.svg" },
  openGraph: { title: "Kollywood Index", description: "Tamil cinema, scored with context.", images: ["https://drgkr.github.io/KI/og.png"] },
  twitter: { card: "summary_large_image", title: "Kollywood Index", description: "Tamil cinema, scored with context.", images: ["https://drgkr.github.io/KI/og.png"] },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
