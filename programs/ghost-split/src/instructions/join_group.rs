use anchor_lang::prelude::*;

use crate::constants::MAX_MEMBERS;
use crate::errors::ErrorCode;
use crate::JoinGroup;

pub fn handler(ctx: Context<JoinGroup>) -> Result<()> {
    let group = &mut ctx.accounts.group;
    let ledger = &mut ctx.accounts.ledger;
    require!(!ledger.is_settled, ErrorCode::AlreadySettled);
    // Blocked during ER session to keep members.len() == member_balances.len().
    require!(!group.is_delegated, ErrorCode::AlreadyDelegated);

    let member_key = ctx.accounts.member.key();
    require!(
        !group.members.contains(&member_key),
        ErrorCode::AlreadyMember
    );
    require!(group.members.len() < MAX_MEMBERS, ErrorCode::GroupFull);

    group.members.push(member_key);
    ledger.member_balances.push(0i64);

    Ok(())
}
