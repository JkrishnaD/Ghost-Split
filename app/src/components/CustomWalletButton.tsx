"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function CustomWalletButton({
  variant = "header",
}: {
  variant?: "header" | "cta";
}) {
  const { wallets, select, disconnect, connected, publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [hoveringDisconnect, setHoveringDisconnect] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (name: WalletName) => {
    select(name);
    setOpen(false);
  };

  const detectedWallets = wallets.filter(
    (w) => w.readyState === "Installed" || w.readyState === "Loadable"
  );
  const otherWallets = wallets.filter(
    (w) => w.readyState !== "Installed" && w.readyState !== "Loadable"
  );

  /* ── Connected state ── */
  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

    if (variant === "header") {
      return (
        <button
          onClick={() => disconnect()}
          onMouseEnter={() => setHoveringDisconnect(true)}
          onMouseLeave={() => setHoveringDisconnect(false)}
          className="group relative flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-3.5 text-[13px] font-medium transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5 overflow-hidden"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
                hoveringDisconnect ? "bg-red-400" : "bg-accent"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${
                hoveringDisconnect ? "bg-red-400" : "bg-accent"
              }`}
            />
          </span>
          <span
            className={`transition-colors duration-300 ${
              hoveringDisconnect ? "text-red-400" : "text-white/60"
            }`}
          >
            {hoveringDisconnect ? "Disconnect" : short}
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={() => disconnect()}
        onMouseEnter={() => setHoveringDisconnect(true)}
        onMouseLeave={() => setHoveringDisconnect(false)}
        className="relative flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-6 py-3 text-sm font-medium transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5 overflow-hidden"
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
              hoveringDisconnect ? "bg-red-400" : "bg-accent"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${
              hoveringDisconnect ? "bg-red-400" : "bg-accent"
            }`}
          />
        </span>
        <span
          className={`transition-colors duration-300 ${
            hoveringDisconnect ? "text-red-400" : "text-white/60"
          }`}
        >
          {hoveringDisconnect ? "Disconnect" : short}
        </span>
      </button>
    );
  }

  const WalletIcon = ({ size = 14 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );

  if (variant === "header") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="group relative flex h-9 items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.07] px-3.5 text-[13px] font-semibold text-accent transition-all duration-300 hover:bg-accent/[0.13] hover:border-accent/40 hover:shadow-[0_0_16px_rgba(102,252,241,0.15)] overflow-hidden"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          Connect
        </button>
        <WalletModal
          open={open}
          onClose={() => setOpen(false)}
          modalRef={modalRef}
          detectedWallets={detectedWallets}
          otherWallets={otherWallets}
          onSelect={handleSelect}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-2.5 rounded-2xl border border-accent/25 bg-accent/[0.07] px-7 py-3.5 text-sm font-semibold text-accent transition-all duration-300 hover:bg-accent/[0.13] hover:border-accent/40 hover:shadow-[0_0_24px_rgba(102,252,241,0.2)] overflow-hidden"
      >
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        Connect Wallet
      </button>
      <WalletModal
        open={open}
        onClose={() => setOpen(false)}
        modalRef={modalRef}
        detectedWallets={detectedWallets}
        otherWallets={otherWallets}
        onSelect={handleSelect}
      />
    </>
  );
}

function WalletModal({
  open,
  onClose,
  modalRef,
  detectedWallets,
  otherWallets,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement>;
  detectedWallets: ReturnType<typeof useWallet>["wallets"];
  otherWallets: ReturnType<typeof useWallet>["wallets"];
  onSelect: (name: WalletName) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d1117]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Top glow line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

            {/* Ambient glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 shadow-[0_0_12px_rgba(102,252,241,0.1)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#66fcf1"
                    strokeWidth="2"
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
                <div>
                  <span className="block text-[15px] font-bold text-white leading-tight">
                    Connect Wallet
                  </span>
                  <span className="block text-[11px] text-white/30 mt-0.5">
                    Select your Solana wallet
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] text-white/25 transition-all hover:bg-white/[0.06] hover:text-white hover:border-white/15"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Wallet list */}
            <div className="flex flex-col gap-3 p-5">
              {detectedWallets.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                    Detected
                  </p>
                  {detectedWallets.map((w, i) => (
                    <motion.button
                      key={w.adapter.name}
                      onClick={() => onSelect(w.adapter.name)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left transition-all duration-200 hover:border-accent/25 hover:bg-accent/[0.05] hover:shadow-[0_0_16px_rgba(102,252,241,0.06)]"
                    >
                      {w.adapter.icon && (
                        <img
                          src={w.adapter.icon}
                          alt={w.adapter.name}
                          className="h-8 w-8 rounded-xl"
                        />
                      )}
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-white/80 group-hover:text-accent transition-colors duration-200">
                          {w.adapter.name}
                        </span>
                        <span className="text-[11px] text-white/25">
                          Ready to connect
                        </span>
                      </div>
                      <svg
                        className="text-white/15 group-hover:text-accent/60 transition-colors"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}

              {otherWallets.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/15">
                    More options
                  </p>
                  {otherWallets.map((w, i) => (
                    <motion.button
                      key={w.adapter.name}
                      onClick={() => onSelect(w.adapter.name)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: (detectedWallets.length + i) * 0.05,
                      }}
                      className="group flex w-full items-center gap-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04]"
                    >
                      {w.adapter.icon && (
                        <img
                          src={w.adapter.icon}
                          alt={w.adapter.name}
                          className="h-8 w-8 rounded-xl opacity-40 group-hover:opacity-70 transition-opacity"
                        />
                      )}
                      <span className="flex-1 text-sm font-medium text-white/30 group-hover:text-white/60 transition-colors duration-200">
                        {w.adapter.name}
                      </span>
                      <svg
                        className="text-white/10 group-hover:text-white/30 transition-colors"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}

              {detectedWallets.length === 0 && otherWallets.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/20"
                    >
                      <path d="M20 12V22H4V12" />
                      <path d="M22 7H2v5h20V7z" />
                      <path d="M12 22V7" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40">No wallets detected</p>
                  <p className="text-xs text-white/20 max-w-[200px] leading-relaxed">
                    Install Phantom or Backpack to continue
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="relative border-t border-white/[0.05] px-5 py-3">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <p className="text-center text-[11px] text-white/15 tracking-wide">
                Powered by <span className="text-accent/40">Solana</span> ·
                GhostSplit
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
