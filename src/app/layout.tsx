import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";


const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INVICTA | Medhavi Skills University",
  description: "Register teams, follow fixtures and live scores, and view inter-department sports standings for MSU Invicta.",
};


import { AuthGuard } from "@/components/auth-guard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground font-sans overflow-x-hidden">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}





