import { PwaRegister } from "@/components/PwaRegister";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Siyer Öğrenci Bilgi Sistemi",
  description: "Siyer Öğrenci Bilgi Sistemi — ders programı, ödevler, notlar ve devam takibi.",
  manifest: "/manifest.json", // <-- 1. BURASI EKLENDİ
};

export const viewport = {
  themeColor: "#344e41", // Üst bar rengi için
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister /> {/* <-- 2. BURASI EKLENDİ */}
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

