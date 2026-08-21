import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-vazirmatn",
});

const pinar = localFont({
  src: "./fonts/Pinar-ExtraBold.woff2",
  display: "swap",
  style: "normal",
  weight: "800",
  variable: "--font-pinar",
});

const materialSymbols = localFont({
  src: "./fonts/MaterialSymbolsOutlined-Gcamp.woff2",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  style: "normal",
  weight: "100 700",
  variable: "--font-material-symbols",
});

export const metadata: Metadata = {
  title: "اپ G-camp",
  description: "درس بخون، امتیاز بگیر و خودتو با رقبات مقایسه کن",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f3056",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      // تمِ فعال: «brand» (پیش‌فرض). برای بازگشت به تمِ قبلی مقدار را "legacy" کنید
      // یا متغیرِ محیطی NEXT_PUBLIC_THEME=legacy را تنظیم کنید (بدون تغییر کد).
      data-theme={process.env.NEXT_PUBLIC_THEME ?? "brand"}
      className={`${vazirmatn.variable} ${pinar.variable} ${materialSymbols.variable}`}
    >
      <body className="min-h-screen bg-background text-on-surface font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
