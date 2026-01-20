import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "مستكشف الإسناد | صحيح البخاري",
  description: "استكشف أحاديث صحيح البخاري وسلاسل الرواة بطريقة تفاعلية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body
        className={`${ibmPlexArabic.variable} font-arabic antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
