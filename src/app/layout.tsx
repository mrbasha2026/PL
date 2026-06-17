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
  title: "ديلز تري — نظام التحليل المالي",
  description: "منصة موحدة لإدارة الشركات والمصروفات وقيود الأرباح والخسائر مع تحليل ذكي وتنبؤ إحصائي مبني على أسس رياضية ومحاسبية",
  keywords: ["P&L", "الأرباح والخسائر", "مقارنة مالية", "تحليل مالي", "Excel", "إدارة المستخدمين", "مصروفات مقدمة", "تنبؤ", "Supabase"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "48x48", type: "image/png" },
      { url: "/logo.png", sizes: "96x96", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Dealz Tree",
    statusBarStyle: "default",
  },
  applicationName: "Dealz Tree",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "ديلز تري — نظام التحليل المالي",
    description: "منصة موحدة لإدارة الشركات والمصروفات وقيود الأرباح والخسائر مع تحليل ذكي",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#4CAF50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
