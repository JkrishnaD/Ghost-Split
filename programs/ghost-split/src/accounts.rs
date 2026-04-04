// Crate-root account structs for Anchor `#[program]` / `#[ephemeral]` codegen (Veil pattern).
// Handlers live under `instructions/`.

#[allow(unused_imports)]
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};

use crate::errors::ErrorCode;
use crate::state::{Expense, Group, GroupLedger};

#[derive(Accounts)]
#[instruction(group_id: u64, name: String, description: String, currency: crate::state::Currency)]
pub struct CreateGroup<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Group::INIT_SPACE,
        seeds = [crate::GROUP_SEED, creator.key().as_ref(), &group_id.to_le_bytes()],
        bump
    )]
    pub group: Account<'info, Group>,
    #[account(
        init,
        payer = creator,
        space = 8 + GroupLedger::INIT_SPACE,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump
    )]
    pub ledger: Account<'info, GroupLedger>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(mut)]
    pub group: Account<'info, Group>,
    #[account(
        mut,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
    pub member: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(description: String)]
pub struct AddExpense<'info> {
    // read-only — ER can snapshot this from base without delegating it
    pub group: Account<'info, Group>,
    #[account(
        mut,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
    #[account(
        init,
        payer = payer,
        space = 8 + Expense::INIT_SPACE,
        seeds = [
            b"expense",
            group.key().as_ref(),
            &ledger.expense_count.to_le_bytes(),
        ],
        bump
    )]
    pub expense: Account<'info, Expense>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkSettled<'info> {
    pub group: Account<'info, Group>,
    #[account(
        mut,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
    pub authority: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateGroupLedger<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, del, seeds = [crate::LEDGER_SEED, group.key().as_ref()], bump)]
    pub ledger: AccountInfo<'info>,
    #[account(mut)]
    pub group: Account<'info, Group>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitGroupLedger<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
    pub group: Account<'info, Group>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateGroupLedger<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
    pub group: Account<'info, Group>,
}

/// Clears is_delegated after undelegation. Ledger must be owned by this
/// program again (constraint fails if undelegation isn't complete yet).
#[derive(Accounts)]
pub struct FinalizeUndelegate<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub group: Account<'info, Group>,
    #[account(
        seeds = [crate::LEDGER_SEED, group.key().as_ref()],
        bump = ledger.bump,
        constraint = ledger.group == group.key() @ ErrorCode::LedgerMismatch
    )]
    pub ledger: Account<'info, GroupLedger>,
}
