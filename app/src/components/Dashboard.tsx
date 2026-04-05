"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getProgram,
  uniqueGroupId,
  groupPda,
  ledgerPda,
} from "../lib/ghostSplit";
import { loadGroups, saveGroup, removeGroup } from "../lib/groups";
import { toast } from "sonner";
import GroupView from "./GroupView";
import { Plus, ArrowRight, Users, Zap, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GroupCard {
  pda: string;
  name: string;
  currency: string;
  memberCount: number;
  isDelegated: boolean;
  isSettled: boolean;
  expenseCount: number;
  totalTracked: number; // sum of positive balances in lamports/micro-units
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const },
  },
};

export default function Dashboard() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [currency, setCurrency] = useState("SOL");
  const [creating, setCreating] = useState(false);

  const [joinAddr, setJoinAddr] = useState("");

  const fetchGroups = useCallback(async () => {
    if (!anchorWallet || !publicKey) return;
    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);

      const onChain = await program.account.group.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);

      const seen = new Map<string, GroupCard>();
      for (const g of onChain) {
        const pda = g.publicKey.toBase58();
        const pk = g.publicKey;
        let isSettled = false;
        let expenseCount = 0;
        let totalTracked = 0;
        try {
          const l = await program.account.groupLedger.fetch(ledgerPda(pk));
          isSettled = l.isSettled as boolean;
          expenseCount = l.expenseCount as number;
          totalTracked = (l.memberBalances as any[])
            .map((b: any) => b.toNumber())
            .filter((b: number) => b > 0)
            .reduce((a: number, b: number) => a + b, 0);
        } catch {}
        seen.set(pda, {
          pda,
          name: g.account.name,
          currency: g.account.currency.sol ? "SOL" : "USDC",
          memberCount: g.account.members.length,
          isDelegated: g.account.isDelegated,
          isSettled,
          expenseCount,
          totalTracked,
        });
      }

      for (const s of loadGroups()) {
        if (seen.has(s.pda)) continue;
        try {
          const pk = new PublicKey(s.pda);
          const g = await program.account.group.fetch(pk);
          const l = await program.account.groupLedger.fetch(ledgerPda(pk));
          const totalTracked = (l.memberBalances as any[])
            .map((b: any) => b.toNumber())
            .filter((b: number) => b > 0)
            .reduce((a: number, b: number) => a + b, 0);
          seen.set(s.pda, {
            pda: s.pda,
            name: g.name,
            currency: g.currency.sol ? "SOL" : "USDC",
            memberCount: g.members.length,
            isDelegated: g.isDelegated,
            isSettled: l.isSettled as boolean,
            expenseCount: l.expenseCount as number,
            totalTracked,
          });
        } catch {
          removeGroup(s.pda);
        }
      }

      setGroups(Array.from(seen.values()));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [anchorWallet, publicKey, connection]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey) return;
    setCreating(true);
    try {
      const provider = new AnchorProvider(connection, anchorWallet, {
        commitment: "confirmed",
      });
      const program = getProgram(provider);
      const gid = uniqueGroupId();
      const pda = groupPda(publicKey, gid);

      await program.methods
        .createGroup(
          gid,
          groupName,
          groupDesc,
          currency === "SOL" ? { sol: {} } : { usdc: {} }
        )
        .accounts({ creator: publicKey })
        .rpc();

      toast.success("Group created");
      setGroupName("");
      setGroupDesc("");
      setShowCreate(false);
      setActiveGroup(pda.toBase58());
    } catch (err) {
      console.error(err);
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const pda = joinAddr.trim();
    if (!pda) return;
    saveGroup({ pda, name: "…", currency: "SOL", createdAt: Date.now() });
    setActiveGroup(pda);
    setJoinAddr("");
  };

  if (activeGroup) {
    return (
      <GroupView
        groupPdaStr={activeGroup}
        onBack={() => {
          setActiveGroup(null);
          fetchGroups();
        }}
      />
    );
  }

  const liveCount = groups.filter((g) => g.isDelegated && !g.isSettled).length;
  const settledCount = groups.filter((g) => g.isSettled).length;
  const totalExpenses = groups.reduce((a, g) => a + g.expenseCount, 0);
  // Sum SOL groups only (lamports → SOL). USDC groups excluded to avoid mixing units.
  const totalSolTracked =
    groups
      .filter((g) => g.currency === "SOL")
      .reduce((a, g) => a + g.totalTracked, 0) / 1e9;

  return (
    <div className="flex flex-col gap-8">
      <motion.div
        className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden p-7"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(102,252,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(102,252,241,0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex items-end justify-between gap-6 flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(102,252,241,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent/60">
                GhostSplit
              </span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
              Your Groups
            </h1>
            <p className="text-sm text-white/35">
              On-chain expense splitting - transparent, gasless, instant
            </p>
          </div>
          {groups.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <span className="text-xl font-bold text-white tabular-nums">
                  {groups.length}
                </span>
                <span className="text-[10px] text-white/25 uppercase tracking-widest">
                  Total
                </span>
              </div>
              {liveCount > 0 && (
                <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-accent/20 bg-accent/[0.06]">
                  <span className="text-xl font-bold text-accent tabular-nums">
                    {liveCount}
                  </span>
                  <span className="text-[10px] text-accent/40 uppercase tracking-widest">
                    Live
                  </span>
                </div>
              )}
              {settledCount > 0 && (
                <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                  <span className="text-xl font-bold text-emerald-400 tabular-nums">
                    {settledCount}
                  </span>
                  <span className="text-[10px] text-emerald-400/40 uppercase tracking-widest">
                    Done
                  </span>
                </div>
              )}
              {totalExpenses > 0 && (
                <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <span className="text-xl font-bold text-white tabular-nums">
                    {totalExpenses}{" "}
                    <span className="text-[10px] text-gray-400">SOL</span>
                  </span>
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">
                    Expenses
                  </span>
                </div>
              )}
              {totalSolTracked > 0 && (
                <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <span className="text-xl font-bold text-white tabular-nums">
                    {totalSolTracked.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">
                    SOL Tracked
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative flex items-center gap-3 mt-6 pt-5 border-t border-white/[0.05]">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              showCreate
                ? "border border-white/10 text-white/40 hover:text-white hover:border-white/20 bg-transparent"
                : "border border-accent/25 bg-accent/[0.08] text-accent hover:bg-accent/[0.14] hover:shadow-[0_0_20px_rgba(102,252,241,0.12)]"
            }`}
          >
            {showCreate ? (
              "Cancel"
            ) : (
              <>
                <Plus size={15} />
                New Group
              </>
            )}
          </button>

          <div className="h-5 w-px bg-white/[0.07]" />

          <p className="text-xs text-white/25">
            {groups.length === 0
              ? "Create your first group to get started"
              : `${groups.length} group${groups.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </motion.div>
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="relative border border-accent/15 bg-accent/[0.03] rounded-2xl p-6 flex flex-col gap-5 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

              <h3 className="relative text-sm font-bold text-white flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
                  <Zap size={12} className="text-accent" />
                </div>
                Create New Group
              </h3>

              <form
                onSubmit={handleCreate}
                className="relative flex flex-col gap-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                      Group Name
                    </label>
                    <input
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15 transition-all"
                      placeholder="e.g. Goa Trip 🏖"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                      maxLength={32}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                      Description
                      <span className="ml-1.5 text-white/15 normal-case tracking-normal font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15 transition-all"
                      placeholder="Add details…"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      maxLength={64}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                    Currency
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrency("SOL")}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                        currency === "SOL"
                          ? "bg-accent/[0.09] border-accent/30 text-accent shadow-[0_0_12px_rgba(102,252,241,0.08)]"
                          : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/60 hover:border-white/15"
                      }`}
                    >
                      ◎ SOL
                    </button>
                    <button
                      type="button"
                      disabled
                      title="USDC settlements coming soon"
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.04] bg-white/[0.02] text-white/15 cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      USDC
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/15">
                        soon
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating || !groupName.trim()}
                  className="mt-1 py-3 rounded-xl text-sm font-bold border border-accent/25 bg-accent/[0.09] text-accent hover:bg-accent/[0.15] hover:shadow-[0_0_20px_rgba(102,252,241,0.12)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {creating && (
                    <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  )}
                  {creating ? "Creating on Solana…" : "Create Group →"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-accent/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <p className="text-sm text-white/25">Fetching your groups…</p>
        </div>
      ) : groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative border border-white/[0.06] bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center py-20 px-6 text-center gap-5 overflow-hidden"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
            <Users size={26} className="text-white/15" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-bold text-white/60">No groups yet</h3>
            <p className="text-sm text-white/25 max-w-xs leading-relaxed">
              Create a new group above or join an existing one via address below
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {groups.map((g) => (
            <motion.button
              key={g.pda}
              variants={cardAnim}
              onClick={() => setActiveGroup(g.pda)}
              className="group relative text-left border border-white/[0.07] bg-white/[0.025] hover:border-accent/20 hover:bg-accent/[0.03] rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_0_24px_rgba(102,252,241,0.06)] overflow-hidden"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/0 to-transparent group-hover:via-accent/25 transition-all duration-500" />
              {g.isDelegated && !g.isSettled && (
                <span className="absolute top-4 right-4 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-bold text-white/30 group-hover:border-accent/15 group-hover:text-accent/50 transition-all duration-300">
                  {g.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-white/85 group-hover:text-accent transition-colors duration-300 line-clamp-1 leading-tight">
                    {g.name}
                  </h3>
                  <p className="text-[11px] text-white/20 font-mono mt-0.5">
                    {g.pda.slice(0, 6)}…{g.pda.slice(-5)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {g.isSettled ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ✓ Settled
                  </span>
                ) : g.isDelegated ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    ⚡ Live
                  </span>
                ) : null}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]">
                  {g.currency}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <span className="text-[11px] text-white/20 flex items-center gap-1.5">
                  <Users size={11} className="text-white/15" />
                  {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                </span>
                <ArrowRight
                  size={14}
                  className="text-white/15 group-hover:text-accent/60 group-hover:translate-x-0.5 transition-all duration-300"
                />
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
      <motion.div
        className="relative border-t border-white/[0.05] pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold text-white/70 flex items-center gap-2">
              <Search size={14} className="text-white/25" />
              Join Existing Group
            </h2>
            <p className="text-xs text-white/25">
              Have a group address? Paste it below to view or join
            </p>
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/35 focus:ring-1 focus:ring-accent/15 transition-all font-mono"
              placeholder="Paste group address (Base58)…"
              value={joinAddr}
              onChange={(e) => setJoinAddr(e.target.value)}
            />
            <button
              type="submit"
              disabled={!joinAddr.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.08] text-white/40 hover:border-accent/25 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              View <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
