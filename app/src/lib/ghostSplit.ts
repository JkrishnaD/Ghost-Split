import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import idl from "../../src/idl/ghost_split.json";
import type { GhostSplit } from "../../src/idl/types/ghost_split";

export const PROGRAM_ID = new PublicKey(
  "BtXL4LiVwtNYTcxyz5TMNgcYkPzdcrxtESSpNYCaenJc"
);

export function getProgram(provider: AnchorProvider) {
  return new Program<GhostSplit>(idl as GhostSplit, provider);
}

export function groupPda(creator: PublicKey, groupId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("group"),
      creator.toBuffer(),
      groupId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  )[0];
}

export function ledgerPda(group: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("er_ledger"), group.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function expensePda(group: PublicKey, expenseCount: number): PublicKey {
  const idx = Buffer.alloc(4);
  idx.writeUInt32LE(expenseCount, 0);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("expense"), group.toBuffer(), idx],
    PROGRAM_ID
  )[0];
}

export function uniqueGroupId(): BN {
  return new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}
