use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::RemoveExpense;

pub fn handler(ctx: Context<RemoveExpense>) -> Result<()> {
    let group = &ctx.accounts.group;
    let ledger = &mut ctx.accounts.ledger;
    let expense = &ctx.accounts.expense;

    require!(!group.is_delegated, ErrorCode::AlreadyDelegated);
    require!(!ledger.is_settled, ErrorCode::AlreadySettled);

    // Reverse the balance changes made by add_expense
    let paid_by = expense.paid_by;
    let idx_paid = group
        .members
        .iter()
        .position(|m| *m == paid_by)
        .ok_or(ErrorCode::PayerNotMember)?;

    let n = expense.split_between.len() as u64;
    let amount = expense.amount;
    let base = amount / n;
    let rem = (amount % n) as usize;

    // Undo the credit to the payer
    let amount_signed = i64::try_from(amount).map_err(|_| ErrorCode::Overflow)?;
    ledger.member_balances[idx_paid] = ledger.member_balances[idx_paid]
        .checked_sub(amount_signed)
        .ok_or(ErrorCode::Overflow)?;

    // Undo the debit from each split member
    for (i, pk) in expense.split_between.iter().enumerate() {
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
            .checked_add(share_signed)
            .ok_or(ErrorCode::Overflow)?;
    }

    // Anchor's `close = expense_payer` returns the rent lamports.
    Ok(())
}
