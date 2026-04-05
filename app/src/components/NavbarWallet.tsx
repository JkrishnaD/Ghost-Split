"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

export default function NavbarWallet() {
  const { connected, publicKey, disconnect } = useWallet();
  const [hovering, setHovering] = useState(false);

  if (!connected || !publicKey) return null;

  const addr = publicKey.toBase58();
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  return (
    <button
      onClick={() => disconnect()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="flex items-center gap-2 h-8.5 px-3 rounded-md border border-white/10 text-[13px] font-medium transition-all hover:border-red-500/30 hover:bg-red-500/5"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          hovering ? "bg-red-400" : "bg-accent"
        }`}
      />
      <span
        className={`transition-colors ${
          hovering ? "text-red-400" : "text-white/60"
        }`}
      >
        {hovering ? "Disconnect" : short}
      </span>
    </button>
  );
}
