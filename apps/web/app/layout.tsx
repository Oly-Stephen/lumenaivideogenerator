import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/server";
import { AppBar } from "./AppBar";
import { AppShell } from "./AppShell";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata = {
  title: { default: BRAND, template: `%s · ${BRAND}` },
  description: "Narrated explainer videos from a topic or a script.",
};

export const viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>
          {user
            ? <AppShell email={user.email ?? null}>{children}</AppShell>
            : <><AppBar signedIn={false} email={null} />{children}</>}
        </ToastProvider>
      </body>
    </html>
  );
}
