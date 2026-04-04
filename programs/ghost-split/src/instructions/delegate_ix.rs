use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

use crate::constants::{COMMIT_FREQUENCY_MS, LEDGER_SEED};
use crate::errors::ErrorCode;
use crate::{CommitGroupLedger, DelegateGroupLedger, FinalizeUndelegate, UndelegateGroupLedger};

pub fn delegate_group_ledger_handler(
    ctx: Context<DelegateGroupLedger>,
    validator: Option<Pubkey>,
) -> Result<()> {
    require!(!ctx.accounts.group.is_delegated, ErrorCode::AlreadyDelegated);

    // Set flag before the CPI so Group is still writable on base.
    ctx.accounts.group.is_delegated = true;

    ctx.accounts.delegate_ledger(
        &ctx.accounts.payer,
        &[LEDGER_SEED, ctx.accounts.group.key().as_ref()],
        DelegateConfig {
            commit_frequency_ms: COMMIT_FREQUENCY_MS,
            validator,
        },
    )?;

    Ok(())
}

// Called from ER — flushes ledger state to base without ending the session.
pub fn commit_group_ledger_handler(ctx: Context<CommitGroupLedger>) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}

// Called from ER — commits final state and ends the ER session.
pub fn undelegate_group_ledger_handler(ctx: Context<UndelegateGroupLedger>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}

// Called on base after undelegation completes. Clears is_delegated.
pub fn finalize_undelegate_handler(ctx: Context<FinalizeUndelegate>) -> Result<()> {
    let group = &mut ctx.accounts.group;
    require!(group.is_delegated, ErrorCode::NotDelegated);
    require!(
        group.members.contains(&ctx.accounts.authority.key()),
        ErrorCode::NotMember
    );
    group.is_delegated = false;
    Ok(())
}
