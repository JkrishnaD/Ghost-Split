"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Zap,
  Plus,
  CheckCircle,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { motion, AnimatePresence } from "motion/react";
import { getProgram, ledgerPda, expensePda } from "../lib/ghostSplit";
import { toast } from "sonner";

const ER_RPC = "https://devnet.magicblock.app";

interface GroupViewProps {
  groupPdaStr: string;
  onBack: () => void;
}

interface GroupData {
  name: string;
  currency: "SOL" | "USDC";
  members: string[];
  isDelegated: boolean;
  creator: string;
}

interface LedgerData {
  memberBalances: number[];
  expenseCount: number;
  isSettled: boolean;
}

interface ExpenseData {
  index: number;
  paidBy: string;
  description: string;
  amount: number;
  splitBetween: string[];
}

// Formatting helpers
const DIVISOR: Record<"SOL" | "USDC", number> = { SOL: 1e9, USDC: 1e6 };

function fmt(raw: number, currency: "SOL" | "USDC") {
  const d = DIVISOR[currency];
  const abs = Math.abs(raw) / d;
  return abs.toFixed(currency === "SOL" ? 4 : 2);
}

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function GroupView({ groupPdaStr, onBack }: GroupViewProps) {
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Add expense form
  const [showAdd, setShowAdd] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expSplit, setExpSplit] = useState<string[]>([]);
  const [addingExp, setAddingExp] = useState(false);

  // Actions
  const [delegating, setDelegating] = useState(false);
  const [undelegating, setUndelegating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  // Track which settlement transfers have been paid (by index)
  const [paidSettlements, setPaidSettlements] = useState<Set<number>>(
    new Set()
  );
  const [payingIndex, setPayingIndex] = useState<number | null>(null);

  const groupPda = useMemo(() => new PublicKey(groupPdaStr), [groupPdaStr]);
  const myAddr = publicKey?.toBase58();

  const provider = useCallback(
    (erMode = false) => {
      if (!anchorWallet) throw new Error("Wallet not connected");
      const conn = erMode ? new Connection(ER_RPC, "confirmed") : connection;
      return new AnchorProvider(conn, anchorWallet, {
        commitment: "confirmed",
      });
    },
    [anchorWallet, connection]
  );

  const fetchAll = useCallback(async () => {
    if (!anchorWallet || !publicKey) return;
    setLoading(true);
    try {
      const program = getProgram(provider());
      const ledgerAddr = ledgerPda(groupPda);

      const [g, l] = await Promise.all([
        program.account.group.fetch(groupPda),
        program.account.groupLedger.fetch(ledgerAddr),
      ]);

      const currency: "SOL" | "USDC" = (g.currency as any).sol ? "SOL" : "USDC";
      const members = (g.members as PublicKey[]).map((m) => m.toBase58());

      setGroup({
        name: g.name as string,
        currency,
        members,
        isDelegated: g.isDelegated as boolean,
        creator: (g.creator as PublicKey).toBase58(),
      });

      const balances = (l.memberBalances as BN[]).map((b) => b.toNumber());
      const expCount = l.expenseCount as number;

      setLedger({
        memberBalances: balances,
        expenseCount: expCount,
        isSettled: l.isSettled as boolean,
      });

      // Fetch expenses (newest first, skip closed ones)
      const fetches = Array.from({ length: expCount }, (_, i) =>
        program.account.expense
          .fetchNullable(expensePda(groupPda, i))
          .then((e) =>
            e
              ? ({
                  index: i,
                  paidBy: (e.paidBy as PublicKey).toBase58(),
                  description: e.description as string,
                  amount: (e.amount as BN).toNumber(),
                  splitBetween: (e.splitBetween as PublicKey[]).map((p) =>
                    p.toBase58()
                  ),
                } as ExpenseData)
              : null
          )
          .catch(() => null)
      );
      const results = (await Promise.all(fetches)).filter(
        Boolean
      ) as ExpenseData[];
      setExpenses(results.reverse());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [anchorWallet, publicKey, groupPda, provider]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Pre-select all members when opening add expense
  useEffect(() => {
    if (showAdd && group) setExpSplit([...group.members]);
  }, [showAdd, group]);

  /* ── Handlers ── */

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorWallet || !publicKey || !group) return;
    setAddingExp(true);
    try {
      const program = getProgram(provider(group.isDelegated));
      const rawAmt = Math.round(parseFloat(expAmt) * DIVISOR[group.currency]);
      await program.methods
        .addExpense(
          expDesc,
          new BN(rawAmt),
          expSplit.map((s) => new PublicKey(s))
        )
        .accounts({ group: groupPda, payer: publicKey })
        .rpc();

      toast.success(
        group.isDelegated
          ? "Expense added gaslessly via ER ⚡"
          : "Expense added"
      );
      setExpDesc("");
      setExpAmt("");
      setShowAdd(false);
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    } finally {
      setAddingExp(false);
    }
  };

  const handleDelegate = async () => {
    if (!anchorWallet || !publicKey) return;
    setDelegating(true);
    try {
      const program = getProgram(provider());
      await program.methods
        .delegateGroupLedger(null)
        .accounts({ payer: publicKey, group: groupPda })
        .rpc();
      toast.success("Ledger delegated — you're live on the Ephemeral Rollup!");
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Delegation failed");
    } finally {
      setDelegating(false);
    }
  };

  const handleUndelegate = async () => {
    if (!anchorWallet || !publicKey) return;
    setUndelegating(true);
    try {
      const erProgram = getProgram(provider(true));
      await erProgram.methods
        .undelegateGroupLedger()
        .accounts({ payer: publicKey, group: groupPda })
        .rpc();

      await new Promise((r) => setTimeout(r, 3000));

      const baseProgram = getProgram(provider());
      await baseProgram.methods
        .finalizeUndelegate()
        .accounts({ authority: publicKey, group: groupPda })
        .rpc();

      toast.success("ER session ended. Balances committed to Solana base.");
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to end ER session");
    } finally {
      setUndelegating(false);
    }
  };

  const handleSettle = async () => {
    if (!anchorWallet || !publicKey || !group) return;
    setSettling(true);
    try {
      // mark_settled is ER-routable — use ER when delegated
      const program = getProgram(provider(group.isDelegated));
      await program.methods
        .markSettled()
        .accounts({ group: groupPda, authority: publicKey })
        .rpc();
      toast.success("Group marked as settled");
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to settle");
    } finally {
      setSettling(false);
    }
  };

  // Compute minimum transfers to settle: classic greedy creditor/debtor
  function computeSettlements(
    members: string[],
    balances: number[]
  ): { from: string; to: string; amount: number }[] {
    const debtors = members
      .map((m, i) => ({ addr: m, bal: balances[i] }))
      .filter((x) => x.bal < 0)
      .sort((a, b) => a.bal - b.bal);
    const creditors = members
      .map((m, i) => ({ addr: m, bal: balances[i] }))
      .filter((x) => x.bal > 0)
      .sort((a, b) => b.bal - a.bal);

    const result: { from: string; to: string; amount: number }[] = [];
    let d = 0;
    let c = 0;
    while (d < debtors.length && c < creditors.length) {
      const amount = Math.min(-debtors[d].bal, creditors[c].bal);
      if (amount > 0)
        result.push({ from: debtors[d].addr, to: creditors[c].addr, amount });
      debtors[d].bal += amount;
      creditors[c].bal -= amount;
      if (debtors[d].bal === 0) d++;
      if (creditors[c].bal === 0) c++;
    }
    return result;
  }

  const handlePay = async (
    to: string,
    amount: number,
    index: number,
    currency: "SOL" | "USDC"
  ) => {
    if (!publicKey) return;
    setPayingIndex(index);
    try {
      if (currency === "SOL") {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(to),
            lamports: amount, // already in lamports
          })
        );
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      } else {
        // USDC: placeholder — Private Payments API would go here
        throw new Error("USDC private payments coming soon");
      }

      setPaidSettlements((prev) => new Set([...prev, index]));
      toast.success("Payment sent!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Payment failed");
    } finally {
      setPayingIndex(null);
    }
  };

  const handleJoin = async () => {
    if (!anchorWallet || !publicKey) return;
    setJoining(true);
    try {
      const program = getProgram(provider());
      await program.methods
        .joinGroup()
        .accounts({ group: groupPda, member: publicKey })
        .rpc();
      toast.success("Joined group!");
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  /* ── Render ── */

  const isMember = group ? group.members.includes(myAddr ?? "") : false;

  // Reusable address chip with copy-on-click
  function AddrChip({ addr, label }: { addr: string; label?: string }) {
    const [justCopied, setJustCopied] = useState(false);
    return (
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(addr);
          setJustCopied(true);
          setTimeout(() => setJustCopied(false), 1500);
        }}
        title={justCopied ? "Copied!" : addr}
        className="inline-flex items-center gap-1 font-mono text-xs text-white/40 hover:text-white/70 transition-colors group"
      >
        <span>{justCopied ? "copied!" : label ?? short(addr)}</span>
        <Copy
          size={10}
          className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
        />
      </button>
    );
  }

  if (loading || !group || !ledger) {
    return (
      <div className="flex items-center justify-center py-28 gap-3">
        <div className="w-6 h-6 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
        <span className="text-sm text-white/30">Loading group…</span>
      </div>
    );
  }

  if (!isMember) {
    return (
      <motion.div
        className="flex flex-col gap-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-0.5 p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-2xl font-bold text-white leading-tight">
              {group.name}
            </h2>
            <p className="text-[11px] font-mono text-white/20 mt-0.5">
              {groupPdaStr.slice(0, 14)}…{groupPdaStr.slice(-8)}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/4 border border-white/6 text-white/35">
            {group.currency}
          </span>
        </div>

        {/* Join card */}
        <div className="rounded-xl border border-white/[0.07] bg-white/2 p-8 flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-accent/7">
            <Users size={24} className="text-accent" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold text-white">
              You&apos;re not a member yet
            </p>
            <p className="text-sm text-white/35 max-w-xs leading-relaxed">
              This group has{" "}
              <span className="text-white/60 font-medium">
                {group.members.length} member
                {group.members.length !== 1 ? "s" : ""}
              </span>
              . Join to track and split expenses together.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2 max-w-xs">
            <button
              onClick={handleJoin}
              disabled={joining || ledger.isSettled || group.isDelegated}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/7 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/13 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {joining && (
                <div className="h-4 w-4 animate-spin rounded-full border-2  border-accent/30 border-t-accent" />
              )}
              {joining ? "Joining…" : "Join Group"}
            </button>
            {group.isDelegated && (
              <p className="text-[11px] text-amber-400/60">
                ⚠ Cannot join while group is live on ER
              </p>
            )}
            {ledger.isSettled && (
              <p className="text-[11px] text-white/30">
                This group has already been settled
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 p-1.5 rounded-lg border border-white/[0.07] text-white/30 hover:text-white hover:border-white/20 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-heading text-2xl font-bold text-white leading-tight">
              {group.name}
            </h2>
            {group.isDelegated && (
              <motion.span
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                LIVE ON ER
              </motion.span>
            )}
            {ledger.isSettled && (
              <span className="px-2.5 py-1 rounded-full bg-white/4 border border-white/6 text-white/25 text-[10px] font-medium">
                SETTLED
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-white/20 mt-0.5">
            {groupPdaStr.slice(0, 14)}…{groupPdaStr.slice(-8)}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/4 border border-white/6  text-white/35">
          {group.currency}
        </span>
      </div>

      {/* ── Invite Card ── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/2 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-accent" />
          <span className="text-sm font-semibold text-white">
            Invite Members
          </span>
          <span className="ml-auto text-[11px] text-white/20">
            {group.members.length} / 10 members
          </span>
        </div>

        <p className="text-[12px] text-white/35 leading-relaxed">
          Share this group address with friends. They paste it into{" "}
          <span className="text-white/55 font-medium">Join Existing Group</span>{" "}
          on the dashboard to join.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/3 px-3 py-2">
          <span className="flex-1 text-[11px] font-mono text-white/40 truncate">
            {groupPdaStr}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(groupPdaStr);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
              copied
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-accent/7 border border-accent/20 text-accent hover:bg-accent/13"
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {group.isDelegated && (
          <p className="text-[11px] text-amber-400/60 flex items-start gap-1.5">
            <span className="mt-px">⚠</span>
            New members cannot join while the group is live on ER. End the
            session first.
          </p>
        )}
      </div>

      {/* ── ER Mode Panel ── */}
      <div
        className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors duration-300 ${
          group.isDelegated
            ? "border-accent/20 bg-accent/4"
            : "border-white/6 bg-white/2"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              group.isDelegated ? "bg-accent/10" : "bg-white/4"
            }`}
          >
            <Zap
              size={14}
              className={group.isDelegated ? "text-accent" : "text-white/25"}
            />
          </div>
          <div>
            <p
              className={`text-sm font-semibold transition-colors ${
                group.isDelegated ? "text-accent" : "text-white/50"
              }`}
            >
              {group.isDelegated
                ? "Ephemeral Rollup active"
                : "Ephemeral Rollup"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/25">
              {group.isDelegated
                ? "Expenses are gasless & instant. Ledger auto-commits every 30s."
                : "Go live on ER for gasless, zero-latency expense tracking."}
            </p>
          </div>
        </div>

        {group.isDelegated ? (
          <button
            onClick={handleUndelegate}
            disabled={undelegating}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-white/8 text-white/35 text-xs font-semibold hover:border-white/20 hover:text-white/70 disabled:opacity-40 transition-all"
          >
            {undelegating ? "Ending…" : "End Session"}
          </button>
        ) : (
          <button
            onClick={handleDelegate}
            disabled={delegating || ledger.isSettled}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-accent/25 bg-accent/7 text-accent text-xs font-semibold hover:bg-accent/13 disabled:opacity-40 transition-all"
          >
            {delegating ? "Delegating…" : "Go Live ⚡"}
          </button>
        )}
      </div>

      {/* ── Balances ── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/2 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={13} className="text-accent" />
            <span className="text-sm font-semibold text-white">Balances</span>
          </div>
          <span className="text-[11px] text-white/20">
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="divide-y divide-white/4">
          {(() => {
            const settlements = computeSettlements(group.members, ledger.memberBalances);
            return group.members.map((addr, i) => {
              const bal = ledger.memberBalances[i] ?? 0;
              const isMe = addr === myAddr;
              const positive = bal > 0;
              const negative = bal < 0;

              // Payment status for this member
              const theirDebts = settlements
                .map((s, idx) => ({ ...s, idx }))
                .filter((s) => s.from === addr);
              const hasPaid =
                theirDebts.length > 0 &&
                theirDebts.every((s) => paidSettlements.has(s.idx));
              const isPending = theirDebts.length > 0 && !hasPaid;

              return (
                <div
                  key={addr}
                  className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-accent/2" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isMe ? "bg-accent/15 text-accent" : "bg-white/5 text-white/25"
                    }`}
                  >
                    {addr.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <AddrChip addr={addr} />
                    {isMe && (
                      <span className="text-[10px] text-accent/50 font-medium">you</span>
                    )}
                  </div>

                  {/* Payment status tag */}
                  {hasPaid && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Check size={10} /> Paid
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                      Pending
                    </span>
                  )}

                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      positive ? "text-emerald-400" : negative ? "text-red-400" : "text-white/20"
                    }`}
                  >
                    {positive ? "+" : negative ? "−" : ""}
                    {fmt(bal, group.currency)}{" "}
                    <span className="text-xs text-white/25">{group.currency}</span>
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── Add Expense ── */}
      {!ledger.isSettled && (
        <div className="rounded-xl border border-white/[0.07] bg-white/2 overflow-hidden">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 transition-all hover:bg-white/2"
          >
            <div className="flex items-center gap-2">
              <Plus size={13} className="text-accent" />
              <span className="text-sm font-semibold text-white">
                Add Expense
              </span>
              {group.isDelegated && (
                <span className="rounded-full border border-accent/20 bg-accent/8 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  gasless
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: showAdd ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="text-white/25" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden border-t border-white/5"
              >
                <form
                  onSubmit={handleAddExpense}
                  className="flex flex-col gap-4 p-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                      Description
                    </label>
                    <input
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-white/20 transition-all focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                      placeholder="e.g. Dinner at the rooftop"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      required
                      maxLength={64}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                      Amount ({group.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-white/20 transition-all focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                      placeholder={group.currency === "SOL" ? "0.01" : "5.00"}
                      value={expAmt}
                      onChange={(e) => setExpAmt(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                      Split between
                    </label>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/[0.07] bg-white/2 p-1">
                      {group.members.map((addr) => (
                        <label
                          key={addr}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 hover:bg-white/3 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={expSplit.includes(addr)}
                            onChange={(e) =>
                              setExpSplit((prev) =>
                                e.target.checked
                                  ? [...prev, addr]
                                  : prev.filter((a) => a !== addr)
                              )
                            }
                            className="accent-accent h-3.5 w-3.5"
                          />
                          <span className="text-xs font-mono text-white/40">
                            {short(addr)}
                            {addr === myAddr && (
                              <span className="ml-1 text-accent/50"> you</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      addingExp || expSplit.length === 0 || !expAmt || !expDesc
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/7 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/13 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addingExp && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2  border-accent/30 border-t-accent" />
                    )}
                    {addingExp ? "Adding…" : "Add Expense"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Expense List ── */}
      {expenses.length > 0 && (
        <div className="rounded-xl border border-white/[0.07] bg-white/2 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <DollarSign size={13} className="text-accent" />
            <span className="text-sm font-semibold text-white">Expenses</span>
            <span className="ml-auto text-[11px] text-white/20">
              {expenses.length}
            </span>
          </div>
          <div className="divide-y divide-white/4">
            {expenses.map((exp) => (
              <div
                key={exp.index}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {exp.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/25 flex items-center gap-1">
                    paid by <AddrChip addr={exp.paidBy} /> · split{" "}
                    {exp.splitBetween.length} ways
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                  {fmt(exp.amount, group.currency)}{" "}
                  <span className="text-white/25 text-xs">
                    {group.currency}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mark Settled ── */}
      {!ledger.isSettled &&
        (() => {
          const settlements = computeSettlements(
            group.members,
            ledger.memberBalances
          );
          // Payments I need to make
          const myDebts = settlements
            .map((s, i) => ({ ...s, i }))
            .filter((s) => s.from === myAddr);
          const allMyDebtsPaid =
            myDebts.length === 0 ||
            myDebts.every((s) => paidSettlements.has(s.i));

          return (
            <div className="flex flex-col gap-3">
              {/* Settlement breakdown */}
              {settlements.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                      How to settle
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {settlements.map((s, i) => {
                      const isMyPayment = s.from === myAddr;
                      const isPaid = paidSettlements.has(i);
                      const isPaying = payingIndex === i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            isMyPayment && !isPaid ? "bg-amber-500/[0.03]" : ""
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            {s.from === myAddr ? (
                              <span className="text-xs font-mono text-white/70 font-semibold">
                                you
                              </span>
                            ) : (
                              <AddrChip addr={s.from} />
                            )}
                            <span className="text-white/15 text-xs shrink-0">
                              →
                            </span>
                            {s.to === myAddr ? (
                              <span className="text-xs font-mono text-white/70 font-semibold">
                                you
                              </span>
                            ) : (
                              <AddrChip addr={s.to} />
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                            {fmt(s.amount, group.currency)}{" "}
                            <span className="text-white/30 text-xs">
                              {group.currency}
                            </span>
                          </span>

                          {/* Pay button — only shown to the person who owes */}
                          {isMyPayment &&
                            (isPaid ? (
                              <span className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                <Check size={12} /> Paid
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handlePay(s.to, s.amount, i, group.currency)
                                }
                                disabled={isPaying}
                                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-amber-400 transition-all hover:bg-amber-400/[0.13] disabled:opacity-50"
                              >
                                {isPaying ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                                ) : null}
                                {isPaying ? "Paying…" : "Pay"}
                              </button>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settle button — only enabled after all your payments are done */}
              <button
                onClick={handleSettle}
                disabled={settling || !allMyDebtsPaid}
                title={!allMyDebtsPaid ? "Pay your share first" : ""}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] py-3 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {settling ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {settling
                  ? "Settling…"
                  : !allMyDebtsPaid
                  ? "Pay your share to settle"
                  : "Mark All Settled"}
              </button>
            </div>
          );
        })()}
    </motion.div>
  );
}
