use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::CloseGroup;

pub fn handler(ctx: Context<CloseGroup>) -> Result<()> {
    require!(
        !ctx.accounts.group.is_delegated,
        ErrorCode::AlreadyDelegated
    );
    // Anchor's `close = creator` on both accounts handles the lamport transfer.
    Ok(())
}
