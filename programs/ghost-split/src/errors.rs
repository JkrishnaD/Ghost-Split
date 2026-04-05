use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Group is full (max 10 members)")]
    GroupFull,
    #[msg("Not a group member")]
    NotMember,
    #[msg("Group already settled")]
    AlreadySettled,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Already a member")]
    AlreadyMember,
    #[msg("Expense description too long")]
    ExpenseDescTooLong,
    #[msg("Invalid split: must include at least one member")]
    EmptySplit,
    #[msg("Split member is not in the group")]
    SplitNotMember,
    #[msg("Too many people in split")]
    SplitTooMany,
    #[msg("Payer is not a group member")]
    PayerNotMember,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Ledger does not match this group")]
    LedgerMismatch,
    #[msg("Group ledger is already delegated to the ER; call finalize_undelegate first")]
    AlreadyDelegated,
    #[msg("Group ledger is not currently delegated")]
    NotDelegated,
    #[msg("Only the expense payer can remove this expense")]
    NotExpensePayer,
}
