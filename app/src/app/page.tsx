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
      <section className="relative w-full flex flex-col items-center text-center pt-5 pb-5 gap-4">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/[0.04] rounded-full blur-[80px]" />
        <motion.div
          className="flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/[0.06] text-[10px] font-bold uppercase tracking-[0.18em] text-accent/70"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {" "}
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />{" "}
          Powered by MagicBlock Ephemeral Rollup{" "}
        </motion.div>{" "}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {" "}
          {/* Reduced heading size */}{" "}
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight max-w-xl">
            {" "}
            Split expenses. <br />{" "}
            <span className="relative text-accent">
              {" "}
              Settle privately.{" "}
              <span className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />{" "}
            </span>{" "}
          </h1>{" "}
          {/* reduced text size */}{" "}
          <p className="text-white/40 text-sm leading-relaxed max-w-md">
            {" "}
            Track group expenses gaslessly on-chain, then settle balances with
            zero public trace using confidential payments.{" "}
          </p>{" "}
        </motion.div>{" "}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {" "}
          <CustomWalletButton variant="cta" />{" "}
          <p className="text-[11px] text-white/20">
            {" "}
            Connect your Solana wallet to get started{" "}
          </p>{" "}
        </motion.div>{" "}
        <motion.div
          className="flex items-center gap-3 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {" "}
          {[
            "Solana Devnet",
            "MagicBlock ER",
            "Non-custodial",
            "Open source",
          ].map((badge) => (
            <div
              key={badge}
              className="flex items-center gap-1 text-[10px] text-white/20"
            >
              {" "}
              <span className="w-1 h-1 rounded-full bg-white/15" /> {badge}{" "}
            </div>
          ))}{" "}
        </motion.div>{" "}
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

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              className="relative flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.55 + i * 0.08,
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-white/[0.07] font-heading tabular-nums">
                  {step.step}
                </span>
                {i === 0 && (
                  <span className="w-2 h-2 rounded-full bg-accent/50 shadow-[0_0_6px_rgba(102,252,241,0.5)]" />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-white/75 mb-1">
                  {step.title}
                </p>
                <p className="text-xs text-white/30 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA Banner ── */}
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
