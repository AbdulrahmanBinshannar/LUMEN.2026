import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumen — AI-Powered Football Platform",
  description:
    "AI-powered analytics, live predictions, and a passionate fan community — all in one place. The smartest football platform.",
  keywords: ["football", "AI analytics", "predictions", "fan community", "SPL", "live match"],
};

import { ThemeProvider } from "./theme-provider";
import { I18nProvider } from "./i18n";
import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col pt-16" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <I18nProvider>
          <ThemeProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
