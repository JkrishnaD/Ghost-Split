pub const MAX_NAME_LEN: usize = 32;
pub const MAX_DESC_LEN: usize = 64;
pub const MAX_MEMBERS: usize = 10;
pub const MAX_EXPENSE_DESC_LEN: usize = 64;

pub const GROUP_SEED: &[u8] = b"group";
/// Ephemeral-rollup ledger PDA (delegated for gasless balance / expense updates).
pub const LEDGER_SEED: &[u8] = b"er_ledger";
