import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Striply — Clean files. No traces.",
  description:
    "Striply removes hidden data from your files privately and instantly. No uploads. No servers. Just clean files.",
  keywords: ["metadata remover", "exif remover", "privacy", "file cleaner"],
  openGraph: {
    title: "Striply",
    description: "Clean files. No traces.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="en">
    <body className={inter.className}>{children}</body>
  </html>
);
}
