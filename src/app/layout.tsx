import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "مقارنة الأرباح والخسائر — P&L Comparison Dashboard",
  description: "لوحة تفاعلية لعرض ومقارنة بيانات الأرباح والخسائر لعدة شركات مع رفع البيانات من Excel",
  keywords: ["P&L", "الأرباح والخسائر", "مقارنة مالية", "تحليل مالي", "Excel"],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "مقارنة الأرباح والخسائر — P&L Comparison Dashboard",
    description: "لوحة تفاعلية لعرض ومقارنة بيانات الأرباح والخسائر لعدة شركات",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
