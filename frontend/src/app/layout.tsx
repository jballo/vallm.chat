import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemesProvider } from "@/components/theme-provider";
import { Toaster } from "@/atoms/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "T∞.chat",
  description: "T3 Chat Clone, but INFINITE",
  icons:
    "https://414duiw16e.ufs.sh/f/7d2Z7EA8l4q6yvzq3uHf5CtNjYgk640sHVGoqbvWn7QREIUS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemesProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkProvider>
            <ConvexClientProvider>
              <Toaster position="top-center" richColors closeButton />
              {children}
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemesProvider>
      </body>
    </html>
  );
}
