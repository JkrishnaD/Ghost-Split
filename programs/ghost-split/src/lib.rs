pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use state::Currency;

declare_id!("JCwoWzWs2yrSXRt21AmMEi6sWBdk8mgUVWK4ytwexE6b");

#[ephemeral]
#[program]
pub mod ghost_split {
    use super::*;

    pub fn create_group(
        ctx: Context<CreateGroup>,
        group_id: u64,
        name: String,
        description: String,
        currency: Currency,
    ) -> Result<()> {
        instructions::create_group::handler(ctx, group_id, name, description, currency)
    }

    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        instructions::join_group::handler(ctx)
    }

    pub fn add_expense(
        ctx: Context<AddExpense>,
        description: String,
        amount: u64,
        split_between: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::add_expense::handler(ctx, description, amount, split_between)
    }

    pub fn mark_settled(ctx: Context<MarkSettled>) -> Result<()> {
        instructions::mark_settled::handler(ctx)
    }

    /// Delegate `GroupLedger` to MagicBlock Ephemeral Rollup (gasless updates while delegated).
    pub fn delegate_group_ledger(ctx: Context<DelegateGroupLedger>) -> Result<()> {
        instructions::delegate_ix::delegate_group_ledger_handler(ctx)
    }

    /// Commit ledger state from ER back to Solana.
    pub fn commit_group_ledger(ctx: Context<CommitGroupLedger>) -> Result<()> {
        instructions::delegate_ix::commit_group_ledger_handler(ctx)
    }

    /// Commit and undelegate ledger (ends ER session).
    pub fn undelegate_group_ledger(ctx: Context<UndelegateGroupLedger>) -> Result<()> {
        instructions::delegate_ix::undelegate_group_ledger_handler(ctx)
    }
}

include!("accounts.rs");
