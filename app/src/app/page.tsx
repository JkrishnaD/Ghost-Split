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
import Image from "next/image";

const FEATURES = [
  {
    icon: BsLightningChargeFill,
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.15)",
    title: "Gasless Tracking",
    desc: "Expenses recorded instantly on MagicBlock's Ephemeral Rollup — no gas, no latency.",
    badge: "Zero fees",
  },
  {
    icon: BsShieldLockFill,
    color: "#66fcf1",
    glowColor: "rgba(102,252,241,0.06)",
    borderColor: "rgba(102,252,241,0.15)",
    title: "Private Settlements",
    desc: "Balances settled via confidential on-chain transfers. No public trace of who paid whom.",
    badge: "On-chain",
  },
  {
    icon: BsPeopleFill,
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.15)",
    title: "Group Ledger",
    desc: "Shared on-chain ledger keeps everyone honest. Up to 10 members per group.",
    badge: "Up to 10",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create a group",
    desc: "Name your group and invite friends via on-chain address.",
  },
  {
    step: "02",
    title: "Go live on ER",
    desc: "Delegate to MagicBlock's Ephemeral Rollup for gasless, instant expense tracking.",
  },
  {
    step: "03",
    title: "Add expenses",
    desc: "Log who paid and split between any members — all recorded on-chain.",
  },
  {
    step: "04",
    title: "Settle up",
    desc: "Pay your share privately, then mark the group settled. Done.",
  },
];

export default function Home() {
  const { connected } = useWallet();

  if (connected) {
    return <Dashboard />;
  }

  return (
    <div className="flex flex-col items-center gap-25">
      <section className="relative w-full flex flex-col items-center text-center px-4 pt-16 pb-12 gap-0">
        <div className="fixed inset-0 bg-[url('/background.png')] bg-cover bg-center  -z-10" />
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Powered by{" "}
          <Image src="/magic.png" alt="MagicBlock" width={80} height={80} />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-5 mb-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="font-heading text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight max-w-lg">
            Split expenses. <br />
            <span className="relative inline-block text-accent">
              Settle privately.
              <span className="absolute inset-x-0 -bottom-1.5 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
            </span>
          </h1>

          <p className="text-white/40 text-sm leading-relaxed max-w-sm">
            Track group expenses gaslessly on-chain, then settle balances with
            zero public trace using confidential payments.
          </p>
        </motion.div>

        {/* CTA group */}
        <motion.div
          className="flex flex-col items-center gap-3 mb-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <CustomWalletButton variant="cta" />
          <p className="text-[11px] text-white/25 tracking-wide">
            Connect your Solana wallet to get started
          </p>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex items-center gap-x-5 gap-y-2 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {[
            "Solana Devnet",
            "MagicBlock ER",
            "Non-custodial",
            "Open source",
          ].map((badge, i) => (
            <div
              key={badge}
              className="flex items-center gap-1.5 text-[10px] text-white/25 tracking-wide"
            >
              {badge}
              {i < 3 && (
                <span className="ml-4 w-px h-2.5 bg-white/10 hidden sm:block" />
              )}
            </div>
          ))}
        </motion.div>
      </section>

      <section className="w-full flex flex-col gap-6">
        <motion.div
          className="flex flex-col items-center gap-1 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h2 className="text-lg font-bold text-white/80">Why GhostSplit?</h2>
          <p className="text-sm text-white/30">
            Everything you need. Nothing you don&apos;t.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="relative group text-left rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 cursor-default overflow-hidden transition-all duration-300"
              style={{ "--hover-border": f.borderColor } as React.CSSProperties}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.35 + i * 0.1,
                duration: 0.45,
                ease: [0.23, 1, 0.32, 1],
              }}
              whileHover={{ y: -3, borderColor: f.borderColor }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent group-hover:via-white/[0.12] transition-all duration-500" />

              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ backgroundColor: f.glowColor }}
              />

              <div
                className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300"
                style={{
                  backgroundColor: `${f.color}12`,
                  borderColor: `${f.color}20`,
                }}
              >
                <f.icon size={18} color={f.color} />
              </div>

              <div className="absolute top-4 right-4">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                  style={{
                    color: `${f.color}80`,
                    borderColor: `${f.color}25`,
                    backgroundColor: `${f.color}08`,
                  }}
                >
                  {f.badge}
                </span>
              </div>

              <div className="relative font-bold text-sm text-white/85 mb-1.5">
                {f.title}
              </div>
              <div className="relative text-xs text-white/35 leading-relaxed">
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="w-full flex flex-col gap-7">
        <motion.div
          className="flex flex-col items-center gap-1 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="text-lg font-bold text-white/80">How it works</h2>
          <p className="text-sm text-white/30">
            Four steps from create to settled
          </p>
        </motion.div>

        <div className="relative w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative group flex flex-col gap-4 rounded-2xl border border-white/6 bg-white/2.5 p-6 transition-all duration-300 hover:border-accent/20 hover:bg-white/4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.55 + i * 0.08,
                  duration: 0.4,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/3 text-[12px] font-bold text-accent shadow-[0_0_15px_rgba(102,252,241,0.05)]">
                    {step.step}
                  </div>
                  {/*{i === 0 && (
                    <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent/80">Start here</span>
                    </div>
                  )}*/}
                </div>

                <div className="relative z-10">
                  <h3 className="text-[15px] font-bold text-white/90 mb-2 group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-white/40 leading-relaxed group-hover:text-white/50 transition-colors">
                    {step.desc}
                  </p>
                </div>

                {/* Subtle bottom glow on hover */}
                <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        className="relative w-full rounded-2xl border border-accent/15 bg-accent/[0.04] overflow-hidden p-8 flex flex-col items-center gap-5 text-center mb-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(102,252,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(102,252,241,0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-extrabold text-white tracking-tight">
            Ready to split fairly?
          </h2>
          <p className="text-sm text-white/35 max-w-sm leading-relaxed">
            No signup. No fees. Just connect your wallet and start splitting
            on-chain in seconds.
          </p>
        </div>

        <CustomWalletButton variant="cta" />
      </motion.section>
    </div>
  );
}
