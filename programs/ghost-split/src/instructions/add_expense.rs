use anchor_lang::prelude::*;

use crate::constants::{MAX_EXPENSE_DESC_LEN, MAX_MEMBERS};
use crate::errors::ErrorCode;
use crate::AddExpense;

pub fn handler(
    ctx: Context<AddExpense>,
    description: String,
    amount: u64,
    split_between: Vec<Pubkey>,
) -> Result<()> {
    require!(
        description.len() <= MAX_EXPENSE_DESC_LEN,
        ErrorCode::ExpenseDescTooLong
    );
    require!(!split_between.is_empty(), ErrorCode::EmptySplit);
    require!(split_between.len() <= MAX_MEMBERS, ErrorCode::SplitTooMany);

    let group = &ctx.accounts.group;
    let ledger = &mut ctx.accounts.ledger;
    require!(!ledger.is_settled, ErrorCode::AlreadySettled);

    let paid_by = ctx.accounts.payer.key();
    require!(group.members.contains(&paid_by), ErrorCode::PayerNotMember);

    for pk in &split_between {
        require!(group.members.contains(pk), ErrorCode::SplitNotMember);
    }

    require!(
        ledger.member_balances.len() == group.members.len(),
        ErrorCode::LedgerMismatch
    );

    let idx_paid = group
        .members
        .iter()
        .position(|m| *m == paid_by)
        .ok_or(ErrorCode::PayerNotMember)?;

    let n = split_between.len() as u64;
    let base = amount / n;
    let rem = (amount % n) as usize;

    let amount_signed = i64::try_from(amount).map_err(|_| ErrorCode::Overflow)?;
    ledger.member_balances[idx_paid] = ledger.member_balances[idx_paid]
        .checked_add(amount_signed)
        .ok_or(ErrorCode::Overflow)?;

    for (i, pk) in split_between.iter().enumerate() {
        let idx = group
            .members
            .iter()
            .position(|m| m == pk)
            .ok_or(ErrorCode::SplitNotMember)?;
        let mut share = base;
        if i < rem {
            share = share.checked_add(1).ok_or(ErrorCode::Overflow)?;
        }
        let share_signed = i64::try_from(share).map_err(|_| ErrorCode::Overflow)?;
        ledger.member_balances[idx] = ledger.member_balances[idx]
            .checked_sub(share_signed)
            .ok_or(ErrorCode::Overflow)?;
    }

    let index = ledger.expense_count;
    let exp = &mut ctx.accounts.expense;
    exp.group = group.key();
    exp.paid_by = paid_by;
    exp.description = description;
    exp.amount = amount;
    exp.split_between = split_between;
    exp.created_at = Clock::get()?.unix_timestamp;
    exp.index = index;

    ledger.expense_count = ledger
        .expense_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    Ok(())
}
