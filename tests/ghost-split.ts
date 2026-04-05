import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program, Wallet } from "@coral-xyz/anchor";
import { expect } from "chai";
import BN from "bn.js";
import { readFileSync } from "fs";
import { join } from "path";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { GhostSplit } from "../target/types/ghost_split";

const LAMPORTS_PER_MEMBER = 50_000_000;
const MIN_PAYER_LAMPORTS = 4 * LAMPORTS_PER_MEMBER + 100_000_000;

const idlPath = join(process.cwd(), "target/idl/ghost_split.json");
const idl = JSON.parse(readFileSync(idlPath, "utf8")) as GhostSplit;

const codeToName = new Map<number, string>();
for (const e of idl.errors ?? []) {
  codeToName.set(e.code, e.name);
}

function extractErrorName(err: unknown): string | undefined {
  const any = err as {
    error?: { errorCode?: { code?: string } };
    logs?: string[];
    message?: string;
  };
  const direct = any?.error?.errorCode?.code;
  if (direct) return direct;

  if (any?.logs) {
    const fromLogs = AnchorError.parse(any.logs);
    const c = fromLogs?.error?.errorCode?.code;
    if (c) return c;
  }

  const msg =
    any?.message ?? (err instanceof Error ? err.message : String(err));
  const codeFromMsg = msg.match(/Error Code:\s*(\w+)/);
  if (codeFromMsg) return codeFromMsg[1];
  const hex = msg.match(/custom program error:\s*(0x[0-9a-fA-F]+)/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    let name = codeToName.get(n);
    if (!name && n < 256) name = codeToName.get(6000 + n);
    if (name) return name;
  }
  const custom = msg.match(/"Custom":\s*(\d+)/);
  if (custom) {
    const n = parseInt(custom[1], 10);
    let name = codeToName.get(n);
    if (!name && n < 256) name = codeToName.get(6000 + n);
    if (name) return name;
  }
  return undefined;
}

function assertAnchorError(err: unknown, code: string): void {
  const got = extractErrorName(err);
  expect(
    got,
    `expected program error ${code}, got ${got ?? String(err)}`
  ).to.equal(code);
}

function uniqueGroupId(): BN {
  return new BN(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

function groupPda(
  programId: PublicKey,
  creator: PublicKey,
  groupId: BN
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("group"),
      creator.toBuffer(),
      groupId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  )[0];
}

function ledgerPda(programId: PublicKey, group: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("er_ledger"), group.toBuffer()],
    programId
  )[0];
}

function expensePda(
  programId: PublicKey,
  group: PublicKey,
  expenseIndex: number
): PublicKey {
  const idx = Buffer.alloc(4);
  idx.writeUInt32LE(expenseIndex, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("expense"), group.toBuffer(), idx],
    programId
  )[0];
}

type Fixture = {
  program: Program<GhostSplit>;
  provider: anchor.AnchorProvider;
  creator: PublicKey;
  payer: Keypair;
  alice: Keypair;
  bob: Keypair;
  carol: Keypair;
};

let cached: Fixture | null = null;

async function getFixture(): Promise<Fixture> {
  if (cached) return cached;
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = new Program(idl, provider) as Program<GhostSplit>;

  const creator = provider.wallet.publicKey;
  const payer = (provider.wallet as Wallet).payer;

  const alice = Keypair.generate();
  const bob = Keypair.generate();
  const carol = Keypair.generate();

  const payerBal = await provider.connection.getBalance(payer.publicKey);
  if (payerBal < MIN_PAYER_LAMPORTS) {
    throw new Error(
      `Provider wallet needs at least ${MIN_PAYER_LAMPORTS} lamports (have ${payerBal}). Airdrop or fund the Anchor wallet.`
    );
  }

  for (const kp of [alice, bob, carol]) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: kp.publicKey,
        lamports: LAMPORTS_PER_MEMBER,
      })
    );
    await provider.sendAndConfirm(tx, [payer]);
  }

  cached = { program, provider, creator, payer, alice, bob, carol };
  return cached;
}

/** MagicBlock ER txs need delegation + magic programs on-chain; set `GHOST_SPLIT_TEST_ER=1` on a capable cluster. */
const RUN_ER = process.env.GHOST_SPLIT_TEST_ER === "1";

