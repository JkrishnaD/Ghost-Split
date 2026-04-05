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
import { Plus, ArrowRight, Users, Zap } from "lucide-react";

interface GroupCard {
  pda: string;
  name: string;
  currency: string;
  memberCount: number;
  isDelegated: boolean;
  isSettled: boolean;
}

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
        try {
          const l = await program.account.groupLedger.fetch(ledgerPda(pk));
          isSettled = l.isSettled as boolean;
        } catch {}
        seen.set(pda, {
          pda,
          name: g.account.name,
          currency: g.account.currency.sol ? "SOL" : "USDC",
          memberCount: g.account.members.length,
          isDelegated: g.account.isDelegated,
          isSettled,
        });
      }

      for (const s of loadGroups()) {
        if (seen.has(s.pda)) continue;
        try {
          const pk = new PublicKey(s.pda);
          const g = await program.account.group.fetch(pk);
          const l = await program.account.groupLedger.fetch(ledgerPda(pk));
          seen.set(s.pda, {
            pda: s.pda,
            name: g.name,
            currency: g.currency.sol ? "SOL" : "USDC",
            memberCount: g.members.length,
            isDelegated: g.isDelegated,
            isSettled: l.isSettled as boolean,
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

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
            Your Groups
          </h1>
          <p className="text-sm text-white/40">
            Track and settle shared expenses on-chain
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            showCreate
              ? "border border-white/10 text-white/50 hover:text-white hover:border-white/20"
              : "bg-accent/10 border border-accent/25 text-accent hover:bg-accent/15"
          }`}
        >
          {showCreate ? (
            "Cancel"
          ) : (
            <>
              <Plus size={16} /> New Group
            </>
          )}
        </button>
      </div>

      {/* Create Panel */}
      {showCreate && (
        <div className="border border-white/[0.07] bg-white/3 rounded-2xl p-6 flex flex-col gap-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap size={16} className="text-accent" />
            Create New Group
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-white/30">
                Group Name
              </label>
              <input
                className="w-full bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                placeholder="e.g. Goa Trip"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                maxLength={32}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-white/30">
                Description (Optional)
              </label>
              <input
                className="w-full bg-white/4 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                placeholder="Add details about this group"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                maxLength={64}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-white/30">
                Currency
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency("SOL")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    currency === "SOL"
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "bg-white/3 border-white/[0.07] text-white/40 hover:text-white/70"
                  }`}
                >
                  SOL
                </button>
                <button
                  type="button"
                  disabled
                  title="USDC settlements coming soon"
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-white/4 bg-white/2 text-white/20 cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  USDC
                  <span className="text-[10px] text-white/20">soon</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !groupName.trim()}
              className="mt-2 py-2.5 rounded-xl text-sm font-semibold bg-accent/10 border border-accent/25 text-accent hover:bg-accent/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {creating && (
                <div className="w-4 h-4 border-2  border-accent/30 border-t-accent rounded-full animate-spin" />
              )}
              {creating ? "Creating…" : "Create Group"}
            </button>
          </form>
        </div>
      )}

      {/* Groups Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-white/30">Loading your groups…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="border border-white/[0.07] bg-white/3 rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/4 border border-white/[0.07] flex items-center justify-center">
            <Users size={24} className="text-white/20" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white/70">
              No groups yet
            </h3>
            <p className="text-sm text-white/30 max-w-xs">
              Create a new group to start tracking expenses or join an existing
              one via address
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <button
              key={g.pda}
              onClick={() => setActiveGroup(g.pda)}
              className="text-left border border-white/[0.07] bg-white/3 hover:border-accent/20 hover:bg-accent/3 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold text-white group-hover:text-accent transition-colors line-clamp-1">
                  {g.name}
                </h3>
                <ArrowRight
                  size={16}
                  className="text-white/20 group-hover:text-accent transition-all shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
                />
              </div>

              <p className="text-[11px] text-white/25 font-mono mb-3">
                {g.pda.slice(0, 8)}…{g.pda.slice(-6)}
              </p>

              <div className="flex gap-2 mb-3">
                {g.isSettled && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Settled
                  </span>
                )}
                {g.isDelegated && !g.isSettled && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    Live
                  </span>
                )}
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/[0.07]">
                  {g.currency}
                </span>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-white/25">
                <Users size={12} />
                {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Join Section */}
      <div className="border-t border-white/6 pt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-white">
            Join Existing Group
          </h2>
          <p className="text-sm text-white/30">
            Have a group address? Paste it below
          </p>
        </div>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="flex-1 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            placeholder="Paste group address (Base58)"
            value={joinAddr}
            onChange={(e) => setJoinAddr(e.target.value)}
          />
          <button
            type="submit"
            disabled={!joinAddr.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/8 text-white/50 hover:border-accent/25 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            View <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
