# GhostSplit

Group expense tracker where settlements happen via confidential on-chain payments. Track expenses in real-time on MagicBlock's Ephemeral Rollup (gasless), then settle balances privately using the Private Payments API — no public trace of who paid whom.

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
| `delegate_group_ledger` | Delegates `GroupLedger` to the ER. Sets `is_delegated = true`. Accepts an optional validator pubkey. |
| `finalize_undelegate`   | Clears `is_delegated` after undelegation completes. Must be called by a group member.                |

#### ER-routable (send to ER RPC when `is_delegated = true`)

| Instruction    | Description                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `add_expense`  | Records an expense and updates net balances. Splits amount evenly; remainder goes to the first split member. |
| `mark_settled` | Zeros all balances and marks the group settled. Call after Private Payments transfers confirm.               |

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
- **Program ID:** `JCwoWzWs2yrSXRt21AmMEi6sWBdk8mgUVWK4ytwexE6b`

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
