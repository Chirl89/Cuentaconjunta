"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useUserNames } from "./UserNamesContext";
import { useOptionalAuth } from "./AuthContext";
import {
  subscribeHouseholdRoom,
  broadcastHouseholdSync,
} from "@/lib/sync/householdSync";
import {
  pushStateToCloud,
  fetchStateFromCloud,
  subscribeHouseholdDbChanges,
} from "@/lib/sync/cloudDbSync";

const STORAGE_KEY_TRANSACTIONS = "cuentaconjunta_transactions_v2";
const STORAGE_KEY_ACCOUNTS = "cuentaconjunta_accounts_v1";
const STORAGE_KEY_SETTLEMENTS = "cuentaconjunta_settlements_v1";

export type SplitType = "50/50" | "memberA" | "memberB" | "ignored";
export type PayerType = "memberA" | "memberB" | "joint";

export interface CategoryInfo {
  name: string;
  color: string;
  isSystem?: boolean;
}

export const CATEGORY_COLOR_PALETTE: string[] = [
  "#00D09C", // 1. Verde Menta (Brand)
  "#0EA5E9", // 2. Azul Cielo
  "#3B82F6", // 3. Azul Eléctrico
  "#6366F1", // 4. Índigo
  "#8B5CF6", // 5. Violeta
  "#A855F7", // 6. Púrpura
  "#D946EF", // 7. Fucsia
  "#EC4899", // 8. Rosa
  "#F43F5E", // 9. Rosa Coral
  "#EF4444", // 10. Rojo
  "#F97316", // 11. Naranja
  "#F59E0B", // 12. Ámbar
  "#EAB308", // 13. Amarillo Oro
  "#84CC16", // 14. Lima
  "#10B981", // 15. Esmeralda
  "#14B8A6", // 16. Teal / Turquesa
  "#06B6D4", // 17. Cian
  "#64748B", // 18. Pizarra
  "#78716C", // 19. Piedra Cálida
  "#059669", // 20. Verde Bosque
];

export type CategoryFrequencyGroup = "frequent" | "less_frequent" | "rare";

/**
 * Groups categories by frequency:
 * - 'frequent': used in referenceMonth or the previous month (last 2 months)
 * - 'less_frequent': used in month -2 (within the last 3 months, 1 month more)
 * - 'rare': not used in the last 3 months (> 3 months or never used)
 */
export function getCategoryFrequencyGroup(
  categoryName: string,
  transactions: Transaction[],
  referenceMonth: string = "2026-09"
): CategoryFrequencyGroup {
  const [refYear, refMonth] = referenceMonth.split("-").map(Number);
  
  // Mes 1 atrás (el mes anterior)
  let prev1Year = refYear;
  let prev1Month = refMonth - 1;
  if (prev1Month === 0) {
    prev1Month = 12;
    prev1Year -= 1;
  }
  const prev1MonthKey = `${prev1Year}-${String(prev1Month).padStart(2, "0")}`;

  // Mes 2 atrás (hace 3 meses)
  let prev2Year = prev1Year;
  let prev2Month = prev1Month - 1;
  if (prev2Month === 0) {
    prev2Month = 12;
    prev2Year -= 1;
  }
  const prev2MonthKey = `${prev2Year}-${String(prev2Month).padStart(2, "0")}`;

  const catTxs = transactions.filter((t) => t.category === categoryName && t.amount > 0);

  const isFrequent = catTxs.some(
    (t) => t.monthKey === referenceMonth || t.monthKey === prev1MonthKey
  );
  if (isFrequent) {
    return "frequent";
  }

  const isLessFrequent = catTxs.some((t) => t.monthKey === prev2MonthKey);
  if (isLessFrequent) {
    return "less_frequent";
  }

  return "rare";
}

export const CATEGORIES_LIST: CategoryInfo[] = [
  { name: "Supermercado", color: "#00D09C", isSystem: true },
  { name: "Hogar & Luz", color: "#0EA5E9", isSystem: true },
  { name: "Restaurantes & Ocio", color: "#F59E0B", isSystem: true },
  { name: "Transporte & Gasolina", color: "#6366F1", isSystem: true },
  { name: "Otros Gastos Comunes", color: "#EC4899", isSystem: true },
  { name: "Ingreso / Nómina", color: "#10B981", isSystem: true },
  { name: "Aportación Conjunta", color: "#059669", isSystem: true },
  { name: "Liquidación / Neteo", color: "#8B5CF6", isSystem: true },
];

export interface CategoryUsageStatus {
  isUnused: boolean;
  unusedText: string | null;
  lastUsedDate?: string;
  lastUsedMonthKey?: string;
}

/**
 * Checks if a category has been used in the reference month or the previous month.
 * If not used in either, calculates and returns "No usado en xx tiempo".
 */
