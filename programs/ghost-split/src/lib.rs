pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use state::Currency;

declare_id!("BtXL4LiVwtNYTcxyz5TMNgcYkPzdcrxtESSpNYCaenJc");

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

    pub fn close_group(ctx: Context<CloseGroup>) -> Result<()> {
        instructions::close_group::handler(ctx)
    }

    pub fn remove_expense(ctx: Context<RemoveExpense>) -> Result<()> {
        instructions::remove_expense::handler(ctx)
    }

    /// ER lifecycle

    /// Step 1 (base): delegate GroupLedger to ER. Blocks join_group until undelegated.
    pub fn delegate_group_ledger(
        ctx: Context<DelegateGroupLedger>,
        validator: Option<Pubkey>,
    ) -> Result<()> {
        instructions::delegate_ix::delegate_group_ledger_handler(ctx, validator)
    }

    /// Step 2 (ER, optional): snapshot current ER state to base mid-session.
    pub fn commit_group_ledger(ctx: Context<CommitGroupLedger>) -> Result<()> {
        instructions::delegate_ix::commit_group_ledger_handler(ctx)
    }

    /// Step 3a (ER): commit final state and end the ER session.
    pub fn undelegate_group_ledger(ctx: Context<UndelegateGroupLedger>) -> Result<()> {
        instructions::delegate_ix::undelegate_group_ledger_handler(ctx)
    }

    /// Step 3b (base): clear is_delegated after undelegation completes.
    pub fn finalize_undelegate(ctx: Context<FinalizeUndelegate>) -> Result<()> {
        instructions::delegate_ix::finalize_undelegate_handler(ctx)
    }
}

include!("accounts.rs");
