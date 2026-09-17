import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashless — Quit Smoking",
  description: "Every cigarette you skip, you get richer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto min-h-screen w-full max-w-md bg-surface-50 shadow-xl">{children}</div>
      </body>
    </html>
  );
}
