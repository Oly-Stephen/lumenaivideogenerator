import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Lumen",
  description: "Narrated explainer videos from a topic or a script.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
