"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import CustomWalletButton from "./CustomWalletButton";

export default function WalletConnect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const el = document.getElementById("wallet-portal");
  if (!el) return null;

  return createPortal(<CustomWalletButton variant="header" />, el);
}
