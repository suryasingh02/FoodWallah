import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartContext";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bharat Burger",
    template: "%s | Bharat Burger",
  },
  description: "Order street food from Bharat Burger.",
  applicationName: "Bharat Burger",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bharat Burger",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <CartProvider>
          <AppShell>{children}</AppShell>
          <BottomNav isVendor={user?.role === "vendor"} />
        </CartProvider>
      </body>
    </html>
  );
}
