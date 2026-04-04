use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

use crate::constants::LEDGER_SEED;
use crate::{CommitGroupLedger, DelegateGroupLedger, UndelegateGroupLedger};

pub fn delegate_group_ledger_handler(ctx: Context<DelegateGroupLedger>) -> Result<()> {
    ctx.accounts.delegate_ledger(
        &ctx.accounts.payer,
        &[LEDGER_SEED, ctx.accounts.group.key().as_ref()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|a| a.key()),
            ..Default::default()
        },
    )?;
    Ok(())
}

pub fn commit_group_ledger_handler(ctx: Context<CommitGroupLedger>) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}

pub fn undelegate_group_ledger_handler(ctx: Context<UndelegateGroupLedger>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}
