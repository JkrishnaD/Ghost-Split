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
      <body className="flex flex-col min-h-screen bg-bg text-white antialiased">
        <AppWalletProvider>
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(102,252,241,0.8) 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px]" />
          </div>

          <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />

            <div className="flex items-center gap-2.5">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-accent/25 bg-accent/[0.08] shadow-[0_0_10px_rgba(102,252,241,0.12)]">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#66fcf1"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 12V22H4V12" />
                  <path d="M22 7H2v5h20V7z" />
                  <path d="M12 22V7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <span className="font-heading text-[17px] font-extrabold tracking-tight">
                Ghost<span className="text-accent">Split</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                Devnet
              </div>
              <div id="wallet-portal" />
              <NavbarWallet />
            </div>
          </header>

          <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-5 py-10">
            {children}
          </main>

          <footer className="relative z-10 border-t border-white/[0.04] px-6 py-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              <p className="text-[11px] text-white/15">
                © 2025 GhostSplit · Built on{" "}
                <span className="text-accent/30">Solana</span> ·{" "}
                <span className="text-white/20">MagicBlock ER</span>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                All systems operational
              </div>
            </div>
          </footer>

          <Toaster
            position="bottom-right"
            richColors
            theme="dark"
            toastOptions={{
              style: {
                background: "#0d1117",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                borderRadius: "14px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
            }}
          />
        </AppWalletProvider>
      </body>
    </html>
  );
}
