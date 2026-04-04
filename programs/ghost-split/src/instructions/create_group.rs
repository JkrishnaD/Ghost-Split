use anchor_lang::prelude::*;

use crate::constants::{MAX_DESC_LEN, MAX_NAME_LEN};
use crate::errors::ErrorCode;
use crate::state::Currency;
use crate::CreateGroup;

pub fn handler(
    ctx: Context<CreateGroup>,
    _group_id: u64,
    name: String,
    description: String,
    currency: Currency,
) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);
    require!(
        description.len() <= MAX_DESC_LEN,
        ErrorCode::DescriptionTooLong
    );

    let group = &mut ctx.accounts.group;
    let creator_key = ctx.accounts.creator.key();
    let clock = Clock::get()?;

    group.creator = creator_key;
    group.name = name;
    group.description = description;
    group.members = vec![creator_key];
    group.currency = currency;
    group.created_at = clock.unix_timestamp;
    group.is_delegated = false;
    group.bump = ctx.bumps.group;

    let ledger = &mut ctx.accounts.ledger;
    ledger.group = group.key();
    ledger.member_balances = vec![0i64];
    ledger.expense_count = 0;
    ledger.is_settled = false;
    ledger.bump = ctx.bumps.ledger;

    Ok(())
}