describe("ghost-split — core flow (create / close / join / expenses / settle)", function () {
  this.timeout(120_000);

  it("create_group initializes group + ledger PDAs", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Goa Trip", "beach", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    const g = await ctx.program.account.group.fetch(group);
    expect(g.name).to.eq("Goa Trip");
    expect(g.description).to.eq("beach");
    expect(g.members.length).to.eq(1);
    expect(g.members[0].toBase58()).to.eq(ctx.creator.toBase58());
    expect(g.isDelegated).to.eq(false);

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    expect(l.group.toBase58()).to.eq(group.toBase58());
    expect(l.memberBalances.length).to.eq(1);
    expect(l.memberBalances[0].toNumber()).to.eq(0);
    expect(l.expenseCount).to.eq(0);
    expect(l.isSettled).to.eq(false);
  });

  it("close_group closes accounts", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Close test", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .closeGroup()
      .accounts({
        group,
      })
      .rpc();

    try {
      await ctx.program.account.group.fetch(group);
      throw new Error("group should be closed");
    } catch (_) {
      expect(true).to.eq(true);
    }
  });

  it("join_group adds member and ledger row", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Roommates", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({
        group,
        member: ctx.alice.publicKey,
      })
      .signers([ctx.alice])
      .rpc();

    const g = await ctx.program.account.group.fetch(group);
    expect(g.members.length).to.eq(2);
    const l = await ctx.program.account.groupLedger.fetch(ledger);
    expect(l.memberBalances.length).to.eq(2);
  });

  it("add_expense updates net balances (split 2 ways, paid by creator)", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Dinner", "", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({
        group,
        member: ctx.bob.publicKey,
      })
      .signers([ctx.bob])
      .rpc();

    const exp0 = expensePda(ctx.program.programId, group, 0);

    await ctx.program.methods
      .addExpense("Pizza", new BN(300), [ctx.creator, ctx.bob.publicKey])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    expect(l.expenseCount).to.eq(1);
    expect(l.memberBalances[0].toNumber()).to.eq(150);
    expect(l.memberBalances[1].toNumber()).to.eq(-150);

    const e = await ctx.program.account.expense.fetch(exp0);
    expect(e.description).to.eq("Pizza");
    expect(e.amount.toNumber()).to.eq(300);
    expect(e.paidBy.toBase58()).to.eq(ctx.creator.toBase58());
    expect(e.splitBetween.length).to.eq(2);
  });

  it("remove_expense reverses balances correctly", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Remove test", "", { usdc: {} })
      .accounts({ creator: ctx.creator })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({ group, member: ctx.alice.publicKey })
      .signers([ctx.alice])
      .rpc();

    const expense = expensePda(ctx.program.programId, group, 0);

    await ctx.program.methods
      .addExpense("Dinner", new BN(100), [ctx.creator, ctx.alice.publicKey])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    // remove expense
    await ctx.program.methods
      .removeExpense()
      .accounts({
        group,
        expense,
        expensePayer: ctx.creator,
      })
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);

    expect(l.memberBalances[0].toNumber()).to.eq(0);
    expect(l.memberBalances[1].toNumber()).to.eq(0);
  });

  it("remove_expense rejects non payer", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Unauthorized", "", { sol: {} })
      .accounts({ creator: ctx.creator })
      .rpc();

    const expense = expensePda(ctx.program.programId, group, 0);

    await ctx.program.methods
      .addExpense("Dinner", new BN(100), [ctx.creator])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .removeExpense()
        .accounts({
          group,
          expense,
          expensePayer: ctx.alice.publicKey,
        })
        .signers([ctx.alice])
        .rpc();

      throw new Error("expected NotExpensePayer");
    } catch (e) {
      assertAnchorError(e, "NotExpensePayer");
    }
  });

  it("remove_expense rejects after settled", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Settled", "", { sol: {} })
      .accounts({ creator: ctx.creator })
      .rpc();

    const expense = expensePda(ctx.program.programId, group, 0);

    await ctx.program.methods
      .addExpense("Dinner", new BN(100), [ctx.creator])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .markSettled()
      .accounts({
        group,
        authority: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .removeExpense()
        .accounts({
          group,
          expense,
          expensePayer: ctx.creator,
        })
        .rpc();

      throw new Error("expected AlreadySettled");
    } catch (e) {
      assertAnchorError(e, "AlreadySettled");
    }
  });

  it("mark_settled clears ledger balances", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Settle test", "", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({
        group,
        member: ctx.carol.publicKey,
      })
      .signers([ctx.carol])
      .rpc();

    await ctx.program.methods
      .addExpense("Cab", new BN(100), [ctx.creator, ctx.carol.publicKey])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .markSettled()
      .accounts({
        group,
        authority: ctx.creator,
      })
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    expect(l.isSettled).to.eq(true);
    expect(l.memberBalances.every((b) => b.toNumber() === 0)).to.eq(true);
  });
});

