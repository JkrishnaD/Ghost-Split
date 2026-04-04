use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::MarkSettled;

/// Zeros ledger balances and marks settled. Call after [MagicBlock Private Payments](https://www.magicblock.xyz/blog/private-payments-api) complete.
pub fn handler(ctx: Context<MarkSettled>) -> Result<()> {
    let group = &ctx.accounts.group;
    let ledger = &mut ctx.accounts.ledger;
    require!(!ledger.is_settled, ErrorCode::AlreadySettled);

    let auth = ctx.accounts.authority.key();
    require!(group.members.contains(&auth), ErrorCode::NotMember);

    for b in &mut ledger.member_balances {
        *b = 0;
    }
    ledger.is_settled = true;
    Ok(())
}
