"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useState, useRef, useEffect } from "react";

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
          className="flex h-8.5 items-center gap-2 rounded-md border border-white/10 px-3 text-[13px] font-medium transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
        >
          <span
            className={`flex h-1.5 w-1.5 rounded-full transition-colors ${
              hoveringDisconnect ? "bg-red-400" : "bg-accent"
            }`}
          />
          <span
            className={`transition-colors ${
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
        className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium transition-all hover:border-red-500/30 hover:bg-red-500/5"
      >
        <span
          className={`flex h-2 w-2 rounded-full transition-colors ${
            hoveringDisconnect ? "bg-red-400" : "bg-accent"
          }`}
        />
        <span
          className={`transition-colors ${
            hoveringDisconnect ? "text-red-400" : "text-white/60"
          }`}
        >
          {hoveringDisconnect ? "Disconnect" : short}
        </span>
      </button>
    );
  }

  /* ── Disconnected trigger ── */
  if (variant === "header") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="flex h-8.5 items-center gap-1.5 rounded-md border border-accent/20 bg-accent/7 px-3 text-[13px] font-medium text-accent transition-all hover:bg-accent/13"
        >
          <svg
            width="13"
            height="13"
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
        className="flex items-center gap-2 rounded-xl border  border-accent/25 bg-accent/7 px-6 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/13"
      >
        <svg
          width="15"
          height="15"
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-90 rounded-2xl border border-white/8 bg-[#0d1117] shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
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
            <span className="font-heading text-[15px] font-bold text-white">
              Connect Wallet
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/6 hover:text-white"
          >
            <svg
              width="14"
              height="14"
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
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                Detected
              </p>
              {detectedWallets.map((w) => (
                <button
                  key={w.adapter.name}
                  onClick={() => onSelect(w.adapter.name)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-left transition-all hover:border-accent/20 hover:bg-accent/5"
                >
                  {w.adapter.icon && (
                    <img
                      src={w.adapter.icon}
                      alt={w.adapter.name}
                      className="h-8 w-8 rounded-lg"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">
                      {w.adapter.name}
                    </span>
                    <span className="text-[11px] text-white/25">Detected</span>
                  </div>
                  <svg
                    className="text-white/20 group-hover:text-accent transition-colors"
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
                </button>
              ))}
            </div>
          )}

          {otherWallets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                More options
              </p>
              {otherWallets.map((w) => (
                <button
                  key={w.adapter.name}
                  onClick={() => onSelect(w.adapter.name)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/4 bg-white/2 px-4 py-3 text-left transition-all hover:border-white/1 hover:bg-white/4"
                >
                  {w.adapter.icon && (
                    <img
                      src={w.adapter.icon}
                      alt={w.adapter.name}
                      className="h-8 w-8 rounded-lg opacity-50"
                    />
                  )}
                  <span className="flex-1 text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors">
                    {w.adapter.name}
                  </span>
                  <svg
                    className="text-white/15 group-hover:text-white/40 transition-colors"
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
                </button>
              ))}
            </div>
          )}

          {detectedWallets.length === 0 && otherWallets.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-white/40">No wallets detected</p>
              <p className="text-xs text-white/20">
                Install Phantom or Brave Wallet to continue
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/6 px-5 py-3">
          <p className="text-center text-[11px] text-white/20">
            Solana · GhostSplit
          </p>
        </div>
      </div>
    </div>
  );
}