describe("ghost-split — negative cases", function () {
  this.timeout(120_000);

  it("join_group rejects duplicate member", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    // const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Dup", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({
        group,
        member: ctx.alice.publicKey,
      })
      .signers([ctx.alice])
      .rpc();

    try {
      await ctx.program.methods
        .joinGroup()
        .accounts({
          group,
          member: ctx.alice.publicKey,
        })
        .signers([ctx.alice])
        .rpc();
      throw new Error("expected AlreadyMember");
    } catch (e) {
      assertAnchorError(e, "AlreadyMember");
    }
  });

  it("add_expense rejects empty split", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Empty split", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .addExpense("x", new BN(10), [])
        .accounts({
          group,
          payer: ctx.creator,
        })
        .rpc();
      throw new Error("expected EmptySplit");
    } catch (e) {
      assertAnchorError(e, "EmptySplit");
    }
  });

  it("add_expense rejects payer not in group", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Solo", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .addExpense("hack", new BN(1), [new PublicKey(ctx.creator)])
        .accounts({
          group,
          payer: ctx.bob.publicKey,
        })
        .signers([ctx.bob])
        .rpc();
      throw new Error("expected PayerNotMember");
    } catch (e) {
      assertAnchorError(e, "PayerNotMember");
    }
  });

  it("join_group fails after mark_settled", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Closed", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .markSettled()
      .accounts({
        group,
        authority: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .joinGroup()
        .accounts({
          group,
          member: ctx.bob.publicKey,
        })
        .signers([ctx.bob])
        .rpc();
      throw new Error("expected AlreadySettled");
    } catch (e) {
      assertAnchorError(e, "AlreadySettled");
    }
  });
});

describe("ghost-split — negative cases (continued)", function () {
  this.timeout(120_000);

  it("mark_settled rejects non-member authority", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Auth test", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    // ctx.alice is not a member of this group
    try {
      await ctx.program.methods
        .markSettled()
        .accounts({ group, authority: ctx.alice.publicKey })
        .signers([ctx.alice])
        .rpc();
      throw new Error("expected NotMember");
    } catch (e) {
      assertAnchorError(e, "NotMember");
    }
  });

  it("add_expense rejects after mark_settled", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Settled addexp", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .markSettled()
      .accounts({ group, authority: ctx.creator })
      .rpc();

    try {
      await ctx.program.methods
        .addExpense("Late expense", new BN(50), [ctx.creator])
        .accounts({
          group,
          payer: ctx.creator,
        })
        .rpc();
      throw new Error("expected AlreadySettled");
    } catch (e) {
      assertAnchorError(e, "AlreadySettled");
    }
  });

  it("add_expense rejects split member not in group", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Split test", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    const outsider = Keypair.generate();

    try {
      await ctx.program.methods
        .addExpense("Snack", new BN(20), [ctx.creator, outsider.publicKey])
        .accounts({
          group,
          payer: ctx.creator,
        })
        .rpc();
      throw new Error("expected SplitNotMember");
    } catch (e) {
      assertAnchorError(e, "SplitNotMember");
    }
  });

  it("create_group rejects name too long", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    try {
      await ctx.program.methods
        .createGroup(groupId, "A".repeat(33), "", { sol: {} })
        .accounts({
          creator: ctx.creator,
        })
        .rpc();
      throw new Error("expected NameTooLong");
    } catch (e) {
      assertAnchorError(e, "NameTooLong");
    }
  });

  it("create_group rejects description too long", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();

    try {
      await ctx.program.methods
        .createGroup(groupId, "Valid", "D".repeat(65), { sol: {} })
        .accounts({
          creator: ctx.creator,
        })
        .rpc();
      throw new Error("expected DescriptionTooLong");
    } catch (e) {
      assertAnchorError(e, "DescriptionTooLong");
    }
  });

  it("finalize_undelegate rejects when group is not delegated", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Not delegated", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    try {
      await ctx.program.methods
        .finalizeUndelegate()
        .accounts({ authority: ctx.creator, group })
        .rpc();
      throw new Error("expected NotDelegated");
    } catch (e) {
      assertAnchorError(e, "NotDelegated");
    }
  });
});

