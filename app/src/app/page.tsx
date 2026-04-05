"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "motion/react";
import {
  BsLightningChargeFill,
  BsShieldLockFill,
  BsPeopleFill,
} from "react-icons/bs";
import Dashboard from "../components/Dashboard";
import CustomWalletButton from "../components/CustomWalletButton";

const FEATURES = [
  {
    icon: BsLightningChargeFill,
    color: "#f59e0b",
    title: "Gasless Tracking",
    desc: "Expenses recorded instantly on MagicBlock's Ephemeral Rollup — no gas, no latency.",
  },
  {
    icon: BsShieldLockFill,
    color: "#66fcf1",
    title: "Private Settlements",
    desc: "Balances settled via confidential on-chain transfers. No public trace of who paid whom.",
  },
  {
    icon: BsPeopleFill,
    color: "#a78bfa",
    title: "Group Ledger",
    desc: "Shared on-chain ledger keeps everyone honest. Up to 10 members per group.",
  },
];

export default function Home() {
  const { connected } = useWallet();

  if (connected) {
    return (
      <>
        <Dashboard />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center text-center pt-16 pb-8 gap-12">
        {/* Hero */}
        <motion.div
          className="flex flex-col items-center gap-4 max-w-225"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className="text-xs font-medium tracking-widest uppercase text-accent/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Powered by MagicBlock ER
          </motion.div>
          <h1 className="font-heading text-5xl font-extrabold leading-tight">
            Split expenses.
            <br />
            <span className="text-accent">Settle privately.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Track group expenses gaslessly on-chain, then settle balances with
            zero public trace using confidential payments.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
        >
          <p className="text-sm text-white/30 mb-1">
            Connect your Solana wallet to get started
          </p>
          <CustomWalletButton variant="cta" />
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="text-left border border-white/[0.07] bg-white/3 rounded-xl p-5 cursor-default"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.35 + i * 0.1,
                duration: 0.4,
                ease: "easeOut",
              }}
              whileHover={{
                scale: 1.02,
                borderColor: "rgba(102,252,241,0.15)",
              }}
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${f.color}18` }}
              >
                <f.icon size={18} color={f.color} />
              </div>
              <div className="font-semibold text-sm text-white mb-1">
                {f.title}
              </div>
              <div className="text-xs text-white/40 leading-relaxed">
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