export function calculateCategoryUsage(
  categoryName: string,
  transactions: Transaction[],
  referenceMonth: string = "2026-09"
): CategoryUsageStatus {
  const [refYear, refMonth] = referenceMonth.split("-").map(Number);
  let prevYear = refYear;
  let prevMonth = refMonth - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const catTxs = transactions.filter((t) => t.category === categoryName);

  const hasRecentTx = catTxs.some(
    (t) => t.monthKey === referenceMonth || t.monthKey === prevMonthKey
  );

  if (hasRecentTx) {
    return {
      isUnused: false,
      unusedText: null,
    };
  }

  if (catTxs.length === 0) {
    return {
      isUnused: true,
      unusedText: "No usado en > 2 meses",
    };
  }

  const sorted = [...catTxs].sort((a, b) => {
    if (a.monthKey !== b.monthKey) {
      return b.monthKey.localeCompare(a.monthKey);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const mostRecent = sorted[0];
  const [mostRecentYear, mostRecentMonth] = mostRecent.monthKey.split("-").map(Number);
  const diffMonths = (refYear - mostRecentYear) * 12 + (refMonth - mostRecentMonth);

  if (diffMonths >= 12) {
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    if (remMonths === 0) {
      return {
        isUnused: true,
        unusedText: `No usado en ${years === 1 ? "1 año" : `${years} años`}`,
        lastUsedDate: mostRecent.date,
        lastUsedMonthKey: mostRecent.monthKey,
      };
    }
    return {
      isUnused: true,
      unusedText: `No usado en ${years === 1 ? "1 año" : `${years} años`} y ${remMonths} ${remMonths === 1 ? "mes" : "meses"}`,
      lastUsedDate: mostRecent.date,
      lastUsedMonthKey: mostRecent.monthKey,
    };
  }

  const monthsText = diffMonths <= 1 ? "2 meses" : `${diffMonths} meses`;
  return {
    isUnused: true,
    unusedText: `No usado en ${monthsText}`,
    lastUsedDate: mostRecent.date,
    lastUsedMonthKey: mostRecent.monthKey,
  };
}

export interface MonthSpending {
  monthKey: string;
  label: string;
  amount: number;
  count: number;
}

/**
 * Calculates monthly spending breakdown for a category for up to numMonths (default 12)
 * backwards from referenceMonth.
 */
export function getCategoryMonthlyHistory(
  categoryName: string,
  transactions: Transaction[],
  referenceMonth: string = "2026-09",
  numMonths: number = 12
): MonthSpending[] {
  const [refYear, refMonth] = referenceMonth.split("-").map(Number);
  const history: MonthSpending[] = [];

  const MONTH_NAMES = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  for (let i = 0; i < numMonths; i++) {
    let year = refYear;
    let month = refMonth - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthName = MONTH_NAMES[month - 1];

    let label = `${monthName} ${year}`;
    if (i === 0) {
      label = `Este mes (${monthName} ${year})`;
    } else if (i === 1) {
      label = `El mes pasado (${monthName} ${year})`;
    } else {
      label = `${monthName} ${year}`;
    }

    const monthTxs = transactions.filter(
      (t) => t.category === categoryName && t.monthKey === monthKey
    );
    const amount = monthTxs.reduce((sum, t) => sum + t.amount, 0);

    history.push({
      monthKey,
      label,
      amount: Math.round(amount * 100) / 100,
      count: monthTxs.length,
    });
  }

  return history;
}

export interface Transaction {
  id: string;
  merchant: string;
  date: string;
  monthKey: string; // "2026-09" | "2026-08"
  amount: number;
  category: string;
  categoryColor: string;
  accountLabel: string;
  status: "pending" | "classified";
  payer: PayerType;
  split: SplitType;
  isManual?: boolean;
  movementType?: "expense" | "transfer_to_joint" | "settlement";
  createdAt?: number;
  bankMovementId?: string;
  currency?: string;
  isCredit?: boolean;
}

export interface DebtMovementItem {
  id: string;
  isCarryOver?: boolean;
  isSettlement?: boolean;
  merchant: string;
  date: string;
  category: string;
  categoryColor: string;
  accountLabel: string;
  ticketAmount: number;
  payer: PayerType;
  split: SplitType;
  typeLabel: string;
  debtImpact: number;
  beneficiary: "memberA" | "memberB";
  isManual?: boolean;
  rawTransaction?: Transaction;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  ibanMask: string;
  ownership: "JOINT" | "USER_A" | "USER_B";
  balance: number;
  connectionId?: string;
  institutionId?: string;
  connectedAt?: string;
  expiresAt?: string;
  status?: "active" | "expired" | "error";
}

// Crisp, round numbers for easy mental math
const isTestEnv =
  typeof process !== "undefined" &&
  (Boolean(process.env.VITEST) || process.env.NODE_ENV === "test");

/**
 * Resolves a comparable numerical timestamp from any transaction (bank or manual),
 * ensuring strictly newest-to-oldest chronological ordering.
 */
export function getTransactionSortTimestamp(t: {
  date?: string;
  monthKey?: string;
  id?: string;
  createdAt?: number;
  bankMovementId?: string;
}): number {
  const idStr = `${t.bankMovementId || ""} ${t.id || ""}`;
  const isoMatch = idStr.match(/(\d{4})-(\d{2})-(\d{2})(?:\.(\d+))?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const subIndex = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    return new Date(y, m, d, 12, 0, 0).getTime() + subIndex * 1000;
  }

  let year = 2026;
  let month = 9;
  if (t.monthKey && t.monthKey.includes("-")) {
    const parts = t.monthKey.split("-");
    year = parseInt(parts[0], 10) || 2026;
    month = parseInt(parts[1], 10) || 9;
  }

  let day = 1;
  let hour = 12;
  let minute = 0;

  if (t.date) {
    const slashMatch = t.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      day = parseInt(slashMatch[1], 10);
      month = parseInt(slashMatch[2], 10);
      year = parseInt(slashMatch[3], 10);
    } else {
      const dayMonthMatch = t.date.match(/(\d{1,2})\s+([A-Za-z]{3})/i);
      if (dayMonthMatch) {
        day = parseInt(dayMonthMatch[1], 10);
        const MONTHS_MAP: Record<string, number> = {
          ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
          jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
        };
        const key = dayMonthMatch[2].toLowerCase().substring(0, 3);
        if (MONTHS_MAP[key]) {
          month = MONTHS_MAP[key];
        }
      }
      const timeMatch = t.date.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = parseInt(timeMatch[2], 10);
      }
    }
  }

  if (t.createdAt && t.createdAt > 1000000000000) {
    return t.createdAt;
  }

  return new Date(year, month - 1, day, hour, minute).getTime();
}

export function isFictionalTransaction(t: any): boolean {
  if (!t) return true;
  if (typeof t.id === "string" && t.id.startsWith("tx-")) return true;
  if (typeof t.id === "string" && t.id.startsWith("eb_bk_")) return true;
  if (typeof t.bankMovementId === "string" && t.bankMovementId.startsWith("bk_tx_")) return true;
  const m = (t.merchant || "").toLowerCase();
  if (m.includes("mercadona gran vía")) return true;
  if (m.includes("iberdrola electricidad")) return true;
  if (m.includes("la tagliatella")) return true;
  if (m.includes("repsol gasolina")) return true;
  if (m.includes("farmacia central")) return true;
  if (m.includes("mercadona madrid")) return true;
  if (m.includes("recibo iberdrola electricidad")) return true;
  if (m.includes("gasolinera repsol m-30")) return true;
  if (m.includes("restaurante el corte ingles")) return true;
  if (m.includes("transferencia nomina empresa")) return true;
  return false;
}

// Test suite fixtures (only populated in Vitest test runner)
const TEST_TRANSACTIONS: Transaction[] = [
  // Septiembre 2026
  {
    id: "tx-1",
    merchant: "Mercadona Gran Vía",
    date: "14 Sep, 11:42",
    monthKey: "2026-09",
    amount: 50.0,
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "Santander Débito",
    status: "pending",
    payer: "memberA",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-2",
    merchant: "Iberdrola Electricidad",
    date: "13 Sep, 09:15",
    monthKey: "2026-09",
    amount: 30.0,
    category: "Hogar & Luz",
    categoryColor: "#0EA5E9",
    accountLabel: "CaixaBank Débito",
    status: "pending",
    payer: "memberB",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-3",
    merchant: "Restaurante La Tagliatella",
    date: "12 Sep, 21:30",
    monthKey: "2026-09",
    amount: 40.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-4",
    merchant: "Repsol Gasolina",
    date: "10 Sep, 18:20",
    monthKey: "2026-09",
    amount: 60.0,
    category: "Transporte & Gasolina",
    categoryColor: "#6366F1",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-5",
    merchant: "Farmacia Central",
    date: "08 Sep, 12:10",
    monthKey: "2026-09",
    amount: 20.0,
    category: "Otros Gastos Comunes",
    categoryColor: "#EC4899",
    accountLabel: "CaixaBank Débito",
    status: "classified",
    payer: "memberB",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-6",
    merchant: "Zara Moda Hombre",
    date: "06 Sep, 17:30",
    monthKey: "2026-09",
    amount: 50.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "memberA",
    isManual: false,
  },
  {
    id: "tx-7",
    merchant: "Sephora Cosméticos",
    date: "04 Sep, 14:15",
    monthKey: "2026-09",
    amount: 30.0,
    category: "Otros Gastos Comunes",
    categoryColor: "#EC4899",
    accountLabel: "CaixaBank Débito",
    status: "classified",
    payer: "memberB",
    split: "memberB",
    isManual: false,
  },
  {
    id: "tx-8",
    merchant: "Lidl Supermercados",
    date: "28 Ago, 10:15",
    monthKey: "2026-08",
    amount: 80.0,
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "CaixaBank Débito",
    status: "classified",
    payer: "memberB",
    split: "50/50",
    isManual: false,
  },
  {
    id: "tx-9",
    merchant: "Cine Yelmo",
    date: "24 Ago, 20:00",
    monthKey: "2026-08",
    amount: 20.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
    isManual: false,
  },
];

// Production starts clean with 0 mock transactions; automated bank worker ingests live data
const INITIAL_TRANSACTIONS: Transaction[] = isTestEnv ? TEST_TRANSACTIONS : [];

export const INITIAL_ACCOUNTS: BankAccount[] = isTestEnv
  ? [
      {
        id: "acc-1",
        bankName: "BBVA",
        accountName: "Cuenta Corriente Compartida",
        ibanMask: "ES76 0182 •••• 8491",
        ownership: "JOINT",
        balance: 2400.0,
      },
      {
        id: "acc-2",
        bankName: "Santander",
        accountName: "Cuenta Personal & Tarjeta",
        ibanMask: "ES44 0049 •••• 2104",
        ownership: "USER_A",
        balance: 1350.0,
      },
      {
        id: "acc-3",
        bankName: "CaixaBank",
        accountName: "Cuenta Personal & Tarjeta",
        ibanMask: "ES91 2100 •••• 7731",
        ownership: "USER_B",
        balance: 1100.0,
      },
    ]
  : [
      {
        id: "acc_bankinter",
        bankName: "Bankinter",
        accountName: "Cuenta Bankinter",
        ibanMask: "ES93 0128 •••• 0803",
        ownership: "USER_A",
        balance: 12546.57,
        institutionId: "bankinter",
        status: "active",
      },
    ];

export const AVAILABLE_MONTHS = [
  { key: "2026-09", label: "Septiembre 2026" },
  { key: "2026-08", label: "Agosto 2026" },
  { key: "2026-07", label: "Julio 2026" },
  { key: "2026-06", label: "Junio 2026" },
];

interface TransactionsContextType {
  transactions: Transaction[];
  accounts: BankAccount[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  addTransaction: (tx: {
    merchant: string;
    amount: number;
    category: string;
    payer: PayerType;
    split: SplitType;
    movementType?: "expense" | "transfer_to_joint";
  }) => void;
  updateTransaction: (
    id: string,
    tx: {
      merchant: string;
      amount: number;
      category: string;
      payer: PayerType;
      split: SplitType;
    }
  ) => void;
  deleteTransaction: (id: string) => void;
  classifyTransaction: (id: string, split: SplitType, payer?: PayerType) => void;
  reclassifyTransaction: (id: string, split: SplitType) => void;
  updateTransactionCategory: (id: string, newCategoryName: string) => void;
  getAccountDisplay: (tx: Transaction) => string;
  filteredTransactions: Transaction[];
  pendingTransactions: Transaction[];
  classifiedTransactions: Transaction[];
  jointClassifiedTransactions: Transaction[];
  memberAClassifiedTransactions: Transaction[];
  memberBClassifiedTransactions: Transaction[];
  totalSpent: number;
  totalJointSpent: number;
  totalMemberASpent: number;
  totalMemberBSpent: number;
  categoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  jointCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberACategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberBCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  balanceData: {
    paidByA: number;
    paidByB: number;
    debtor: "memberA" | "memberB" | "none";
    debtorName: string;
    creditorName: string;
    netDebt: number;
    netDebtToJoint: number;
  };
  debtContributingMovements: DebtMovementItem[];
  settleDebt: (method?: "direct" | "joint") => void;
  resetSettlement: () => void;
  hasActiveSettlement: boolean;
  lastSettlementInfo: {
    date: string;
    amount: number;
    debtorName: string;
    creditorName: string;
    method: "direct" | "joint";
  } | null;
  categories: CategoryInfo[];
  addCategory: (name: string, color?: string) => { success: boolean; error?: string };
  updateCategoryColor: (name: string, newColor: string) => { success: boolean; error?: string };
  deleteCategory: (name: string) => { success: boolean; error?: string };
  getCategoryUsageStatus: (categoryName: string) => CategoryUsageStatus;
  getCategoryMonthlyBreakdown: (categoryName: string) => MonthSpending[];
  allPendingTransactions: Transaction[];
  addConnectedAccounts: (newAccounts: BankAccount[]) => void;
  updateAccountOwnership: (accountId: string, ownership: "JOINT" | "USER_A" | "USER_B") => void;
  updateAccountBalance: (accountId: string, balance: number) => void;
  removeAccount: (accountId: string) => void;
  importBankMovements: (movements: Array<{
    id?: string;
    concept: string;
    amount: number;
    date: string;
    monthKey: string;
    bankName?: string;
    accountLabel?: string;
    ownership?: "JOINT" | "USER_A" | "USER_B";
  }>) => void;
  syncBankFeed: () => Promise<{ success: boolean; total: number; cardCount: number; error?: string }>;
  clearAllTransactions: () => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { memberAName, memberBName } = useUserNames();
  const auth = useOptionalAuth();
  const inviteCode = auth?.household?.inviteCode || "FITDUO";

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cuentaconjunta_transactions_v1");
        const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = isTestEnv ? parsed : parsed.filter((t: any) => !isFictionalTransaction(t));
            return filtered;
          }
        }
      } catch {}
    }
    return INITIAL_TRANSACTIONS;
  });

  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((acc: BankAccount) => {
              if (acc.bankName?.toLowerCase() === "bankinter" && (!acc.balance || acc.balance <= 0)) {
                return { ...acc, balance: 12546.57, ibanMask: acc.ibanMask || "ES93 0128 •••• 0803" };
              }
              return acc;
            });
          }
        }
      } catch {}
    }
    return INITIAL_ACCOUNTS;
  });

  const [settlementCutoffs, setSettlementCutoffs] = useState<{
    [monthKey: string]: {
      timestamp: number;
      amount: number;
      debtorName: string;
      creditorName: string;
      method: "direct" | "joint";
      date: string;
    };
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SETTLEMENTS);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {}
    }
    return {};
  });

  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");
  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cuentaconjunta_categories");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback
      }
    }
    return CATEGORIES_LIST;
  });

  // Explicit client hydration on mount (ensures Next.js static prerender doesn't overwrite saved data)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("cuentaconjunta_transactions_v1");
      const savedTxs = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (savedTxs) {
        const parsed = JSON.parse(savedTxs);
        if (Array.isArray(parsed)) {
          const filtered = isTestEnv ? parsed : parsed.filter((t: any) => !isFictionalTransaction(t));
          const sanitized = filtered.map((t: any) => {
            const m = (t.merchant || "").toLowerCase();
            const isCredit = t.isCredit ?? (m.includes("nfoque") || m.includes("bizum de") || m.includes("transferencia inm"));
            if (isCredit) {
              const targetOwner = t.payer === "memberB" ? "memberB" : "memberA";
              return {
                ...t,
                isCredit: true,
                status: "classified",
                payer: targetOwner,
                split: targetOwner,
                category: t.category === "Otros Gastos Comunes" ? "Ingreso / Nómina" : t.category,
                categoryColor: t.category === "Otros Gastos Comunes" ? "#10B981" : t.categoryColor,
              };
            }
            return t;
          });
          setTransactions(sanitized);
          localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(sanitized));
        }
      }
      const savedAccs = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (savedAccs) {
        const parsed = JSON.parse(savedAccs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (a: any) =>
              !a.bankName.toLowerCase().includes("santander") &&
              !a.id?.startsWith("eb_acc_") &&
              !a.id?.startsWith("mock_")
          );
          setAccounts(cleaned);
          localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(cleaned));
        }
      }
      const savedSettlements = localStorage.getItem(STORAGE_KEY_SETTLEMENTS);
      if (savedSettlements) {
        setSettlementCutoffs(JSON.parse(savedSettlements));
      }

      // Cloud Database Sync: fetch persistent state from Supabase household_state
      fetchStateFromCloud(inviteCode).then((cloud) => {
        if (!cloud) return;
        if (Array.isArray(cloud.transactions) && cloud.transactions.length > 0) {
          setTransactions((prev) => {
            const cloudMap = new Map(cloud.transactions.map((t) => [t.id, t]));
            const localOnly = prev.filter((t) => !cloudMap.has(t.id));
            const merged = [...cloud.transactions, ...localOnly];
            try {
              localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
        if (Array.isArray(cloud.accounts) && cloud.accounts.length > 0) {
          setAccounts((prev) => {
            const cloudAccIds = new Set(cloud.accounts.map((a) => a.id));
            const localOnlyAccs = prev.filter((a) => !cloudAccIds.has(a.id));
            const merged = [...cloud.accounts, ...localOnlyAccs];
            try {
              localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
        if (cloud.settlements && Object.keys(cloud.settlements).length > 0) {
          setSettlementCutoffs(cloud.settlements);
          try {
            localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(cloud.settlements));
          } catch {}
        }
      });
    } catch (e) {
      console.warn("Hydration failed:", e);
    }
  }, [inviteCode]);

  // Automated background bank feed & cloud database synchronization (Unified PSD2 + Supabase household_state)
  const syncBankFeed = useCallback(async (): Promise<{ success: boolean; total: number; cardCount: number; error?: string }> => {
    if (typeof window === "undefined") return { success: false, total: 0, cardCount: 0 };
    try {
      if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))) {
        return { success: true, total: 0, cardCount: 0 };
      }

      // 1. Fetch live Supabase Cloud database state (includes card XLS transactions)
      let cloudTxs: Transaction[] = [];
      let cloudAccs: BankAccount[] = [];
      let cloudSettlements: Record<string, any> = {};

      try {
        const cloud = await fetchStateFromCloud(inviteCode);
        if (cloud) {
          if (Array.isArray(cloud.transactions)) cloudTxs = cloud.transactions;
          if (Array.isArray(cloud.accounts)) cloudAccs = cloud.accounts;
          if (cloud.settlements) cloudSettlements = cloud.settlements;
        }
      } catch (cloudErr) {
        console.warn("Could not fetch cloud state in syncBankFeed:", cloudErr);
      }

      // 2. Fetch local/remote bank feed JSON (Cuenta Nómina PSD2)
      let feedTxs: any[] = [];
      let feedAccs: any[] = [];
      try {
        const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
        const basePath = window.location.pathname.startsWith("/Cuentaconjunta")
          ? "/Cuentaconjunta"
          : "";
        const url = origin ? `${origin}${basePath}/data/bank-feed.json?t=${Date.now()}` : `${basePath}/data/bank-feed.json?t=${Date.now()}`;
        const res = await fetch(url);
        if (res.ok) {
          const feed = await res.json();
          if (Array.isArray(feed?.transactions)) feedTxs = feed.transactions;
          if (Array.isArray(feed?.accounts)) feedAccs = feed.accounts;
        }
      } catch (feedErr) {
        console.warn("Could not fetch local bank feed:", feedErr);
      }

      let totalMergedCount = 0;
      let cardCount = 0;

      // 3. Unified transaction merge: Cloud State + Local State + Bank Feed
      setTransactions((prev) => {
        const cleanPrev = isTestEnv ? prev : prev.filter((t: any) => !isFictionalTransaction(t));
        const txMap = new Map<string, Transaction>();

        // (a) Start with existing clean local transactions
        for (const t of cleanPrev) {
          txMap.set(t.id, t);
        }

        // (b) Overwrite / add Cloud transactions (cross-device source of truth)
        for (const ct of cloudTxs) {
          txMap.set(ct.id, ct);
        }

        // (c) Incorporate Bank Feed transactions
        const existingBankIds = new Set(
          Array.from(txMap.values())
            .filter((t) => t.bankMovementId)
            .map((t) => t.bankMovementId)
        );

        for (const ft of feedTxs) {
          if (!isTestEnv && isFictionalTransaction(ft)) continue;
          if (txMap.has(ft.id) || (ft.bankMovementId && existingBankIds.has(ft.bankMovementId))) {
            continue;
          }
          const isCredit = Boolean(ft.isCredit);
          const targetOwner = ft.payer === "memberB" ? "memberB" : "memberA";
          txMap.set(ft.id, {
            ...ft,
            status: isCredit ? ("classified" as const) : ft.status || "pending",
            payer: isCredit ? targetOwner : ft.payer || "memberA",
            split: isCredit ? targetOwner : ft.split || "50/50",
          });
        }

        const merged = Array.from(txMap.values()).sort(
          (a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)
        );

        totalMergedCount = merged.length;
        cardCount = merged.filter((t) => t.id.startsWith("card_")).length;

        try {
          localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(merged));
        } catch {}

        // Persist merged state back to cloud DB so both devices stay synchronized
        pushStateToCloud(inviteCode, { transactions: merged });

        return merged;
      });

      // 4. Unified account merge
      if (cloudAccs.length > 0 || feedAccs.length > 0) {
        setAccounts((prev) => {
          const accMap = new Map<string, BankAccount>();
          for (const a of prev) accMap.set(a.id, a);
          for (const ca of cloudAccs) accMap.set(ca.id, ca);
          for (const fa of feedAccs) {
            const existing = Array.from(accMap.values()).find(
              (a) => a.id === fa.id || a.bankName.toLowerCase() === fa.bankName?.toLowerCase()
            );
            if (existing) {
              accMap.set(existing.id, { ...existing, balance: fa.balance || existing.balance });
            } else {
              accMap.set(fa.id, fa);
            }
          }
          const mergedAccs = Array.from(accMap.values());
          try {
            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(mergedAccs));
          } catch {}
          pushStateToCloud(inviteCode, { accounts: mergedAccs });
          return mergedAccs;
        });
      }

      // 5. Unified settlements merge
      if (cloudSettlements && Object.keys(cloudSettlements).length > 0) {
        setSettlementCutoffs(cloudSettlements);
        try {
          localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(cloudSettlements));
        } catch {}
      }

      return { success: true, total: totalMergedCount, cardCount };
    } catch (err: any) {
      console.warn("Could not sync bank feed:", err);
      return { success: false, total: 0, cardCount: 0, error: err?.message };
    }
  }, [inviteCode]);

  // Poll feed and cloud state on mount, on month change, on app focus/visibility and background heartbeat
  useEffect(() => {
    const refreshAll = async () => {
      await syncBankFeed();
    };

    refreshAll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshAll);

    // Heartbeat auto-sync every 30s while app is open and visible
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshAll();
      }
    }, 30000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshAll);
      clearInterval(timer);
    };
  }, [syncBankFeed, inviteCode, selectedMonth]);

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, "[]");
        localStorage.removeItem("cuentaconjunta_transactions_v1");
      } catch {}
    }
    broadcastHouseholdSync({
      type: "TRANSACTIONS_SYNC",
      inviteCode,
      transactions: [],
    });
    syncBankFeed();
  }, [inviteCode, syncBankFeed]);

  // Persistent & sync dispatchers
  const persistTransactions = useCallback(
    (newTxs: Transaction[] | ((prev: Transaction[]) => Transaction[]), broadcast = true) => {
      setTransactions((prev) => {
        const updated = typeof newTxs === "function" ? newTxs(prev) : newTxs;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updated));
          } catch {}
        }
        if (broadcast) {
          broadcastHouseholdSync({
            type: "TRANSACTIONS_SYNC",
            inviteCode,
            transactions: updated,
          });
          pushStateToCloud(inviteCode, { transactions: updated });
        }
        return updated;
      });
    },
    [inviteCode]
  );

  const persistAccounts = useCallback(
    (newAccs: BankAccount[] | ((prev: BankAccount[]) => BankAccount[]), broadcast = true) => {
      setAccounts((prev) => {
        const updated = typeof newAccs === "function" ? newAccs(prev) : newAccs;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updated));
          } catch {}
        }
        if (broadcast) {
          broadcastHouseholdSync({
            type: "ACCOUNTS_SYNC",
            inviteCode,
            accounts: updated,
          });
          pushStateToCloud(inviteCode, { accounts: updated });
        }
        return updated;
      });
    },
    [inviteCode]
  );

  const persistSettlements = useCallback(
    (
      newSettlements:
        | Record<string, any>
        | ((prev: Record<string, any>) => Record<string, any>),
      broadcast = true
    ) => {
      setSettlementCutoffs((prev) => {
        const updated =
          typeof newSettlements === "function" ? newSettlements(prev) : newSettlements;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(updated));
          } catch {}
        }
        if (broadcast) {
          broadcastHouseholdSync({
            type: "SETTLEMENTS_SYNC",
            inviteCode,
            settlements: updated,
          });
          pushStateToCloud(inviteCode, { settlements: updated });
        }
        return updated;
      });
    },
    [inviteCode]
  );

  const addConnectedAccounts = useCallback(
    (newAccounts: BankAccount[]) => {
      persistAccounts((prev) => {
        const updated = [...prev];
        for (const na of newAccounts) {
          const idx = updated.findIndex(
            (a) =>
              a.id === na.id ||
              (na.ibanMask && a.ibanMask && na.ibanMask === a.ibanMask) ||
              (na.bankName && a.bankName.toLowerCase() === na.bankName.toLowerCase())
          );
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              ...na,
              id: updated[idx].id,
              ownership: updated[idx].ownership || na.ownership,
            };
          } else {
            updated.push(na);
          }
        }
        return updated;
      });
    },
    [persistAccounts]
  );

  const updateAccountBalance = useCallback(
    (accountId: string, balance: number) => {
      persistAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, balance } : a))
      );
    },
    [persistAccounts]
  );

  const updateAccountOwnership = useCallback(
    (accountId: string, ownership: "JOINT" | "USER_A" | "USER_B") => {
      persistAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, ownership } : a))
      );
    },
    [persistAccounts]
  );

  const removeAccount = useCallback(
    (accountId: string) => {
      persistAccounts((prev) => prev.filter((a) => a.id !== accountId));
    },
    [persistAccounts]
  );

  const importBankMovements = useCallback(
    (
      movements: Array<{
        id?: string;
        concept: string;
        amount: number;
        date: string;
        monthKey: string;
        bankName?: string;
        accountLabel?: string;
        ownership?: "JOINT" | "USER_A" | "USER_B";
      }>
    ) => {
      const newTxs: Transaction[] = movements.map((m, idx) => {
        const payer: PayerType =
          m.ownership === "USER_B"
            ? "memberB"
            : m.ownership === "USER_A"
            ? "memberA"
            : "joint";

        return {
          id: m.id || `bank-stmt-${Date.now()}-${idx}`,
          merchant: m.concept.trim() || "Movimiento Bancario",
          date: m.date,
          monthKey: m.monthKey,
          amount: Math.abs(m.amount),
          category: "Otros Gastos Comunes",
          categoryColor: "#64748B",
          accountLabel: m.accountLabel || m.bankName || "Bankinter",
          status: "pending",
          payer,
          split: "50/50",
          isManual: false,
          movementType: "expense",
          createdAt: Date.now() - idx * 1000,
        };
      });

      persistTransactions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const toAdd = newTxs.filter((t) => !existingIds.has(t.id));
        return [...toAdd, ...prev];
      });
    },
    [persistTransactions]
  );

  // Keep a ref to latest state for responsive sync handshakes
  const latestStateRef = React.useRef({ transactions, accounts, settlementCutoffs });
  useEffect(() => {
    latestStateRef.current = { transactions, accounts, settlementCutoffs };
  }, [transactions, accounts, settlementCutoffs]);

  // Zero-login background sync listener (Supabase Realtime + BroadcastChannel + Storage)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRemoteSync = (msg: any) => {
      if (!msg) return;
      if (msg.type === "TRANSACTIONS_SYNC" && Array.isArray(msg.transactions)) {
        setTransactions(msg.transactions);
        try {
          localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(msg.transactions));
        } catch {}
      } else if (msg.type === "ACCOUNTS_SYNC" && Array.isArray(msg.accounts)) {
        setAccounts(msg.accounts);
        try {
          localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(msg.accounts));
        } catch {}
      } else if (msg.type === "SETTLEMENTS_SYNC" && msg.settlements) {
        setSettlementCutoffs(msg.settlements);
        try {
          localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(msg.settlements));
        } catch {}
      } else if (msg.type === "REQUEST_SYNC") {
        broadcastHouseholdSync({
          type: "TRANSACTIONS_SYNC",
          inviteCode,
          transactions: latestStateRef.current.transactions,
        });
        broadcastHouseholdSync({
          type: "ACCOUNTS_SYNC",
          inviteCode,
          accounts: latestStateRef.current.accounts,
        });
        broadcastHouseholdSync({
          type: "SETTLEMENTS_SYNC",
          inviteCode,
          settlements: latestStateRef.current.settlementCutoffs,
        });
      }
    };

    // 1. Cloud room sync (no user credentials needed)
    const unsubscribeRoom = subscribeHouseholdRoom(inviteCode, handleRemoteSync);

    // 2. Multi-tab sync on same machine
    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("cuentaconjunta_transactions_sync");
      bc.onmessage = (event: MessageEvent) => {
        handleRemoteSync(event.data);
      };
    }

    // 3. Storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_TRANSACTIONS && e.newValue) {
        try {
          setTransactions(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === STORAGE_KEY_ACCOUNTS && e.newValue) {
        try {
          setAccounts(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === STORAGE_KEY_SETTLEMENTS && e.newValue) {
        try {
          setSettlementCutoffs(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Supabase PostgreSQL database change listener (household_state)
    const unsubscribeDb = subscribeHouseholdDbChanges(inviteCode, (cloud) => {
      if (cloud.transactions && Array.isArray(cloud.transactions)) {
        setTransactions((prev) => {
          const cloudMap = new Map(cloud.transactions.map((t) => [t.id, t]));
          const localOnly = prev.filter((t) => !cloudMap.has(t.id));
          const merged = [...cloud.transactions, ...localOnly];
          try {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (cloud.accounts && Array.isArray(cloud.accounts)) {
        setAccounts((prev) => {
          const cloudAccIds = new Set(cloud.accounts.map((a) => a.id));
          const localOnlyAccs = prev.filter((a) => !cloudAccIds.has(a.id));
          const merged = [...cloud.accounts, ...localOnlyAccs];
          try {
            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (cloud.settlements) {
        setSettlementCutoffs(cloud.settlements);
        try {
          localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(cloud.settlements));
        } catch {}
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeDb();
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [inviteCode]);

  const addCategory = (name: string, color?: string): { success: boolean; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: "El nombre del concepto no puede estar vacío" };
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: "Ya existe un concepto con este nombre" };
    }

    const normalizedColor = color ? color.toUpperCase() : null;
    let chosenColor = normalizedColor;

    // Garantizar que NUNCA existan 2 categorías con el mismo color
    if (!chosenColor || categories.some((c) => c.color.toUpperCase() === chosenColor)) {
      const available = CATEGORY_COLOR_PALETTE.find(
        (pal) => !categories.some((c) => c.color.toUpperCase() === pal.toUpperCase())
      );
      chosenColor = available || CATEGORY_COLOR_PALETTE[categories.length % CATEGORY_COLOR_PALETTE.length];
    }

    const newCat: CategoryInfo = { name: trimmed, color: chosenColor, isSystem: false };
    const updated = [...categories, newCat];
    setCategories(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cuentaconjunta_categories", JSON.stringify(updated));
      } catch {}
    }
    return { success: true };
  };

  const updateCategoryColor = (name: string, newColor: string): { success: boolean; error?: string } => {
    const normalized = newColor.toUpperCase();
    const collision = categories.find(
      (c) => c.name !== name && c.color.toUpperCase() === normalized
    );
    if (collision) {
      return {
        success: false,
        error: `Este color ya está en uso por la categoría "${collision.name}"`,
      };
    }

    const updated = categories.map((c) =>
      c.name === name ? { ...c, color: newColor } : c
    );
    setCategories(updated);
    persistTransactions((prev) =>
      prev.map((t) => (t.category === name ? { ...t, categoryColor: newColor } : t))
    );
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cuentaconjunta_categories", JSON.stringify(updated));
      } catch {}
    }
    return { success: true };
  };

  const deleteCategory = (name: string): { success: boolean; error?: string } => {
    const target = categories.find((c) => c.name === name);
    if (!target) return { success: false, error: "El concepto no existe" };
    if (categories.length <= 1) {
      return { success: false, error: "Debe existir al menos un concepto en el sistema" };
    }

    const fallbackCat = categories.find((c) => c.name !== name);
    const fallbackName = fallbackCat ? fallbackCat.name : "Otros Gastos Comunes";
    const fallbackColor = fallbackCat ? fallbackCat.color : "#EC4899";

    // Reasignar de forma transparente las transacciones asociadas a la categoría de respaldo
    persistTransactions((prev) =>
      prev.map((t) =>
        t.category === name
          ? {
              ...t,
              category: fallbackName,
              categoryColor: fallbackColor,
            }
          : t
      )
    );

    const updated = categories.filter((c) => c.name !== name);
    setCategories(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cuentaconjunta_categories", JSON.stringify(updated));
      } catch {}
    }
    return { success: true };
  };

  const getCategoryUsageStatus = (categoryName: string): CategoryUsageStatus => {
    return calculateCategoryUsage(categoryName, transactions, selectedMonth);
  };

  const getCategoryMonthlyBreakdown = (categoryName: string): MonthSpending[] => {
    return getCategoryMonthlyHistory(categoryName, transactions, selectedMonth, 12);
  };

  const addTransaction = (data: {
    merchant: string;
    amount: number;
    category: string;
    payer: PayerType;
    split: SplitType;
    movementType?: "expense" | "transfer_to_joint";
  }) => {
    const isTransfer = data.movementType === "transfer_to_joint";
    const foundCat = categories.find((c) => c.name === data.category) || CATEGORIES_LIST.find((c) => c.name === data.category);
    const color = isTransfer ? "#10B981" : foundCat ? foundCat.color : "#00D09C";

    const accountLabel =
      data.payer === "memberA"
        ? "Santander Débito"
        : data.payer === "memberB"
        ? "CaixaBank Débito"
        : "BBVA Conjunta";

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: data.merchant.trim() || (isTransfer ? "Aportación Cuenta Conjunta" : "Gasto Manual"),
      date: "Hoy, Manual",
      monthKey: selectedMonth,
      amount: Math.abs(data.amount),
      category: isTransfer ? "Aportación Conjunta" : data.category,
      categoryColor: color,
      accountLabel,
      status: "classified",
      payer: data.payer,
      split: isTransfer ? "50/50" : data.split,
      isManual: true,
      movementType: data.movementType || "expense",
      createdAt: Date.now(),
    };

    persistTransactions((prev) => [newTx, ...prev]);

    if (isTransfer) {
      persistAccounts((prev) =>
        prev.map((acc) => {
          if (acc.ownership === "JOINT") {
            return { ...acc, balance: acc.balance + Math.abs(data.amount) };
          }
          if (data.payer === "memberA" && acc.ownership === "USER_A") {
            return { ...acc, balance: acc.balance - Math.abs(data.amount) };
          }
          if (data.payer === "memberB" && acc.ownership === "USER_B") {
            return { ...acc, balance: acc.balance - Math.abs(data.amount) };
          }
          return acc;
        })
      );
    }
  };

  const updateTransaction = (
    id: string,
    data: {
      merchant: string;
      amount: number;
      category: string;
      payer: PayerType;
      split: SplitType;
    }
  ) => {
    persistTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        // Automated bank transactions can NEVER be edited (amount and payer immutable)
        if (!t.isManual) return t;

        const foundCat = categories.find((c) => c.name === data.category) || CATEGORIES_LIST.find((c) => c.name === data.category);
        const color = foundCat ? foundCat.color : "#00D09C";

        const accountLabel =
          data.payer === "memberA"
            ? "Santander Débito"
            : data.payer === "memberB"
            ? "CaixaBank Débito"
            : "BBVA Conjunta";

        return {
          ...t,
          merchant: data.merchant.trim() || "Gasto",
          amount: Math.abs(data.amount),
          category: data.category,
          categoryColor: color,
          accountLabel,
          payer: data.payer,
          split: data.split,
        };
      })
    );
  };

  const deleteTransaction = (id: string) => {
    // Automated bank transactions can NEVER be deleted!
    persistTransactions((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || !target.isManual) {
        return prev;
      }
      return prev.filter((t) => t.id !== id);
    });
  };

  const classifyTransaction = (id: string, split: SplitType, payer?: PayerType) => {
    persistTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "classified",
              split,
              payer: payer || t.payer,
            }
          : t
      )
    );
  };

  const reclassifyTransaction = (id: string, split: SplitType) => {
    persistTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, split, status: "classified" } : t))
    );
  };

  const updateTransactionCategory = (id: string, newCategoryName: string) => {
    const found = categories.find((c) => c.name === newCategoryName) || CATEGORIES_LIST.find((c) => c.name === newCategoryName);
    const color = found ? found.color : "#64748B";

    persistTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              category: newCategoryName,
              categoryColor: color,
            }
          : t
      )
    );
  };

  const getAccountDisplay = (tx: Transaction): string => {
    const raw = (tx.accountLabel || "").trim();
    // Si es un movimiento de tarjeta (compras importadas por XLS o marcadas como Visa)
    if (tx.id.startsWith("card_") || /visa/i.test(raw) || (/tarjeta/i.test(raw) && !/corriente/i.test(raw))) {
      return "Visa Clásica";
    }
    // Si contiene bankinter o IBAN/cuenta bancaria, mostrar únicamente "Bankinter"
    if (/bankinter/i.test(raw) || /es\d{2}/i.test(raw)) {
      return "Bankinter";
    }
    // Eliminar números largos entre paréntesis para cualquier otra entidad
    const cleaned = raw.replace(/\s*\([A-Z0-9\s•*-]{6,}\)/gi, "").trim();
    return cleaned || "Bankinter";
  };

  // Filtered by selected month and strictly sorted newest to oldest
  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.monthKey === selectedMonth)
        .sort((a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)),
    [transactions, selectedMonth]
  );

  const pendingTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.status === "pending" && !t.isCredit),
    [filteredTransactions]
  );

  const allPendingTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "pending" && !t.isCredit)
        .sort((a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)),
    [transactions]
  );

  const classifiedTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.status === "classified"),
    [filteredTransactions]
  );

  // 1. Joint Shared 50/50 expenses (excluding internal fund transfers and credit/incomes)
  const jointClassifiedTransactions = useMemo(
    () =>
      classifiedTransactions.filter(
        (t) => t.split === "50/50" && t.movementType !== "transfer_to_joint" && !t.isCredit
      ),
    [classifiedTransactions]
  );

  // 2. Personal Member A movements (exclusive to A, NOT 50/50 to avoid duplication)
  const memberAClassifiedTransactions = useMemo(
    () => classifiedTransactions.filter((t) => t.split === "memberA"),
    [classifiedTransactions]
  );

  // 3. Personal Member B movements (exclusive to B, NOT 50/50 to avoid duplication)
  const memberBClassifiedTransactions = useMemo(
    () => classifiedTransactions.filter((t) => t.split === "memberB"),
    [classifiedTransactions]
  );

  // Totals
  const totalJointSpent = useMemo(
    () => jointClassifiedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [jointClassifiedTransactions]
  );

  const totalMemberASpent = useMemo(
    () =>
      memberAClassifiedTransactions
        .filter((t) => !t.isCredit)
        .reduce((sum, t) => sum + t.amount, 0),
    [memberAClassifiedTransactions]
  );

  const totalMemberBSpent = useMemo(
    () =>
      memberBClassifiedTransactions
        .filter((t) => !t.isCredit)
        .reduce((sum, t) => sum + t.amount, 0),
    [memberBClassifiedTransactions]
  );

  // Category breakdown builders helper
  const buildCategoryBreakdown = (list: Transaction[]) => {
    const map = new Map<string, { value: number; color: string; count: number }>();
    for (const t of list) {
      if (t.isCredit) continue;
      const existing = map.get(t.category);
      if (existing) {
        existing.value += t.amount;
        existing.count += 1;
      } else {
        map.set(t.category, { value: t.amount, color: t.categoryColor, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      value: Math.round(data.value * 100) / 100,
      color: data.color,
      count: data.count,
    }));
  };

  const jointCategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(jointClassifiedTransactions),
    [jointClassifiedTransactions]
  );

  const memberACategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(memberAClassifiedTransactions),
    [memberAClassifiedTransactions]
  );

  const memberBCategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(memberBClassifiedTransactions),
    [memberBClassifiedTransactions]
  );

  const activeSettlement = settlementCutoffs[selectedMonth] || null;

  const settleDebt = (method: "direct" | "joint" = "direct") => {
    if (balanceData.netDebt <= 0 || balanceData.debtor === "none") return;

    const info = {
      timestamp: Date.now(),
      amount: balanceData.netDebt,
      debtorName: balanceData.debtorName,
      creditorName: balanceData.creditorName,
      method,
      date: "Hoy",
    };

    persistSettlements((prev) => ({
      ...prev,
      [selectedMonth]: info,
    }));
  };

  const resetSettlement = () => {
    persistSettlements((prev) => {
      const next = { ...prev };
      delete next[selectedMonth];
      return next;
    });
  };

  // 1. Calculate previous month carry-over debt
  const prevMonthKey =
    selectedMonth === "2026-09"
      ? "2026-08"
      : selectedMonth === "2026-08"
      ? "2026-07"
      : "";

  const prevMonthLabel =
    selectedMonth === "2026-09"
      ? "Agosto 2026"
      : selectedMonth === "2026-08"
      ? "Julio 2026"
      : "";

  const previousMonthCarryOverItem = useMemo((): DebtMovementItem | null => {
    if (!prevMonthKey || activeSettlement) return null;

    // Look at previous month classified transactions
    const prevTxs = transactions.filter(
      (t) => t.monthKey === prevMonthKey && t.status === "classified"
    );

    let prevA = 0; // Carlos credit
    let prevB = 0; // Andrea credit
    for (const t of prevTxs) {
      if (t.payer === "joint") continue;
      if (t.split === "50/50" || t.movementType === "transfer_to_joint") {
        if (t.payer === "memberA") prevA += t.amount / 2;
        else if (t.payer === "memberB") prevB += t.amount / 2;
      } else if (t.payer === "memberA" && t.split === "memberB") {
        prevA += t.amount;
      } else if (t.payer === "memberB" && t.split === "memberA") {
        prevB += t.amount;
      }
    }

    const prevDiff = prevA - prevB;
    const prevDebt = Math.round(Math.abs(prevDiff) * 100) / 100;
    if (prevDebt <= 0.01) return null;

    const prevDebtor = prevDiff < 0 ? "memberA" : "memberB";
    const beneficiary = prevDebtor === "memberA" ? "memberB" : "memberA";

    return {
      id: `carryover-${prevMonthKey}`,
      isCarryOver: true,
      merchant: `Gasto acumulado mes ${prevMonthLabel}`,
      date: `Cierre ${prevMonthLabel}`,
      category: "Deuda Mes Anterior",
      categoryColor: "#64748B",
      accountLabel: "Mes anterior",
      ticketAmount: prevDebt,
      payer: prevDebtor,
      split: prevDebtor === "memberA" ? "memberB" : "memberA",
      typeLabel: `Deuda mes ${prevMonthLabel}`,
      debtImpact: prevDebt,
      beneficiary,
    };
  }, [transactions, prevMonthKey, prevMonthLabel, activeSettlement]);

  // 2. Compute movements that contribute to current debt:
  // - Excludes joint account expenses (payer === "joint")
  // - Excludes personal expenses where payer === split
  // - If there is an active settlement, only shows movements created AFTER the settlement
  // - If no active settlement, includes previous month carry-over as a single line
  const debtContributingMovements = useMemo((): DebtMovementItem[] => {
    if (activeSettlement) {
      const items: DebtMovementItem[] = [];
      const postSettlementTxs = classifiedTransactions.filter(
        (t) => (t.createdAt ?? 0) > activeSettlement.timestamp
      );

      for (const t of postSettlementTxs) {
        if (t.split === "ignored") continue;
        if (t.payer === "joint") continue;
        if (t.payer === "memberA" && t.split === "memberA") continue;
        if (t.payer === "memberB" && t.split === "memberB") continue;

        if (t.split === "50/50") {
          items.push({
            id: t.id,
            merchant: t.merchant,
            date: t.date,
            category: t.category,
            categoryColor: t.categoryColor,
            accountLabel: t.accountLabel,
            ticketAmount: t.amount,
            payer: t.payer,
            split: t.split,
            typeLabel: t.isCredit ? "Abono 50/50 (-50%)" : "50/50 (50%)",
            debtImpact: t.amount / 2,
            beneficiary: t.isCredit
              ? (t.payer === "memberA" ? "memberB" : "memberA")
              : (t.payer === "memberA" ? "memberA" : "memberB"),
            isManual: t.isManual,
            rawTransaction: t,
          });
        } else if (t.movementType === "transfer_to_joint") {
          items.push({
            id: t.id,
            merchant: t.merchant,
            date: t.date,
            category: t.category,
            categoryColor: t.categoryColor,
            accountLabel: t.accountLabel,
            ticketAmount: t.amount,
            payer: t.payer,
            split: t.split,
            typeLabel: "Aportación Conjunta",
            debtImpact: t.amount / 2,
            beneficiary: t.payer === "memberA" ? "memberA" : "memberB",
            isManual: t.isManual,
            rawTransaction: t,
          });
        } else if (t.payer === "memberA" && t.split === "memberB") {
          items.push({
            id: t.id,
            merchant: t.merchant,
            date: t.date,
            category: t.category,
            categoryColor: t.categoryColor,
            accountLabel: t.accountLabel,
            ticketAmount: t.amount,
            payer: t.payer,
            split: t.split,
            typeLabel: `Para ${memberBName} (100%)`,
            debtImpact: t.amount,
            beneficiary: "memberA",
            isManual: t.isManual,
            rawTransaction: t,
          });
        } else if (t.payer === "memberB" && t.split === "memberA") {
          items.push({
            id: t.id,
            merchant: t.merchant,
            date: t.date,
            category: t.category,
            categoryColor: t.categoryColor,
            accountLabel: t.accountLabel,
            ticketAmount: t.amount,
            payer: t.payer,
            split: t.split,
            typeLabel: `Para ${memberAName} (100%)`,
            debtImpact: t.amount,
            beneficiary: "memberB",
            isManual: t.isManual,
            rawTransaction: t,
          });
        }
      }
      return items;
    }

    const items: DebtMovementItem[] = [];

    // Prepend previous month carry-over if exists
    if (previousMonthCarryOverItem) {
      items.push(previousMonthCarryOverItem);
    }

    for (const t of classifiedTransactions) {
      if (t.split === "ignored") continue;
      if (t.payer === "joint") continue;
      if (t.payer === "memberA" && t.split === "memberA") continue;
      if (t.payer === "memberB" && t.split === "memberB") continue;

      if (t.split === "50/50") {
        items.push({
          id: t.id,
          merchant: t.merchant,
          date: t.date,
          category: t.category,
          categoryColor: t.categoryColor,
          accountLabel: t.accountLabel,
          ticketAmount: t.amount,
          payer: t.payer,
          split: t.split,
          typeLabel: t.isCredit ? "Abono 50/50 (-50%)" : "50/50 (50%)",
          debtImpact: t.amount / 2,
          beneficiary: t.isCredit
            ? (t.payer === "memberA" ? "memberB" : "memberA")
            : (t.payer === "memberA" ? "memberA" : "memberB"),
          isManual: t.isManual,
          rawTransaction: t,
        });
      } else if (t.movementType === "transfer_to_joint") {
        items.push({
          id: t.id,
          merchant: t.merchant,
          date: t.date,
          category: t.category,
          categoryColor: t.categoryColor,
          accountLabel: t.accountLabel,
          ticketAmount: t.amount,
          payer: t.payer,
          split: t.split,
          typeLabel: "Aportación Conjunta",
          debtImpact: t.amount / 2,
          beneficiary: t.payer === "memberA" ? "memberA" : "memberB",
          isManual: t.isManual,
          rawTransaction: t,
        });
      } else if (t.payer === "memberA" && t.split === "memberB") {
        // Carlos paid 100% for Andrea
        items.push({
          id: t.id,
          merchant: t.merchant,
          date: t.date,
          category: t.category,
          categoryColor: t.categoryColor,
          accountLabel: t.accountLabel,
          ticketAmount: t.amount,
          payer: t.payer,
          split: t.split,
          typeLabel: `Para ${memberBName} (100%)`,
          debtImpact: t.amount,
          beneficiary: "memberA",
          isManual: t.isManual,
          rawTransaction: t,
        });
      } else if (t.payer === "memberB" && t.split === "memberA") {
        // Andrea paid 100% for Carlos
        items.push({
          id: t.id,
          merchant: t.merchant,
          date: t.date,
          category: t.category,
          categoryColor: t.categoryColor,
          accountLabel: t.accountLabel,
          ticketAmount: t.amount,
          payer: t.payer,
          split: t.split,
          typeLabel: `Para ${memberAName} (100%)`,
          debtImpact: t.amount,
          beneficiary: "memberB",
          isManual: t.isManual,
          rawTransaction: t,
        });
      }
    }

    return items;
  }, [classifiedTransactions, previousMonthCarryOverItem, activeSettlement, memberAName, memberBName]);

  // 3. Balance & Debt calculation based strictly on debtContributingMovements
  const balanceData = useMemo(() => {
    let impactA = 0; // Carlos credit
    let impactB = 0; // Andrea credit

    for (const item of debtContributingMovements) {
      if (item.beneficiary === "memberA") {
        impactA += item.debtImpact;
      } else if (item.beneficiary === "memberB") {
        impactB += item.debtImpact;
      }
    }

    const diff = impactA - impactB;
    const netDebt = Math.round(Math.abs(diff) * 100) / 100;
    const netDebtToJoint = Math.round(netDebt * 2 * 100) / 100;

    let debtor: "memberA" | "memberB" | "none" = "none";
    let debtorName = "";
    let creditorName = "";

    if (diff > 0.01) {
      debtor = "memberB";
      debtorName = memberBName;
      creditorName = memberAName;
    } else if (diff < -0.01) {
      debtor = "memberA";
      debtorName = memberAName;
      creditorName = memberBName;
    }

    return {
      paidByA: Math.round(impactA * 100) / 100,
      paidByB: Math.round(impactB * 100) / 100,
      debtor,
      debtorName,
      creditorName,
      netDebt,
      netDebtToJoint,
    };
  }, [debtContributingMovements, memberAName, memberBName]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        accounts,
        selectedMonth,
        setSelectedMonth,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        classifyTransaction,
        reclassifyTransaction,
        updateTransactionCategory,
        getAccountDisplay,
        filteredTransactions,
        pendingTransactions,
        classifiedTransactions,
        jointClassifiedTransactions,
        memberAClassifiedTransactions,
        memberBClassifiedTransactions,
        totalSpent: totalJointSpent,
        totalJointSpent,
        totalMemberASpent,
        totalMemberBSpent,
        categoriesBreakdown: jointCategoriesBreakdown,
        jointCategoriesBreakdown,
        memberACategoriesBreakdown,
        memberBCategoriesBreakdown,
        balanceData,
        debtContributingMovements,
        settleDebt,
        resetSettlement,
        hasActiveSettlement: !!activeSettlement,
        lastSettlementInfo: activeSettlement,
        categories,
        addCategory,
        updateCategoryColor,
        deleteCategory,
        getCategoryUsageStatus,
        getCategoryMonthlyBreakdown,
        allPendingTransactions,
        addConnectedAccounts,
        updateAccountOwnership,
        updateAccountBalance,
        removeAccount,
        importBankMovements,
        syncBankFeed,
        clearAllTransactions,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export function useTransactions(): TransactionsContextType {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error("useTransactions must be used within a TransactionsProvider");
  }
  return context;
}