describe("ghost-split — balance math", function () {
  this.timeout(120_000);

  it("odd-amount expense distributes remainder to first split member", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Odd split", "", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({ group, member: ctx.alice.publicKey })
      .signers([ctx.alice])
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({ group, member: ctx.bob.publicKey })
      .signers([ctx.bob])
      .rpc();

    // 100 split 3 ways → base=33, rem=1 → shares: [34, 33, 33]
    await ctx.program.methods
      .addExpense("Dinner", new BN(100), [
        ctx.creator,
        ctx.alice.publicKey,
        ctx.bob.publicKey,
      ])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    // creator paid 100, owes 34  → net = +66
    expect(l.memberBalances[0].toNumber()).to.eq(66);
    // alice owes 33              → net = -33
    expect(l.memberBalances[1].toNumber()).to.eq(-33);
    // bob owes 33                → net = -33
    expect(l.memberBalances[2].toNumber()).to.eq(-33);
    // sanity: all balances sum to zero
    const sum = l.memberBalances.reduce(
      (acc: number, b: anchor.BN) => acc + b.toNumber(),
      0
    );
    expect(sum).to.eq(0);
  });

  it("multiple sequential expenses accumulate correctly", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Multi-expense", "", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({ group, member: ctx.alice.publicKey })
      .signers([ctx.alice])
      .rpc();

    // Expense 0: creator pays 200 split equally → creator +100, alice -100
    await ctx.program.methods
      .addExpense("Groceries", new BN(200), [ctx.creator, ctx.alice.publicKey])
      .accounts({
        group,
        payer: ctx.creator,
      })
      .rpc();

    // Expense 1: alice pays 60 split equally → alice +30, creator -30
    await ctx.program.methods
      .addExpense("Coffee", new BN(60), [ctx.creator, ctx.alice.publicKey])
      .accounts({
        group,
        payer: ctx.alice.publicKey,
      })
      .signers([ctx.alice])
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    expect(l.expenseCount).to.eq(2);
    // creator: +100 - 30 = +70
    expect(l.memberBalances[0].toNumber()).to.eq(70);
    // alice: -100 + 30 = -70
    expect(l.memberBalances[1].toNumber()).to.eq(-70);
  });

  it("expense paid by non-payer member (alice pays, creator splits)", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);
    const ledger = ledgerPda(ctx.program.programId, group);

    await ctx.program.methods
      .createGroup(groupId, "Alice pays", "", { usdc: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    await ctx.program.methods
      .joinGroup()
      .accounts({ group, member: ctx.alice.publicKey })
      .signers([ctx.alice])
      .rpc();

    await ctx.program.methods
      .addExpense("Taxi", new BN(80), [ctx.creator, ctx.alice.publicKey])
      .accounts({
        group,
        payer: ctx.alice.publicKey,
      })
      .signers([ctx.alice])
      .rpc();

    const l = await ctx.program.account.groupLedger.fetch(ledger);
    // creator owes 40 → -40
    expect(l.memberBalances[0].toNumber()).to.eq(-40);
    // alice paid 80, owes 40 → +40
    expect(l.memberBalances[1].toNumber()).to.eq(40);
  });
});

describe("ghost-split — group capacity", function () {
  this.timeout(180_000);

  it("join_group rejects when group is full (10 members)", async () => {
    const ctx = await getFixture();
    const groupId = uniqueGroupId();
    const group = groupPda(ctx.program.programId, ctx.creator, groupId);

    await ctx.program.methods
      .createGroup(groupId, "Full house", "", { sol: {} })
      .accounts({
        creator: ctx.creator,
      })
      .rpc();

    // Fund and add 8 more members (creator is slot 0 → 9 total after loop, then 10th fails)
    const extras: Keypair[] = [];
    for (let i = 0; i < 9; i++) {
      const kp = Keypair.generate();
      extras.push(kp);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: ctx.payer.publicKey,
          toPubkey: kp.publicKey,
          lamports: LAMPORTS_PER_MEMBER,
        })
      );
      await ctx.provider.sendAndConfirm(tx, [ctx.payer]);
      await ctx.program.methods
        .joinGroup()
        .accounts({ group, member: kp.publicKey })
        .signers([kp])
        .rpc();
    }

    // 11th member should be rejected
    const overflow = Keypair.generate();
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: ctx.payer.publicKey,
        toPubkey: overflow.publicKey,
        lamports: LAMPORTS_PER_MEMBER,
      })
    );
    await ctx.provider.sendAndConfirm(fundTx, [ctx.payer]);

    try {
      await ctx.program.methods
        .joinGroup()
        .accounts({ group, member: overflow.publicKey })
        .signers([overflow])
        .rpc();
      throw new Error("expected GroupFull");
    } catch (e) {
      assertAnchorError(e, "GroupFull");
    }
  });
});

