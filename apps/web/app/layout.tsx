import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { requireUser } from "@/lib/server";
import { AppBar } from "./AppBar";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata = {
  title: { default: "Lumen", template: "%s · Lumen" },
  description: "Narrated explainer videos from a topic or a script.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>
          <AppBar signedIn={!!user} email={user?.email ?? null} />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
