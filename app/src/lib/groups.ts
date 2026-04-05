export interface StoredGroup {
  pda: string;
  name: string;
  currency: string;
  createdAt: number;
}

const STORAGE_KEY = "ghostsplit_groups";

export function loadGroups(): StoredGroup[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveGroup(group: StoredGroup) {
  const groups = loadGroups();
  if (!groups.find((g) => g.pda === group.pda)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([group, ...groups]));
  }
}

export function removeGroup(pda: string) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(loadGroups().filter((g) => g.pda !== pda))
  );
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

// Greedy debt simplification — minimize number of transfers
export function computeSettlementRoutes(
  members: string[],
  balances: number[]
): Transfer[] {
  const creditors = balances
    .map((b, i) => ({ idx: i, amount: b }))
    .filter((x) => x.amount > 0);
  const debtors = balances
    .map((b, i) => ({ idx: i, amount: -b }))
    .filter((x) => x.amount > 0);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    transfers.push({ from: members[d.idx], to: members[c.idx], amount });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) ci++;
    if (d.amount === 0) di++;
  }

  return transfers;
}

export function formatUnits(amount: number, currency: string): string {
  if (currency === "SOL") return `${(amount / 1e9).toFixed(4)} SOL`;
  return `${(amount / 1e6).toFixed(2)} USDC`;
}

export function shortenKey(pk: string): string {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function toBaseUnits(value: string, currency: string): number {
  const n = parseFloat(value);
  if (isNaN(n)) return 0;
  return Math.floor(currency === "SOL" ? n * 1e9 : n * 1e6);
}
