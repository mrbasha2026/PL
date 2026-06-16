import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ديلز تري — نظام إدارة الأرباح والخسائر",
  description: "منصة متعددة المستخدمين لإدارة ومقارنة بيانات الأرباح والخسائر مع نظام صلاحيات متكامل",
  keywords: ["P&L", "الأرباح والخسائر", "مقارنة مالية", "تحليل مالي", "Excel", "إدارة المستخدمين"],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "ديلز تري — نظام إدارة الأرباح والخسائر",
    description: "منصة متعددة المستخدمين لإدارة ومقارنة بيانات الأرباح والخسائر",
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
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
