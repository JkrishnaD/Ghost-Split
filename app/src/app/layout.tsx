import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import AppWalletProvider from "../components/AppWalletProvider";
import NavbarWallet from "../components/NavbarWallet";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "GhostSplit",
  description: "Split expenses, settle privately on-chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-bg text-white">
        <AppWalletProvider>
          <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b border-white/[0.07] bg-bg/90 backdrop-blur-md">
            <span className="font-heading text-xl font-extrabold tracking-tight">
              Ghost<span className="text-accent">Split</span>
            </span>
            <NavbarWallet />
          </header>
          <main className="flex-1 max-w-225 w-full mx-auto px-5 py-10">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: "#0e1117",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                fontFamily: "var(--font-body)",
              },
            }}
          />
        </AppWalletProvider>
      </body>
    </html>
  );
}
