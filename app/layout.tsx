import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-vazirmatn",
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
      className={vazirmatn.variable}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-on-surface font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