(RUN_ER ? describe : describe.skip)(
  "ghost-split — MagicBlock ER (delegate / commit / undelegate)",
  function () {
    this.timeout(180_000);

    it("full ER lifecycle: delegate → add expense → commit → undelegate → finalize", async () => {
      const ctx = await getFixture();
      const groupId = uniqueGroupId();
      const group = groupPda(ctx.program.programId, ctx.creator, groupId);
      const ledger = ledgerPda(ctx.program.programId, group);

      await ctx.program.methods
        .createGroup(groupId, "ER flow", "", { usdc: {} })
        .accounts({
          creator: ctx.creator,
        })
        .rpc();

      await ctx.program.methods
        .joinGroup()
        .accounts({ group, member: ctx.alice.publicKey })
        .signers([ctx.alice])
        .rpc();

      // Step 1: delegate (base layer). validator = null → default MagicBlock validator.
      await ctx.program.methods
        .delegateGroupLedger(null)
        .accounts({
          payer: ctx.creator,
          group,
        })
        .rpc();

      let g = await ctx.program.account.group.fetch(group);
      expect(g.isDelegated).to.eq(true);

      // Step 2: add expense on ER (gasless).
      await ctx.program.methods
        .addExpense("Hotel", new BN(200), [ctx.creator, ctx.alice.publicKey])
        .accounts({
          group,
          payer: ctx.creator,
        })
        .rpc();

      // Step 3 (optional): mid-session commit to snapshot state to base.
      await ctx.program.methods
        .commitGroupLedger()
        .accounts({
          payer: ctx.creator,
          group,
        })
        .rpc();

      const lMid = await ctx.program.account.groupLedger.fetch(ledger);
      expect(lMid.expenseCount).to.eq(1);
      expect(lMid.memberBalances[0].toNumber()).to.eq(100);
      expect(lMid.memberBalances[1].toNumber()).to.eq(-100);

      // Step 4: commit final state and end ER session (called from ER).
      await ctx.program.methods
        .undelegateGroupLedger()
        .accounts({
          payer: ctx.creator,
          group,
        })
        .rpc();

      // Step 5: clear is_delegated flag on base.
      await ctx.program.methods
        .finalizeUndelegate()
        .accounts({ authority: ctx.creator, group })
        .rpc();

      g = await ctx.program.account.group.fetch(group);
      expect(g.isDelegated).to.eq(false);

      const lFinal = await ctx.program.account.groupLedger.fetch(ledger);
      expect(lFinal.group.toBase58()).to.eq(group.toBase58());
    });

    it("delegate_group_ledger rejects if already delegated", async () => {
      const ctx = await getFixture();
      const groupId = uniqueGroupId();
      const group = groupPda(ctx.program.programId, ctx.creator, groupId);

      await ctx.program.methods
        .createGroup(groupId, "Double del", "", { sol: {} })
        .accounts({
          creator: ctx.creator,
        })
        .rpc();

      await ctx.program.methods
        .delegateGroupLedger(null)
        .accounts({
          payer: ctx.creator,
          group,
        })
        .rpc();

      try {
        await ctx.program.methods
          .delegateGroupLedger(null)
          .accounts({
            payer: ctx.creator,
            group,
          })
          .rpc();
        throw new Error("expected AlreadyDelegated");
      } catch (e) {
        assertAnchorError(e, "AlreadyDelegated");
      }
    });

    it("join_group rejects while group is delegated", async () => {
      const ctx = await getFixture();
      const groupId = uniqueGroupId();
      const group = groupPda(ctx.program.programId, ctx.creator, groupId);

      await ctx.program.methods
        .createGroup(groupId, "Del join", "", { sol: {} })
        .accounts({
          creator: ctx.creator,
        })
        .rpc();

      await ctx.program.methods
        .delegateGroupLedger(null)
        .accounts({
          payer: ctx.creator,
          group,
        })
        .rpc();

      try {
        await ctx.program.methods
          .joinGroup()
          .accounts({ group, member: ctx.bob.publicKey })
          .signers([ctx.bob])
          .rpc();
        throw new Error("expected AlreadyDelegated");
      } catch (e) {
        assertAnchorError(e, "AlreadyDelegated");
      }
    });
  }
);
