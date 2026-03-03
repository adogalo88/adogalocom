import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adogalo - Marketplace Konstruksi Terpercaya",
  description: "Platform marketplace untuk industri home improvement. Hubungkan klien dengan vendor, tukang, dan supplier terpercaya.",
  keywords: ["konstruksi", "renovasi", "tukang", "vendor", "supplier", "marketplace", "home improvement"],
  authors: [{ name: "Adogalo Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Adogalo - Marketplace Konstruksi Terpercaya",
    description: "Platform marketplace untuk industri home improvement",
    url: "https://adogalo.com",
    siteName: "Adogalo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adogalo - Marketplace Konstruksi Terpercaya",
    description: "Platform marketplace untuk industri home improvement",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <SonnerToaster position="top-right" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
