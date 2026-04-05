# GhostSplit

Group expense tracker where settlements happen via confidential on-chain payments. Track expenses in real-time on MagicBlock's Ephemeral Rollup (gasless), then settle balances privately using the Private Payments API — no public trace of who paid whom.

---

## Why GhostSplit?

Every existing expense-splitting app (Splitwise, Settle Up, etc.) is a database owned by a company. On-chain alternatives force you to pay gas for every expense entry, and when you finally settle, the transfers are fully public — anyone can see Alice paid Bob 0.5 SOL.

GhostSplit solves both: expenses are recorded gaslessly on MagicBlock's Ephemeral Rollup, and when it's time to settle, the actual money transfers are confidential — amounts and parties are hidden from everyone except the people involved.

---

## How settlements are private

On Solana's base layer every transaction is public. If Alice pays Bob 12 USDC to settle a trip, anyone can see the wallets and the exact amount. For a group expense app this exposes real financial relationships between people.

GhostSplit settles balances using **MagicBlock's Private Payments API**, which wraps Solana's confidential transfer extension (SPL Token 2022). Here's what happens:

1. Token balances are **ElGamal-encrypted** on-chain — the plaintext amount is never stored.
2. Each transfer attaches a **zero-knowledge proof** that proves the sender has enough funds and the recipient receives the right amount — without revealing either.
3. Validators verify the ZK proof and apply the transfer. No one watching the chain can read the amount or link payer to payee.
4. Only the sender and recipient can decrypt their own balance using their private key.

The settlement transaction appears on-chain (auditable as "something happened") but the amounts and relationships are cryptographically hidden. After all transfers confirm, `mark_settled` zeros all balances in the group ledger and the ER session closes — leaving only the expense history as a permanent audit trail.

---

## How settlements are private

On Solana's base layer every transaction is public — if Alice pays Bob 12 USDC to settle a trip, anyone can see both wallets and the exact amount. For a group expense app this leaks real financial relationships between people.

GhostSplit settles balances using **MagicBlock's Private Payments API**, which wraps Solana's confidential transfer extension (SPL Token 2022):

- Token balances are **ElGamal-encrypted** on-chain — the plaintext amount is never stored.
- Each transfer attaches a **zero-knowledge proof** proving the sender has sufficient funds and the recipient receives the correct amount — without revealing either value.
- Validators verify the ZK proof and apply the transfer. Nobody watching the chain can read the amount or link payer to payee.
- Only the two parties can decrypt their own balance using their private key.

The settlement transaction is still auditable as "something happened", but the amounts and relationships are cryptographically hidden from everyone else. After all transfers confirm, `mark_settled` zeros all balances and the ER session closes — leaving only the expense records as a permanent, public audit trail of what was spent, not who paid whom.

---

## How it works

### Accounts

**`Group`** — static metadata stored on Solana base layer.

- Holds group name, creator, member list (max 10), currency (SOL or USDC), and an `is_delegated` flag that tells clients which RPC endpoint to target.

**`GroupLedger`** — hot state delegated to the MagicBlock ER.

- Holds per-member net balances (`member_balances: Vec<i64>`), expense count, and settlement status.
- Positive balance = owed money. Negative = owes money.

**`Expense`** — append-only record created per expense.

- Stores who paid, amount, description, and who it was split between.
- Created on the ER during an active session; committed to base on undelegation.

---

### Instructions

#### Base layer

| Instruction             | Description                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `create_group`          | Creates `Group` + `GroupLedger` PDAs. Creator is automatically the first member.                     |
| `join_group`            | Adds a member to the group. Blocked while the group is delegated to prevent member/balance desync.   |
| `close_group`           | Closes the group and refunds rent to the creator. Can only be called by the creator.                 |
| `delegate_group_ledger` | Delegates `GroupLedger` to the ER. Sets `is_delegated = true`. Accepts an optional validator pubkey. |
| `finalize_undelegate`   | Clears `is_delegated` after undelegation completes. Must be called by a group member.                |

#### ER-routable (send to ER RPC when `is_delegated = true`)

| Instruction      | Description                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `add_expense`    | Records an expense and updates net balances. Splits amount evenly; remainder goes to the first split member. |
| `remove_expense` | Deletes an expense and reverts its effect on net balances. Can only be called by the expense payer.          |
| `mark_settled`   | Zeros all balances and marks the group settled. Call after Private Payments transfers confirm.               |

#### ER lifecycle (called from ER cluster)

| Instruction               | Description                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `commit_group_ledger`     | Snapshots current ER state to Solana without ending the session.                           |
| `undelegate_group_ledger` | Commits final state and ends the ER session. Follow up with `finalize_undelegate` on base. |

---

### ER session lifecycle

```
[Base]  create_group
[Base]  join_group  (repeat for each member)
[Base]  delegate_group_ledger(validator: None)

[ER]    add_expense  →  gasless, instant balance updates
[ER]    add_expense  ...
[ER]    mark_settled  →  after Private Payments complete
[ER]    commit_group_ledger  (optional mid-session snapshot)
[ER]    undelegate_group_ledger

[Base]  finalize_undelegate
```

While `is_delegated = true`, route `add_expense` and `mark_settled` to the ER RPC (`NEXT_PUBLIC_MAGICBLOCK_ER_URL`). All other instructions run on Solana.

---

### Settlement flow

1. Fetch `member_balances` from `GroupLedger` on the ER.
2. Compute optimal payment routes (minimize number of transfers).
3. For each transfer, call the MagicBlock Private Payments API (`/v1/spl/transfer` with `visibility: "private"`).
4. Once all transfers confirm, call `mark_settled` on the ER.
5. Call `undelegate_group_ledger` then `finalize_undelegate` to close the ER session.

---

### Balance math

`add_expense(amount, split_between)`:

- `member_balances[payer] += amount`
- `member_balances[each split member] -= floor(amount / n)`
- Remainder (`amount % n`) is subtracted from the first `n % amount` members (standard integer distribution)

All arithmetic uses checked operations (`checked_add`, `i64::try_from`) to reject overflow.

---

## Program

- **Framework:** Anchor 0.32
- **ER SDK:** `ephemeral-rollups-sdk 0.6.5`
- **Network:** Solana Devnet
- **Program ID:** `BtXL4LiVwtNYTcxyz5TMNgcYkPzdcrxtESSpNYCaenJc`

---

## Running tests

```bash
anchor build
anchor test
```

ER lifecycle tests require a MagicBlock-capable cluster:

```bash
GHOST_SPLIT_TEST_ER=1 anchor test
```
