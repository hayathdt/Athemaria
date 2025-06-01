import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider } from "@/components/theme-provider";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen } from "lucide-react";

// Configure fonts
import { Lora, Inter } from "next/font/google";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Athemaria - A Modern Story Platform",
  description:
    "Share and discover amazing stories from writers around the world",
  keywords: "stories, writing, reading, community, platform",
  authors: [{ name: "Athemaria", url: "https://www.athemaria.com" }],
  creator: "hayat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${lora.variable} ${inter.variable}`} suppressHydrationWarning={true}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="h-full bg-gray-50 text-gray-800 font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SidebarProvider>
              <MainLayout>
                {children}
              </MainLayout>
            </SidebarProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

