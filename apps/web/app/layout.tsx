import Link from "next/link";
import type { ReactNode } from "react";
import { CreditBalance } from "./CreditBalance";
import "./globals.css";

export const metadata = {
  title: "Lumen",
  description: "Narrated explainer videos from a topic or a script.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 pt-4">
          <Link href="/" className="font-semibold">Lumen</Link>
          <CreditBalance />
        </header>
        {children}
      </body>
    </html>
  );
}
