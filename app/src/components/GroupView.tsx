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
  TrendingUp,
  TrendingDown,
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

const DIVISOR: Record<"SOL" | "USDC", number> = { SOL: 1e9, USDC: 1e6 };

function fmt(raw: number, currency: "SOL" | "USDC") {
  const d = DIVISOR[currency];
  const abs = Math.abs(raw) / d;
  return abs.toFixed(currency === "SOL" ? 4 : 2);
}

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

export default function GroupView({ groupPdaStr, onBack }: GroupViewProps) {
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expSplit, setExpSplit] = useState<string[]>([]);
  const [addingExp, setAddingExp] = useState(false);

  const [delegating, setDelegating] = useState(false);
  const [undelegating, setUndelegating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
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
  useEffect(() => {
    if (showAdd && group) setExpSplit([...group.members]);
  }, [showAdd, group]);

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
    let d = 0,
      c = 0;
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
            lamports: amount,
          })
        );
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      } else {
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

  const isMember = group ? group.members.includes(myAddr ?? "") : false;

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
        className="inline-flex items-center gap-1 font-mono text-xs text-white/35 hover:text-accent/70 transition-colors group"
      >
        <span className={justCopied ? "text-accent/60" : ""}>
          {justCopied ? "copied!" : label ?? short(addr)}
        </span>
        <Copy
          size={10}
          className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0"
        />
      </button>
    );
  }

  if (loading || !group || !ledger) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-accent/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
        <span className="text-sm text-white/25">Loading group…</span>
      </div>
    );
  }

  /* ── Back header (reused) ── */
  const BackHeader = () => (
    <motion.div
      className="relative flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 overflow-hidden"
      custom={0}
      variants={fadeUp}
      initial="hidden"
      animate="show"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      {group.isDelegated && (
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <button
        onClick={onBack}
        className="mt-0.5 p-2 rounded-xl border border-white/[0.07] text-white/25 hover:text-white hover:border-white/20 transition-all duration-200 bg-white/[0.02]"
      >
        <ArrowLeft size={15} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-heading text-2xl font-extrabold text-white leading-tight tracking-tight">
            {group.name}
          </h2>
          {group.isDelegated && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold tracking-wide shadow-[0_0_10px_rgba(102,252,241,0.1)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              LIVE ON ER
            </motion.span>
          )}
          {ledger.isSettled && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              <Check size={10} /> SETTLED
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-white/20 mt-1">
          {groupPdaStr.slice(0, 14)}…{groupPdaStr.slice(-8)}
        </p>
      </div>

      <span className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30">
        {group.currency}
      </span>
    </motion.div>
  );

  /* ── Not a member ── */
  if (!isMember) {
    return (
      <div className="flex flex-col gap-4">
        <BackHeader />
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden p-10 flex flex-col items-center gap-6 text-center"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/4 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.07]">
            <Users size={26} className="text-accent/60" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-bold text-white">
              You&apos;re not a member yet
            </p>
            <p className="text-sm text-white/30 max-w-xs leading-relaxed">
              This group has{" "}
              <span className="text-white/60 font-semibold">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.08] py-3 text-sm font-bold text-accent transition-all hover:bg-accent/[0.14] hover:shadow-[0_0_20px_rgba(102,252,241,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {joining && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              )}
              {joining ? "Joining…" : "Join Group →"}
            </button>
            {group.isDelegated && (
              <p className="text-[11px] text-amber-400/60">
                ⚠ Cannot join while group is live on ER
              </p>
            )}
            {ledger.isSettled && (
              <p className="text-[11px] text-white/25">
                This group has already been settled
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Full member view ── */
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <BackHeader />

      {/* Quick stats row */}
      {expenses.length > 0 && (
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              label: "Expenses",
              value: expenses.length.toString(),
              icon: <DollarSign size={13} className="text-white/25" />,
            },
            {
              label: "Total Spent",
              value: `${fmt(totalExpenses, group.currency)} ${group.currency}`,
              icon: <TrendingUp size={13} className="text-white/25" />,
            },
            {
              label: "Members",
              value: group.members.length.toString(),
              icon: <Users size={13} className="text-white/25" />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3"
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/25 font-bold">
                {s.icon}
                {s.label}
              </div>
              <p className="text-sm font-bold text-white tabular-nums truncate">
                {s.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Invite Card */}
      <motion.div
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 flex flex-col gap-3 overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="flex items-center gap-2">
          <Users size={13} className="text-accent" />
          <span className="text-sm font-bold text-white">Invite Members</span>
          <span className="ml-auto text-[10px] text-white/20 font-mono">
            {group.members.length}/10
          </span>
        </div>
        <p className="text-[12px] text-white/30 leading-relaxed">
          Share this address with friends — they paste it into{" "}
          <span className="text-white/50 font-semibold">
            Join Existing Group
          </span>{" "}
          on the dashboard.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
          <span className="flex-1 text-[11px] font-mono text-white/35 truncate">
            {groupPdaStr}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(groupPdaStr);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 ${
              copied
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-accent/[0.07] border border-accent/20 text-accent hover:bg-accent/[0.13]"
            }`}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {group.isDelegated && (
          <p className="text-[11px] text-amber-400/60 flex items-start gap-1.5">
            <span className="mt-px shrink-0">⚠</span>
            New members cannot join while the group is live on ER.
          </p>
        )}
      </motion.div>

      {/* ER Mode Panel */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className={`relative rounded-2xl border p-4 flex items-center justify-between gap-4 overflow-hidden transition-colors duration-500 ${
          group.isDelegated
            ? "border-accent/20 bg-accent/[0.04]"
            : "border-white/[0.06] bg-white/[0.02]"
        }`}
      >
        {group.isDelegated && (
          <>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          </>
        )}

        <div className="relative flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
              group.isDelegated
                ? "bg-accent/10 border-accent/20 shadow-[0_0_12px_rgba(102,252,241,0.1)]"
                : "bg-white/[0.04] border-white/[0.06]"
            }`}
          >
            <Zap
              size={15}
              className={group.isDelegated ? "text-accent" : "text-white/20"}
            />
          </div>
          <div>
            <p
              className={`text-sm font-bold transition-colors duration-300 ${
                group.isDelegated ? "text-accent" : "text-white/45"
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
            className="shrink-0 px-3.5 py-2 rounded-xl border border-white/[0.08] text-white/30 text-xs font-bold hover:border-white/20 hover:text-white/60 disabled:opacity-40 transition-all"
          >
            {undelegating ? "Ending…" : "End Session"}
          </button>
        ) : (
          <button
            onClick={handleDelegate}
            disabled={delegating || ledger.isSettled}
            className="shrink-0 px-3.5 py-2 rounded-xl border border-accent/25 bg-accent/[0.08] text-accent text-xs font-bold hover:bg-accent/[0.14] hover:shadow-[0_0_14px_rgba(102,252,241,0.12)] disabled:opacity-40 transition-all duration-300"
          >
            {delegating ? "Delegating…" : "Go Live ⚡"}
          </button>
        )}
      </motion.div>

      {/* Balances */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Users size={13} className="text-accent" />
            <span className="text-sm font-bold text-white">Balances</span>
          </div>
          <span className="text-[11px] text-white/20 font-mono">
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {(() => {
            const settlements = computeSettlements(
              group.members,
              ledger.memberBalances
            );
            return group.members.map((addr, i) => {
              const bal = ledger.memberBalances[i] ?? 0;
              const isMe = addr === myAddr;
              const positive = bal > 0;
              const negative = bal < 0;
              const theirDebts = settlements
                .map((s, idx) => ({ ...s, idx }))
                .filter((s) => s.from === addr);
              const hasPaid =
                theirDebts.length > 0 &&
                theirDebts.every((s) => paidSettlements.has(s.idx));
              const isPending = theirDebts.length > 0 && !hasPaid;

              return (
                <motion.div
                  key={addr}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className={`flex items-center gap-3 px-5 py-3.5 ${
                    isMe ? "bg-accent/[0.025]" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold border transition-colors ${
                      isMe
                        ? "bg-accent/10 border-accent/20 text-accent"
                        : "bg-white/[0.04] border-white/[0.05] text-white/20"
                    }`}
                  >
                    {addr.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <AddrChip addr={addr} />
                    {isMe && (
                      <span className="text-[10px] text-accent/45 font-bold">
                        you
                      </span>
                    )}
                  </div>

                  {hasPaid && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Check size={10} /> Paid
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {positive ? (
                      <TrendingUp size={12} className="text-emerald-400/60" />
                    ) : negative ? (
                      <TrendingDown size={12} className="text-red-400/60" />
                    ) : null}
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        positive
                          ? "text-emerald-400"
                          : negative
                          ? "text-red-400"
                          : "text-white/20"
                      }`}
                    >
                      {positive ? "+" : negative ? "−" : ""}
                      {fmt(bal, group.currency)}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {group.currency}
                    </span>
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>
      </motion.div>

      {/* Add Expense */}
      {!ledger.isSettled && (
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg transition-all ${
                  showAdd
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-white/[0.04] border border-white/[0.06]"
                }`}
              >
                <Plus
                  size={13}
                  className={showAdd ? "text-accent" : "text-white/30"}
                />
              </div>
              <span className="text-sm font-bold text-white">Add Expense</span>
              {group.isDelegated && (
                <span className="rounded-full border border-accent/20 bg-accent/[0.07] px-2 py-0.5 text-[10px] font-bold text-accent">
                  gasless ⚡
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: showAdd ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="text-white/20" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden border-t border-white/[0.05]"
              >
                <form
                  onSubmit={handleAddExpense}
                  className="flex flex-col gap-4 p-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                        Description
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-white/15 transition-all focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/15"
                        placeholder="e.g. Dinner at the rooftop"
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        required
                        maxLength={64}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                        Amount ({group.currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-white/15 transition-all focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/15"
                        placeholder={group.currency === "SOL" ? "0.01" : "5.00"}
                        value={expAmt}
                        onChange={(e) => setExpAmt(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                      Split between
                    </label>
                    <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5">
                      {group.members.map((addr) => (
                        <label
                          key={addr}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-all"
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
                            className="accent-accent h-3.5 w-3.5 rounded"
                          />
                          <span className="text-xs font-mono text-white/35">
                            {short(addr)}
                            {addr === myAddr && (
                              <span className="ml-1.5 text-accent/45 font-bold">
                                you
                              </span>
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
                    className="flex items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.08] py-3 text-sm font-bold text-accent transition-all hover:bg-accent/[0.14] hover:shadow-[0_0_18px_rgba(102,252,241,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addingExp && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    )}
                    {addingExp ? "Adding…" : "Add Expense →"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Expense List */}
      {expenses.length > 0 && (
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-5 py-3.5">
            <DollarSign size={13} className="text-accent" />
            <span className="text-sm font-bold text-white">Expenses</span>
            <span className="ml-auto text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.05] px-2 py-0.5 rounded-full">
              {expenses.length}
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {expenses.map((exp, i) => (
              <motion.div
                key={exp.index}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.05] text-[10px] font-bold text-white/20">
                  {exp.description.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 truncate">
                    {exp.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/25 flex items-center gap-1">
                    paid by <AddrChip addr={exp.paidBy} /> ·{" "}
                    {exp.splitBetween.length}-way split
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-white/70 tabular-nums">
                  {fmt(exp.amount, group.currency)}{" "}
                  <span className="text-[10px] text-white/20">
                    {group.currency}
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Settlement Section */}
      {!ledger.isSettled &&
        (() => {
          const settlements = computeSettlements(
            group.members,
            ledger.memberBalances
          );
          const myDebts = settlements
            .map((s, i) => ({ ...s, i }))
            .filter((s) => s.from === myAddr);
          const allMyDebtsPaid =
            myDebts.length === 0 ||
            myDebts.every((s) => paidSettlements.has(s.i));

          return (
            <motion.div
              custom={7}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-3"
            >
              {settlements.length > 0 && (
                <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent" />
                  <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-5 py-3.5">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="text-sm font-bold text-white">
                      How to settle
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.05] px-2 py-0.5 rounded-full">
                      {settlements.length} transfer
                      {settlements.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {settlements.map((s, i) => {
                      const isMyPayment = s.from === myAddr;
                      const isPaid = paidSettlements.has(i);
                      const isPaying = payingIndex === i;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className={`flex items-center gap-3 px-5 py-3.5 ${
                            isMyPayment && !isPaid ? "bg-amber-500/[0.025]" : ""
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            {s.from === myAddr ? (
                              <span className="text-xs font-mono font-bold text-white/70 bg-white/[0.05] px-2 py-0.5 rounded-lg">
                                you
                              </span>
                            ) : (
                              <AddrChip addr={s.from} />
                            )}
                            <span className="text-accent/25 text-sm shrink-0">
                              →
                            </span>
                            {s.to === myAddr ? (
                              <span className="text-xs font-mono font-bold text-white/70 bg-white/[0.05] px-2 py-0.5 rounded-lg">
                                you
                              </span>
                            ) : (
                              <AddrChip addr={s.to} />
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-bold text-white/70 tabular-nums">
                            {fmt(s.amount, group.currency)}{" "}
                            <span className="text-[10px] text-white/25">
                              {group.currency}
                            </span>
                          </span>

                          {isMyPayment &&
                            (isPaid ? (
                              <span className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                <Check size={12} /> Paid
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handlePay(s.to, s.amount, i, group.currency)
                                }
                                disabled={isPaying}
                                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5 text-[11px] font-bold text-amber-400 transition-all hover:bg-amber-400/[0.13] hover:shadow-[0_0_12px_rgba(251,191,36,0.1)] disabled:opacity-50"
                              >
                                {isPaying && (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                                )}
                                {isPaying ? "Paying…" : "Pay"}
                              </button>
                            ))}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleSettle}
                disabled={settling || !allMyDebtsPaid}
                title={!allMyDebtsPaid ? "Pay your share first" : ""}
                className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] py-3.5 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/[0.09] hover:shadow-[0_0_20px_rgba(52,211,153,0.08)] disabled:cursor-not-allowed disabled:opacity-40 overflow-hidden"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
                {settling ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                ) : (
                  <CheckCircle size={15} />
                )}
                {settling
                  ? "Settling…"
                  : !allMyDebtsPaid
                  ? "Pay your share to settle"
                  : "Mark All Settled ✓"}
              </button>
            </motion.div>
          );
        })()}
    </div>
  );
}
