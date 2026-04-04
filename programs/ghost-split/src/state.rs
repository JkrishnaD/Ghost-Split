use anchor_lang::prelude::*;

use crate::constants::{MAX_DESC_LEN, MAX_EXPENSE_DESC_LEN, MAX_MEMBERS, MAX_NAME_LEN};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Currency {
    Sol,
    Usdc,
}

#[account]
#[derive(InitSpace)]
pub struct Group {
    pub creator: Pubkey,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    #[max_len(MAX_DESC_LEN)]
    pub description: String,
    #[max_len(MAX_MEMBERS)]
    pub members: Vec<Pubkey>,
    pub currency: Currency,
    pub created_at: i64,
    /// True while GroupLedger is on the ER. Route add_expense / mark_settled
    /// to the ER RPC when set. join_group is blocked to prevent sync issues.
    pub is_delegated: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GroupLedger {
    pub group: Pubkey,
    #[max_len(MAX_MEMBERS)]
    pub member_balances: Vec<i64>,
    pub expense_count: u32,
    pub is_settled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Expense {
    pub group: Pubkey,
    pub paid_by: Pubkey,
    #[max_len(MAX_EXPENSE_DESC_LEN)]
    pub description: String,
    pub amount: u64,
    #[max_len(MAX_MEMBERS)]
    pub split_between: Vec<Pubkey>,
    pub created_at: i64,
    pub index: u32,
}
