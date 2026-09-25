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
import {
  AssignmentRule,
  CategoryLearningItem,
  runCategorizationPipeline,
  recordLearning,
  extractMerchantPattern,
  isMerchantMatch,
  matchesRule,
  resolveRuleAssignment,
  evaluateRules,
  findLearnedCategory,
  isCardBillingStatement,
} from "@/lib/categorization";

export type { AssignmentRule, CategoryLearningItem };

const STORAGE_KEY_TRANSACTIONS = "cuentaconjunta_transactions_v2";
const STORAGE_KEY_ACCOUNTS = "cuentaconjunta_accounts_v1";
const STORAGE_KEY_SETTLEMENTS = "cuentaconjunta_settlements_v1";
const STORAGE_KEY_RULES = "cuentaconjunta_rules_v1";
const STORAGE_KEY_LEARNINGS = "cuentaconjunta_category_learnings_v1";

export const DEFAULT_RULES: AssignmentRule[] = [
  {
    id: "rule-def-0",
    name: "Recibo VISA Clásica (No contabilizar)",
    pattern: "Recibo VISA",
    assignTo: "IGNORED",
    splitRatio: 0,
    categoryName: "Liquidación / Neteo",
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "rule-def-1",
    name: "Iberdrola / Luz Hogar (50/50)",
    pattern: "Iberdrola",
    assignTo: "JOINT",
    splitRatio: 0.5,
    categoryName: "Hogar & Luz",
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "rule-def-2",
    name: "Endesa / Gas & Electricidad (50/50)",
    pattern: "Endesa",
    assignTo: "JOINT",
    splitRatio: 0.5,
    categoryName: "Hogar & Luz",
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "rule-def-3",
    name: "Supermercado Mercadona (50/50)",
    pattern: "Mercadona",
    assignTo: "JOINT",
    splitRatio: 0.5,
    categoryName: "Supermercado",
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

export type SplitType = "50/50" | "memberA" | "memberB" | "ignored";
export type PayerType = "memberA" | "memberB" | "joint";

export interface CategoryInfo {
  name: string;
  color: string;
  isSystem?: boolean;
}

export type Category = CategoryInfo;

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
  status: "pending" | "classified" | "auto_assigned";
  payer: PayerType;
  split: SplitType;
  isManual?: boolean;
  movementType?: "expense" | "transfer_to_joint" | "settlement";
  createdAt?: number;
  bankMovementId?: string;
  currency?: string;
  isCredit?: boolean;
  updatedAt?: number;
  autoAssignedRuleId?: string;
  autoAssignedReason?: string;
  rawConcept?: string;
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

export interface RecognizedMovementItem {
  transaction: Transaction;
  recognizedAmount: number;
  isSharedHalf: boolean;
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

/**
 * Canonical date normalizer ensuring any date format ("15/09/2026", "2026-09-15", "15 Sep", "5/9/2026")
 * is compared strictly in ISO "YYYY-MM-DD" format.
 */
export function normalizeDateToCanonical(dateStr?: string, monthKey?: string): string {
  if (!dateStr) return monthKey ? `${monthKey}-01` : "";
  const trimmed = dateStr.trim();

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashMatch) {
    let year = slashMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }

  // DD Mes (e.g. "15 Sep", "10 Abr", "14 Sep, 11:42")
  const dayMonthMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})/i);
  if (dayMonthMatch) {
    const day = dayMonthMatch[1].padStart(2, "0");
    const MONTHS_MAP: Record<string, string> = {
      ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
      jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
      jan: "01", apr: "04", aug: "08", dec: "12",
    };
    const mKey = dayMonthMatch[2].toLowerCase().substring(0, 3);
    const mStr = MONTHS_MAP[mKey] || "09";
    let yStr = "2026";
    if (monthKey && monthKey.includes("-")) {
      yStr = monthKey.split("-")[0];
    }
    return `${yStr}-${mStr}-${day}`;
  }

  return trimmed;
}

/**
 * Normalizes text concept: removes accents, lowers case, replaces non-alphanumeric chars with spaces,
 * and collapses multiple spaces.
 */
export function normalizeConceptString(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips common bank statement prefixes and suffixes to find the core merchant name
 */
export function stripBankNoisePrefixes(str: string): string {
  let s = str;
  const prefixes = [
    "compra en ", "compra tpv ", "compra ", "pago en ", "pago con tarjeta ", "pago tarjeta ", "pago ",
    "tpv ", "recibo de ", "recibo ", "cargo en cuenta ", "cargo ", "adeudo ",
    "estacion de servicio ", "estacion servicio ", "e s ", "gasolinera "
  ];
  for (const p of prefixes) {
    if (s.startsWith(p)) {
      s = s.slice(p.length).trim();
      break;
    }
  }
  s = s.replace(/\s+(s\s*a|s\s*l|slu|sau)$/i, "").trim();
  s = s.replace(/\s+\d{4,6}$/, "").trim();
  return s;
}

/**
 * Checks if two account labels refer to compatible or matching accounts/cards
 */
export function areAccountsCompatible(labelA?: string, labelB?: string): boolean {
  if (!labelA || !labelB) return true;
  const a = labelA.toLowerCase().trim();
  const b = labelB.toLowerCase().trim();
  if (a === b) return true;

  // Extract last 4 digits if present
  const digitsA = a.match(/\d{4}/)?.[0];
  const digitsB = b.match(/\d{4}/)?.[0];
  if (digitsA && digitsB && digitsA === digitsB) return true;

  // Strip generic words "tarjeta", "cuenta", "visa", "debit", "debito", "credit", "credito"
  const cleanA = a.replace(/tarjeta|cuenta|visa|mastercard|debito|débito|credito|crédito|\s|\(|\)|\*/gi, "");
  const cleanB = b.replace(/tarjeta|cuenta|visa|mastercard|debito|débito|credito|crédito|\s|\(|\)|\*/gi, "");
  if (cleanA && cleanB && (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return true;
  }

  // If both are cards of any kind
  const isCardA = /tarjeta|visa|mastercard|cr[eé]dito|d[eé]bito|card_/i.test(a);
  const isCardB = /tarjeta|visa|mastercard|cr[eé]dito|d[eé]bito|card_/i.test(b);
  if (isCardA && isCardB) return true;

  return false;
}

/**
 * Robust duplicate movement detector:
 * Returns true if an incoming movement matches an existing transaction,
 * REGARDLESS of whether the existing transaction is:
 * - In triage (status === "pending")
 * - Auto-assigned (status === "auto_assigned")
 * - Assigned to ANY section/category (status === "classified")
 * - Assigned to 50/50, Carlos, Andrea, or Ignored
 * - Renamed by the user in the UI (matches against rawConcept or stripped merchant)
 */
export function isSameMovement(
  existing: Transaction,
  incoming: {
    id?: string;
    concept?: string;
    merchant?: string;
    amount: number;
    date: string;
    monthKey: string;
    bankName?: string;
    accountLabel?: string;
    rawConcept?: string;
    bankMovementId?: string;
  }
): boolean {
  // 1. Direct ID match
  if (incoming.id && existing.id === incoming.id) return true;
  if (incoming.id && existing.bankMovementId === incoming.id) return true;
  if (incoming.bankMovementId && existing.bankMovementId === incoming.bankMovementId) return true;

  // 2. Strict Amount Match (within 1 cent)
  const incomingAmount = Math.abs(incoming.amount);
  const existingAmount = Math.abs(existing.amount);
  if (Math.abs(existingAmount - incomingAmount) >= 0.01) {
    return false;
  }

  // 3. Strict Normalized Date Match
  const canonExistingDate = normalizeDateToCanonical(existing.date, existing.monthKey);
  const canonIncomingDate = normalizeDateToCanonical(incoming.date, incoming.monthKey);
  if (canonExistingDate && canonIncomingDate && canonExistingDate !== canonIncomingDate) {
    return false;
  }

  // 4. Account Compatibility Check
  if (!areAccountsCompatible(existing.accountLabel, incoming.accountLabel || incoming.bankName)) {
    return false;
  }

  // 5. Concept / Merchant Match
  const conceptText = incoming.concept || incoming.merchant || "";
  const normIncoming = normalizeConceptString(conceptText);
  const normExisting = normalizeConceptString(existing.merchant);
  const normRawExisting = normalizeConceptString(existing.rawConcept);

  if (normIncoming === normExisting) return true;
  if (normRawExisting && normIncoming === normRawExisting) return true;

  const strippedIncoming = stripBankNoisePrefixes(normIncoming);
  const strippedExisting = stripBankNoisePrefixes(normExisting);
  const strippedRaw = normRawExisting ? stripBankNoisePrefixes(normRawExisting) : "";

  if (strippedIncoming === strippedExisting) return true;
  if (strippedRaw && strippedIncoming === strippedRaw) return true;

  if (strippedIncoming.length >= 4 && strippedExisting.length >= 4) {
    if (strippedIncoming.includes(strippedExisting) || strippedExisting.includes(strippedIncoming)) {
      return true;
    }
  }

  if (strippedRaw && strippedIncoming.length >= 4 && strippedRaw.length >= 4) {
    if (strippedIncoming.includes(strippedRaw) || strippedRaw.includes(strippedIncoming)) {
      return true;
    }
  }

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
  totalMemberASpentWithJoint: number;
  totalMemberBSpentWithJoint: number;
  memberARecognizedMovements: RecognizedMovementItem[];
  memberBRecognizedMovements: RecognizedMovementItem[];
  memberAPersonalMovements: Transaction[];
  memberBPersonalMovements: Transaction[];
  memberAIncomeTransactions: Transaction[];
  memberBIncomeTransactions: Transaction[];
  jointIncomeTransactions: Transaction[];
  householdIncomeTransactions: Transaction[];
  jointMovementsWithIncome: Transaction[];
  householdMovementsWithIncome: Transaction[];
  totalHouseholdSpent: number;
  totalHouseholdIncome: number;
  totalJointIncome: number;
  totalMemberAIncome: number;
  totalMemberBIncome: number;
  categoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  jointCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberAPersonalCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberBPersonalCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberACategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberBCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  householdCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberAHouseholdCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  memberBHouseholdCategoriesBreakdown: { name: string; value: number; color: string; count: number }[];
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
    rawConcept?: string;
    isCredit?: boolean;
  }>) => { added: number; duplicates: number; total: number };
  syncBankFeed: (options?: { forceLiveApi?: boolean }) => Promise<{ success: boolean; total: number; cardCount: number; error?: string }>;
  clearAllTransactions: () => void;
  deleteMovementsByBank: (bankOrKeyword: string) => number;
  // Paso 7: Rules & Continuous Category Learning
  rules: AssignmentRule[];
  learnings: CategoryLearningItem[];
  addRule: (rule: Omit<AssignmentRule, "id" | "createdAt" | "updatedAt">) => void;
  updateRule: (id: string, updates: Partial<AssignmentRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  learnCategory: (merchant: string, categoryName: string) => void;
  confirmAutoAssigned: (id: string) => void;
  confirmAllAutoAssigned: () => void;
  assignAllPendingToCardHolder: () => {
    count: number;
    memberACount: number;
    memberBCount: number;
    jointCount: number;
  };
  autoAssignedTransactions: Transaction[];
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const PURGE_REVOLUT_KEY = "cuentaconjunta_revolut_purged_v0126";
export const PURGE_REVOLUT_TS_KEY = "cuentaconjunta_revolut_purge_timestamp";
export const PURGE_ANDREA_VISACLASICA_KEY = "cuentaconjunta_purged_andrea_visaclasica_v0127";
export const PURGE_ANDREA_VISACLASICA_TS_KEY = "cuentaconjunta_purged_andrea_visaclasica_ts";

export function isRevolutTransaction(t: {
  accountLabel?: string;
  id?: string;
  bankMovementId?: string;
  merchant?: string;
  rawConcept?: string;
  bankName?: string;
}): boolean {
  if (!t) return false;
  const acc = (t.accountLabel || "").toLowerCase();
  const id = (t.id || "").toLowerCase();
  const bId = (t.bankMovementId || "").toLowerCase();
  const bName = ((t as any).bankName || "").toLowerCase();
  const m = (t.merchant || "").toLowerCase();
  const raw = (t.rawConcept || "").toLowerCase();

  return (
    acc.includes("revolut") ||
    id.includes("revolut") ||
    bId.includes("revolut") ||
    bName.includes("revolut") ||
    m.includes("revolut") ||
    raw.includes("revolut")
  );
}

export function shouldPurgeMovement(t: any): boolean {
  if (!t) return false;

  // 1. Any movement of Andrea in general (user: "elimina todos los movimientos de andrea, en general")
  if (
    t.payer === "memberB" ||
    t.split === "memberB" ||
    t.ownership === "USER_B" ||
    (t.accountLabel || "").toLowerCase().includes("andrea")
  ) {
    return true;
  }

  // 2. Any movement of Visa Clásica (user: "siguen apareciendo, pero como visa clásica... la tarjeta se ha asignado como bankinter visa clásica, asignada a carlos")
  const acc = (t.accountLabel || "").toLowerCase();
  const id = (t.id || "").toLowerCase();
  const bId = (t.bankMovementId || "").toLowerCase();
  const m = (t.merchant || "").toLowerCase();
  const raw = (t.rawConcept || "").toLowerCase();

  if (
    acc.includes("clásica") ||
    acc.includes("clasica") ||
    id.includes("clasica") ||
    id.includes("clásica") ||
    bId.includes("clasica") ||
    bId.includes("clásica") ||
    m.includes("visa clasica") ||
    raw.includes("visa clasica")
  ) {
    return true;
  }

  // 3. Any Revolut movement
  if (isRevolutTransaction(t)) {
    return true;
  }

  return false;
}

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
            let filtered = isTestEnv ? parsed : parsed.filter((t: any) => !isFictionalTransaction(t));
            const isPurged = localStorage.getItem(PURGE_ANDREA_VISACLASICA_KEY) === "true";
            if (!isTestEnv && !isPurged) {
              const nowTs = Date.now();
              localStorage.setItem(PURGE_ANDREA_VISACLASICA_KEY, "true");
              localStorage.setItem(PURGE_ANDREA_VISACLASICA_TS_KEY, nowTs.toString());
              filtered = filtered.filter((t: any) => !shouldPurgeMovement(t));
              localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(filtered));
            }
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

  const [rules, setRules] = useState<AssignmentRule[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_RULES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasVisaRule = parsed.some((r: AssignmentRule) =>
              (r.pattern || "").toLowerCase().includes("recibo visa")
            );
            if (!hasVisaRule) {
              return [DEFAULT_RULES[0], ...parsed];
            }
            return parsed;
          }
        }
      } catch {}
    }
    return DEFAULT_RULES;
  });

  const [learnings, setLearnings] = useState<CategoryLearningItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LEARNINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const transactionsRef = React.useRef<Transaction[]>(transactions);
  const accountsRef = React.useRef<BankAccount[]>(accounts);
  const settlementsRef = React.useRef<Record<string, any>>(settlementCutoffs);
  const rulesRef = React.useRef(rules);
  const learningsRef = React.useRef(learnings);
  const categoriesRef = React.useRef(categories);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);
  useEffect(() => {
    settlementsRef.current = settlementCutoffs;
  }, [settlementCutoffs]);
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  useEffect(() => {
    learningsRef.current = learnings;
  }, [learnings]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // Explicit client hydration on mount (ensures Next.js static prerender doesn't overwrite saved data)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("cuentaconjunta_transactions_v1");
      const savedRules = localStorage.getItem(STORAGE_KEY_RULES);
      if (savedRules) {
        try {
          const parsed = JSON.parse(savedRules);
          if (Array.isArray(parsed) && parsed.length > 0) setRules(parsed);
        } catch {}
      }
      const savedLearnings = localStorage.getItem(STORAGE_KEY_LEARNINGS);
      if (savedLearnings) {
        try {
          const parsed = JSON.parse(savedLearnings);
          if (Array.isArray(parsed)) setLearnings(parsed);
        } catch {}
      }
      const savedTxs = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (savedTxs) {
        const parsed = JSON.parse(savedTxs);
        if (Array.isArray(parsed)) {
          const filtered = isTestEnv ? parsed : parsed.filter((t: any) => !isFictionalTransaction(t));
          let toSanitize = filtered;
          const purgeTs = typeof window !== "undefined"
            ? Number(localStorage.getItem(PURGE_ANDREA_VISACLASICA_TS_KEY) || "0")
            : 0;
          const isPurged = typeof window !== "undefined" && localStorage.getItem(PURGE_ANDREA_VISACLASICA_KEY) === "true";

          if (!isTestEnv && typeof window !== "undefined") {
            if (!isPurged || purgeTs === 0) {
              const nowTs = Date.now();
              try {
                localStorage.setItem(PURGE_ANDREA_VISACLASICA_KEY, "true");
                localStorage.setItem(PURGE_ANDREA_VISACLASICA_TS_KEY, nowTs.toString());
              } catch {}
              toSanitize = filtered.filter((t: any) => !shouldPurgeMovement(t));
            } else {
              // Only keep transactions if they were created after the purge timestamp
              toSanitize = filtered.filter((t: any) => {
                if (!shouldPurgeMovement(t)) return true;
                return (t.createdAt || 0) > purgeTs;
              });
            }
          }
          const sanitized = toSanitize.map((t: any) => {
            const m = (t.merchant || "").toLowerCase();
            const raw = (t.rawConcept || "").toLowerCase();
            if (isCardBillingStatement(m) || isCardBillingStatement(raw)) {
              return {
                ...t,
                status: "classified",
                split: "ignored",
                category: "Liquidación / Neteo",
                categoryColor: "#8B5CF6",
              };
            }
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
            if (t.status === "auto_assigned") {
              return {
                ...t,
                status: "pending",
              };
            }
            return t;
          });
          setTransactions(sanitized);
          localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(sanitized));

          // If old transactions were purged, propagate immediately to Supabase
          if (!isTestEnv && toSanitize.length !== filtered.length) {
            pushStateToCloud(inviteCode, { transactions: sanitized }).catch(() => {});
          }
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
          const currentPurgeTs = typeof window !== "undefined"
            ? Number(localStorage.getItem(PURGE_ANDREA_VISACLASICA_TS_KEY) || "0")
            : 0;

          // Strip any purged transactions from cloud created before currentPurgeTs
          const cleanCloudTransactions = cloud.transactions.filter((ct: any) => {
            if (!shouldPurgeMovement(ct)) return true;
            return currentPurgeTs > 0 && (ct.createdAt || 0) > currentPurgeTs;
          });

          const hadPurgedInCloud = cleanCloudTransactions.length !== cloud.transactions.length;

          setTransactions((prev) => {
            const cleanPrev = prev.filter((t: any) => {
              if (!shouldPurgeMovement(t)) return true;
              return currentPurgeTs > 0 && (t.createdAt || 0) > currentPurgeTs;
            });

            const prevMap = new Map(cleanPrev.map((t) => [t.id, t]));
            const cloudMap = new Map<string, Transaction>();
            for (const ct of cleanCloudTransactions) {
              const local = prevMap.get(ct.id);
              if (!local) {
                cloudMap.set(ct.id, ct);
              } else if (local.split === "ignored") {
                cloudMap.set(ct.id, local);
              } else if (local.status === "classified" && ct.status === "pending") {
                cloudMap.set(ct.id, local);
              } else if ((local.updatedAt || 0) >= (ct.updatedAt || 0)) {
                cloudMap.set(ct.id, local);
              } else {
                cloudMap.set(ct.id, ct);
              }
            }
            const localOnly = cleanPrev.filter((t) => !cloudMap.has(t.id));
            const merged = [...Array.from(cloudMap.values()), ...localOnly];
            try {
              localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(merged));
            } catch {}

            if (hadPurgedInCloud) {
              pushStateToCloud(inviteCode, { transactions: merged }).catch(console.warn);
            }

            return merged;
          });
        }
        if (Array.isArray(cloud.accounts) && cloud.accounts.length > 0) {
          setAccounts((prev) => {
            const map = new Map<string, BankAccount>();
            for (const a of prev) map.set(a.id, a);
            for (const ca of cloud.accounts) map.set(ca.id, ca);
            const merged = Array.from(map.values());
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
        if (Array.isArray(cloud.rules) && cloud.rules.length > 0) {
          setRules(cloud.rules);
          try {
            localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(cloud.rules));
          } catch {}
        }
        if (Array.isArray(cloud.category_learnings) && cloud.category_learnings.length > 0) {
          setLearnings(cloud.category_learnings);
          try {
            localStorage.setItem(STORAGE_KEY_LEARNINGS, JSON.stringify(cloud.category_learnings));
          } catch {}
        }
      });
    } catch (e) {
      console.warn("Hydration failed:", e);
    }
  }, [inviteCode]);

  // Automated background bank feed & cloud database synchronization (Unified PSD2 + Supabase household_state)
  const syncBankFeed = useCallback(async (options?: { forceLiveApi?: boolean }): Promise<{ success: boolean; total: number; cardCount: number; error?: string }> => {
    if (typeof window === "undefined") return { success: false, total: 0, cardCount: 0 };
    try {
      if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))) {
        return { success: true, total: 0, cardCount: 0 };
      }

      const isManualTrigger = Boolean(options?.forceLiveApi);

      // 1. Fetch live Supabase Cloud database state (includes card XLS transactions)
      let cloudTxs: Transaction[] = [];
      let cloudAccs: BankAccount[] = [];
      let cloudSettlements: Record<string, any> = {};

      try {
        const cloud = await fetchStateFromCloud(inviteCode);
        if (cloud) {
          const currentPurgeTs = typeof window !== "undefined"
            ? Number(localStorage.getItem(PURGE_ANDREA_VISACLASICA_TS_KEY) || "0")
            : 0;
          if (Array.isArray(cloud.transactions)) {
            cloudTxs = cloud.transactions.filter((ct: any) => {
              if (!shouldPurgeMovement(ct)) return true;
              return currentPurgeTs > 0 && (ct.createdAt || 0) > currentPurgeTs;
            });
          }
          if (Array.isArray(cloud.accounts)) cloudAccs = cloud.accounts;
          if (cloud.settlements) cloudSettlements = cloud.settlements;
        }
      } catch (cloudErr) {
        console.warn("Could not fetch cloud state in syncBankFeed:", cloudErr);
      }

      // 2. Fetch local/remote bank feed JSON or live API sync (Cuenta Nómina PSD2)
      let feedTxs: any[] = [];
      let feedAccs: any[] = [];
      try {
        const origin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
        const basePath = window.location.pathname.startsWith("/Cuentaconjunta")
          ? "/Cuentaconjunta"
          : "";

        // Only call live bank sync API when explicitly triggered on-demand (e.g. by pressing Sync button)
        if (isManualTrigger) {
          try {
            const apiUrl = origin ? `${origin}${basePath}/api/bank/sync` : `${basePath}/api/bank/sync`;
            const apiRes = await fetch(apiUrl, {
              method: "POST",
              signal: AbortSignal.timeout(10000),
            });
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (Array.isArray(apiData?.transactions) && apiData.transactions.length > 0) {
                feedTxs = apiData.transactions;
              }
              if (Array.isArray(apiData?.accounts) && apiData.accounts.length > 0) {
                feedAccs = apiData.accounts;
              }
            }
          } catch {
            // If on static hosting without server API, continue to bank-feed.json
          }
        }

        // Fallback or read from bank-feed.json (cached feed)
        if (feedTxs.length === 0) {
          const url = origin ? `${origin}${basePath}/data/bank-feed.json?t=${Date.now()}` : `${basePath}/data/bank-feed.json?t=${Date.now()}`;
          const res = await fetch(url);
          if (res.ok) {
            const feed = await res.json();
            if (Array.isArray(feed?.transactions)) feedTxs = feed.transactions;
            if (Array.isArray(feed?.accounts)) feedAccs = feed.accounts;
          }
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

        // (b) Smart merge with Cloud transactions (cross-device source of truth)
        for (const ct of cloudTxs) {
          const local = txMap.get(ct.id) || Array.from(txMap.values()).find((l) => isSameMovement(l, ct));
          const targetKey = local ? local.id : ct.id;
          if (!local) {
            txMap.set(ct.id, ct);
          } else if (local.split === "ignored") {
            // Never lose ignored state
            txMap.set(targetKey, local);
          } else if (local.status === "classified" && ct.status === "pending") {
            // Local has already been classified; preserve local classification!
            txMap.set(targetKey, local);
          } else if ((local.updatedAt || 0) > (ct.updatedAt || 0)) {
            // Local has a newer update than cloud; preserve local!
            txMap.set(targetKey, local);
          } else if ((ct.updatedAt || 0) > (local.updatedAt || 0)) {
            // Cloud has a newer update; take cloud!
            txMap.set(targetKey, { ...ct, id: targetKey });
          } else {
            // Equal or missing timestamps: if local is classified, preserve local!
            if (local.status === "classified") {
              txMap.set(targetKey, local);
            } else {
              txMap.set(targetKey, { ...ct, id: targetKey });
            }
          }
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
          if (Array.from(txMap.values()).some((l) => isSameMovement(l, ft))) {
            continue;
          }
          const isCredit = Boolean(ft.isCredit);
          const targetOwner = ft.payer === "memberB" ? "memberB" : "memberA";

          let finalStatus = isCredit ? ("classified" as const) : ft.status || "pending";
          let finalPayer = isCredit ? targetOwner : ft.payer || "memberA";
          let finalSplit = isCredit ? targetOwner : ft.split || "50/50";
          let finalCategory = ft.category;
          let finalColor = ft.categoryColor;
          let autoRuleId: string | undefined = undefined;
          let autoReason: string | undefined = undefined;

          if (!isCredit && finalStatus === "pending") {
            const pipe = runCategorizationPipeline(
              {
                merchant: ft.merchant,
                amount: ft.amount,
                accountLabel: ft.accountLabel,
              },
              rulesRef.current,
              learningsRef.current,
              categoriesRef.current
            );
            if (pipe.status === "auto_assigned") {
              finalStatus = "pending";
              autoRuleId = pipe.matchedRuleId;
              autoReason = pipe.matchedRuleName ? `Regla: ${pipe.matchedRuleName}` : pipe.rationale;
            }
            if (!finalCategory || finalCategory === "Otros Gastos Comunes" || pipe.assignedBy === "user_learning") {
              finalCategory = pipe.category;
              finalColor = pipe.categoryColor;
            }
          }

          txMap.set(ft.id, {
            ...ft,
            status: finalStatus,
            payer: finalPayer,
            split: finalSplit,
            category: finalCategory || ft.category,
            categoryColor: finalColor || ft.categoryColor,
            autoAssignedRuleId: autoRuleId,
            autoAssignedReason: autoReason,
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

      // 4. Unified account sync: Cloud DB + Local Feed
      setAccounts((prev) => {
        const base = cloudAccs.length > 0 ? cloudAccs : prev;
        const map = new Map<string, any>();
        for (const a of base) {
          map.set(a.id, a);
        }
        for (const fa of feedAccs) {
          if (!map.has(fa.id)) {
            map.set(fa.id, fa);
          } else {
            const existing = map.get(fa.id)!;
            map.set(fa.id, { ...existing, balance: fa.balance ?? existing.balance });
          }
        }
        const updated = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

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
      const prev = transactionsRef.current;
      const rawUpdated = typeof newTxs === "function" ? newTxs(prev) : newTxs;
      const updated = rawUpdated.map((t) => {
        if (isCardBillingStatement(t.merchant || t.rawConcept || "") && t.split !== "ignored") {
          return {
            ...t,
            status: "classified" as const,
            split: "ignored" as const,
            category: "Liquidación / Neteo",
            categoryColor: "#8B5CF6",
            updatedAt: Date.now(),
          };
        }
        return t;
      });
      transactionsRef.current = updated;
      setTransactions(updated);

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

        pushStateToCloud(inviteCode, { transactions: updated }).catch((e) => {
          console.warn("Could not push transactions to cloud:", e);
        });
      }
    },
    [inviteCode]
  );

  const persistAccounts = useCallback(
    (newAccs: BankAccount[] | ((prev: BankAccount[]) => BankAccount[]), broadcast = true) => {
      const prev = accountsRef.current;
      const updated = typeof newAccs === "function" ? newAccs(prev) : newAccs;
      accountsRef.current = updated;
      setAccounts(updated);

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

        pushStateToCloud(inviteCode, { accounts: updated }).catch((e) => {
          console.warn("Could not push accounts to cloud:", e);
        });
      }
    },
    [inviteCode]
  );

  const deleteMovementsByBank = useCallback(
    (bankOrKeyword: string): number => {
      let deletedCount = 0;
      const target = bankOrKeyword.toLowerCase().trim();
      if (!target) return 0;

      const isRevolutTarget = target.includes("revolut");
      const isAndreaTarget = target.includes("andrea");
      const isVisaClasicaTarget = target.includes("clasica") || target.includes("clásica");
      const isSpecialPurge = isRevolutTarget || isAndreaTarget || isVisaClasicaTarget;
      const nowTs = Date.now();

      if (isSpecialPurge && typeof window !== "undefined") {
        try {
          localStorage.setItem(PURGE_ANDREA_VISACLASICA_KEY, "true");
          localStorage.setItem(PURGE_ANDREA_VISACLASICA_TS_KEY, nowTs.toString());
        } catch {}
      }

      persistTransactions((prev) => {
        const remaining: Transaction[] = [];
        prev.forEach((t) => {
          const isMatch = isRevolutTarget
            ? isRevolutTransaction(t)
            : isAndreaTarget
            ? (t.payer === "memberB" || t.split === "memberB" || (t as any).ownership === "USER_B" || (t.accountLabel || "").toLowerCase().includes("andrea"))
            : isVisaClasicaTarget
            ? ((t.accountLabel || "").toLowerCase().includes("clasica") || (t.accountLabel || "").toLowerCase().includes("clásica") || (t.id || "").toLowerCase().includes("clasica") || (t.id || "").toLowerCase().includes("clásica"))
            : ((t.accountLabel || "").toLowerCase().includes(target) ||
               (t.id || "").toLowerCase().includes(target) ||
               (t.bankMovementId || "").toLowerCase().includes(target) ||
               ((t as any).bankName || "").toLowerCase().includes(target));
          if (isMatch) {
            deletedCount++;
          } else {
            remaining.push(t);
          }
        });
        return remaining;
      });

      return deletedCount;
    },
    [persistTransactions]
  );

  const persistSettlements = useCallback(
    (
      newSettlements:
        | Record<string, any>
        | ((prev: Record<string, any>) => Record<string, any>),
      broadcast = true
    ) => {
      const prev = settlementsRef.current;
      const updated =
        typeof newSettlements === "function" ? newSettlements(prev) : newSettlements;
      settlementsRef.current = updated;
      setSettlementCutoffs(updated);

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

        pushStateToCloud(inviteCode, { settlements: updated }).catch((e) => {
          console.warn("Could not push settlements to cloud:", e);
        });
      }
    },
    [inviteCode]
  );

  const persistRules = useCallback(
    (newRules: AssignmentRule[] | ((prev: AssignmentRule[]) => AssignmentRule[]), broadcast = true) => {
      const prev = rulesRef.current;
      const updated = typeof newRules === "function" ? newRules(prev) : newRules;
      rulesRef.current = updated;
      setRules(updated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(updated));
        } catch {}
      }

      if (broadcast) {
        broadcastHouseholdSync({
          type: "RULES_SYNC",
          inviteCode,
          rules: updated,
        });

        pushStateToCloud(inviteCode, { rules: updated }).catch((e) => {
          console.warn("Could not push rules to cloud:", e);
        });
      }
    },
    [inviteCode]
  );

  const persistLearnings = useCallback(
    (newLearnings: CategoryLearningItem[] | ((prev: CategoryLearningItem[]) => CategoryLearningItem[]), broadcast = true) => {
      const prev = learningsRef.current;
      const updated = typeof newLearnings === "function" ? newLearnings(prev) : newLearnings;
      learningsRef.current = updated;
      setLearnings(updated);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_LEARNINGS, JSON.stringify(updated));
        } catch {}
      }

      if (broadcast) {
        broadcastHouseholdSync({
          type: "LEARNINGS_SYNC",
          inviteCode,
          learnings: updated,
        });

        pushStateToCloud(inviteCode, { category_learnings: updated }).catch((e) => {
          console.warn("Could not push category_learnings to cloud:", e);
        });
      }
    },
    [inviteCode]
  );

  const addRule = useCallback(
    (ruleData: Omit<AssignmentRule, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newRule: AssignmentRule = {
        ...ruleData,
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      persistRules((prev) => [newRule, ...prev]);

      if (newRule.isActive) {
        persistTransactions((prevTxs) => {
          return prevTxs.map((tx) => {
            if (tx.status === "classified") return tx;
            if (matchesRule(newRule, tx)) {
              const catName = newRule.categoryName || tx.category;
              const foundColor = (categories.find((c) => c.name === catName) || CATEGORIES_LIST.find((c) => c.name === catName))?.color || tx.categoryColor;
              return {
                ...tx,
                status: "pending",
                category: catName,
                categoryColor: foundColor,
                autoAssignedRuleId: newRule.id,
                autoAssignedReason: newRule.name ? `Regla: ${newRule.name}` : `Regla automática "${newRule.pattern}"`,
                updatedAt: Date.now(),
              };
            }
            return tx;
          });
        });
      }
    },
    [persistRules, persistTransactions, categories]
  );

  const updateRule = useCallback(
    (id: string, updates: Partial<AssignmentRule>) => {
      const now = new Date().toISOString();
      let updatedTarget: AssignmentRule | undefined;
      persistRules((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            updatedTarget = { ...r, ...updates, updatedAt: now };
            return updatedTarget;
          }
          return r;
        })
      );

      if (updatedTarget && updatedTarget.isActive) {
        const rule = updatedTarget;
        persistTransactions((prevTxs) =>
          prevTxs.map((tx) => {
            if (tx.status === "classified") return tx;
            if (matchesRule(rule, tx)) {
              const catName = rule.categoryName || tx.category;
              const foundColor = (categories.find((c) => c.name === catName) || CATEGORIES_LIST.find((c) => c.name === catName))?.color || tx.categoryColor;
              return {
                ...tx,
                status: "pending",
                category: catName,
                categoryColor: foundColor,
                autoAssignedRuleId: rule.id,
                autoAssignedReason: rule.name ? `Regla: ${rule.name}` : `Regla automática "${rule.pattern}"`,
                updatedAt: Date.now(),
              };
            }
            return tx;
          })
        );
      }
    },
    [persistRules, persistTransactions, categories]
  );

  const deleteRule = useCallback(
    (id: string) => {
      persistRules((prev) => prev.filter((r) => r.id !== id));
      persistTransactions((prevTxs) =>
        prevTxs.map((tx) =>
          tx.status === "auto_assigned" && tx.autoAssignedRuleId === id
            ? { ...tx, status: "pending", autoAssignedRuleId: undefined, autoAssignedReason: undefined, updatedAt: Date.now() }
            : tx
        )
      );
    },
    [persistRules, persistTransactions]
  );

  const toggleRule = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      let toggledRule: AssignmentRule | undefined;
      let nextActiveState = false;

      persistRules((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            nextActiveState = !r.isActive;
            toggledRule = { ...r, isActive: nextActiveState, updatedAt: now };
            return toggledRule;
          }
          return r;
        })
      );

      persistTransactions((prevTxs) => {
        if (!nextActiveState) {
          return prevTxs.map((tx) =>
            tx.status === "auto_assigned" && tx.autoAssignedRuleId === id
              ? { ...tx, status: "pending", autoAssignedRuleId: undefined, autoAssignedReason: undefined, updatedAt: Date.now() }
              : tx
          );
        } else if (toggledRule) {
          const rule = toggledRule;
          return prevTxs.map((tx) => {
            if (tx.status === "classified") return tx;
            if (matchesRule(rule, tx)) {
              const { payer, split } = resolveRuleAssignment(rule, tx.accountLabel || undefined);
              const catName = rule.categoryName || tx.category;
              const foundColor = (categories.find((c) => c.name === catName) || CATEGORIES_LIST.find((c) => c.name === catName))?.color || tx.categoryColor;
              return {
                ...tx,
                status: "auto_assigned",
                split,
                payer,
                category: catName,
                categoryColor: foundColor,
                autoAssignedRuleId: rule.id,
                autoAssignedReason: rule.name ? `Regla: ${rule.name}` : `Regla automática "${rule.pattern}"`,
                updatedAt: Date.now(),
              };
            }
            return tx;
          });
        }
        return prevTxs;
      });
    },
    [persistRules, persistTransactions, categories]
  );

  const learnCategory = useCallback(
    (merchant: string, categoryName: string) => {
      persistLearnings((prev) => {
        const { updatedLearnings } = recordLearning(merchant, categoryName, prev);
        return updatedLearnings;
      });
    },
    [persistLearnings]
  );

  const addConnectedAccounts = useCallback(
    (newAccounts: BankAccount[]) => {
      persistAccounts((prev) => {
        const updated = [...prev];
        for (const na of newAccounts) {
          const idx = updated.findIndex(
            (a) =>
              a.id === na.id ||
              (Boolean(na.ibanMask) &&
                Boolean(a.ibanMask) &&
                na.ibanMask === a.ibanMask &&
                !na.ibanMask.includes("0000") &&
                na.ibanMask !== "ES00 •••• 0000") ||
              (Boolean(na.bankName) &&
                Boolean(a.bankName) &&
                na.bankName.toLowerCase() === a.bankName.toLowerCase() &&
                Boolean(na.accountName) &&
                Boolean(a.accountName) &&
                na.accountName.toLowerCase().trim() ===
                  a.accountName.toLowerCase().trim())
          );
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              ...na,
              id: updated[idx].id,
              ownership: na.ownership || updated[idx].ownership,
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
      persistAccounts((prev) => {
        const target = prev.find((a) => a.id === accountId);
        if (target && target.bankName && target.balance === 0 && target.bankName.toLowerCase() !== "bankinter") {
          return prev.filter(
            (a) =>
              a.id !== accountId &&
              !(a.bankName.toLowerCase() === target.bankName.toLowerCase() && a.balance === 0)
          );
        }
        return prev.filter((a) => a.id !== accountId);
      });
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
        rawConcept?: string;
        isCredit?: boolean;
      }>
    ): { added: number; duplicates: number; total: number } => {
      let addedCount = 0;
      let duplicatesCount = 0;

      persistTransactions((prev) => {
        const consumedExistingIds = new Set<string>();
        const toAdd: Transaction[] = [];

        movements.forEach((m, idx) => {
          // Check against all existing transactions in prev (whether in triage/pending, auto_assigned, or classified!)
          const matched = prev.find(
            (p) => !consumedExistingIds.has(p.id) && isSameMovement(p, m)
          );

          if (matched) {
            consumedExistingIds.add(matched.id);
            duplicatesCount++;
            return; // Duplicate movement! Skip and do not duplicate.
          }

          // Genuine new movement
          const defaultPayer: PayerType =
            m.ownership === "USER_B"
              ? "memberB"
              : m.ownership === "USER_A"
              ? "memberA"
              : "joint";

          const concept = m.concept.trim() || "Movimiento Bancario";
          const rawConcept = m.rawConcept || concept;
          const accountLabel = m.accountLabel || m.bankName || "Bankinter";
          const isCardBill = isCardBillingStatement(concept) || isCardBillingStatement(rawConcept);

          const pipe = runCategorizationPipeline(
            {
              merchant: concept,
              amount: m.amount,
              accountLabel,
            },
            rulesRef.current,
            learningsRef.current,
            categoriesRef.current
          );

          const isCredit = Boolean(m.isCredit);

          let status: "pending" | "classified" | "auto_assigned";
          let payer: PayerType;
          let split: SplitType;
          let category: string;
          let categoryColor: string;
          let movementType: "expense" | "transfer_to_joint" | "settlement" | undefined;

          if (isCardBill) {
            status = "classified";
            payer = "joint";
            split = "ignored";
            category = "Liquidación / Neteo";
            categoryColor = "#8B5CF6";
            movementType = "expense";
          } else if (isCredit) {
            status = "classified";
            payer = defaultPayer;
            split = defaultPayer === "memberB" ? "memberB" : defaultPayer === "memberA" ? "memberA" : "50/50";
            category = pipe.category && pipe.category !== "Otros Gastos Comunes" ? pipe.category : "Ingreso / Nómina";
            categoryColor = pipe.categoryColor && pipe.category !== "Otros Gastos Comunes" ? pipe.categoryColor : "#10B981";
            movementType = undefined;
          } else {
            status = "pending";
            payer = defaultPayer;
            split = "50/50";
            category = pipe.category;
            categoryColor = pipe.categoryColor;
            movementType = "expense";
          }

          const createdTx: Transaction = {
            id: m.id || `bank-stmt-${Date.now()}-${idx}`,
            bankMovementId: m.id,
            merchant: concept,
            rawConcept,
            date: m.date,
            monthKey: m.monthKey,
            amount: Math.abs(m.amount),
            category,
            categoryColor,
            accountLabel,
            status,
            payer,
            split,
            isManual: false,
            movementType,
            isCredit,
            createdAt: Date.now() - idx * 1000,
            autoAssignedRuleId: pipe.matchedRuleId,
            autoAssignedReason: pipe.matchedRuleName ? `Regla: ${pipe.matchedRuleName}` : pipe.rationale,
          };

          toAdd.push(createdTx);
          addedCount++;
        });

        if (toAdd.length === 0) {
          return prev;
        }

        return [...toAdd, ...prev];
      });

      return { added: addedCount, duplicates: duplicatesCount, total: movements.length };
    },
    [persistTransactions]
  );

  // Keep a ref to latest state for responsive sync handshakes
  const latestStateRef = React.useRef({ transactions, accounts, settlementCutoffs, rules, learnings });
  useEffect(() => {
    latestStateRef.current = { transactions, accounts, settlementCutoffs, rules, learnings };
  }, [transactions, accounts, settlementCutoffs, rules, learnings]);

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
        setAccounts((prev) => {
          const map = new Map<string, BankAccount>();
          for (const a of prev) map.set(a.id, a);
          for (const ma of msg.accounts) map.set(ma.id, ma);
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      } else if (msg.type === "SETTLEMENTS_SYNC" && msg.settlements) {
        setSettlementCutoffs(msg.settlements);
        try {
          localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(msg.settlements));
        } catch {}
      } else if (msg.type === "RULES_SYNC" && Array.isArray(msg.rules)) {
        setRules(msg.rules);
        try {
          localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(msg.rules));
        } catch {}
      } else if (msg.type === "LEARNINGS_SYNC" && Array.isArray(msg.learnings)) {
        setLearnings(msg.learnings);
        try {
          localStorage.setItem(STORAGE_KEY_LEARNINGS, JSON.stringify(msg.learnings));
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
        broadcastHouseholdSync({
          type: "RULES_SYNC",
          inviteCode,
          rules: latestStateRef.current.rules,
        });
        broadcastHouseholdSync({
          type: "LEARNINGS_SYNC",
          inviteCode,
          learnings: latestStateRef.current.learnings,
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
      } else if (e.key === STORAGE_KEY_RULES && e.newValue) {
        try {
          setRules(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === STORAGE_KEY_LEARNINGS && e.newValue) {
        try {
          setLearnings(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Supabase PostgreSQL database change listener (household_state)
    const unsubscribeDb = subscribeHouseholdDbChanges(inviteCode, (cloud) => {
      if (cloud.transactions && Array.isArray(cloud.transactions)) {
        const currentPurgeTs = typeof window !== "undefined"
          ? Number(localStorage.getItem(PURGE_ANDREA_VISACLASICA_TS_KEY) || "0")
          : 0;
        const cleanCloudTransactions = cloud.transactions.filter((ct: any) => {
          if (!shouldPurgeMovement(ct)) return true;
          return currentPurgeTs > 0 && (ct.createdAt || 0) > currentPurgeTs;
        });

        setTransactions((prev) => {
          const cleanPrev = prev.filter((t: any) => {
            if (!shouldPurgeMovement(t)) return true;
            return currentPurgeTs > 0 && (t.createdAt || 0) > currentPurgeTs;
          });
          const prevMap = new Map(cleanPrev.map((t) => [t.id, t]));
          const cloudMap = new Map<string, Transaction>();
          for (const ct of cleanCloudTransactions) {
            const local = prevMap.get(ct.id);
            if (!local) {
              cloudMap.set(ct.id, ct);
            } else if (local.split === "ignored") {
              cloudMap.set(ct.id, local);
            } else if (local.status === "classified" && ct.status === "pending") {
              cloudMap.set(ct.id, local);
            } else if ((local.updatedAt || 0) >= (ct.updatedAt || 0)) {
              cloudMap.set(ct.id, local);
            } else {
              cloudMap.set(ct.id, ct);
            }
          }
          const localOnly = cleanPrev.filter((t) => !cloudMap.has(t.id));
          const merged = [...Array.from(cloudMap.values()), ...localOnly];
          try {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (cloud.accounts && Array.isArray(cloud.accounts)) {
        setAccounts((prev) => {
          const map = new Map<string, BankAccount>();
          for (const a of prev) map.set(a.id, a);
          for (const ca of cloud.accounts) map.set(ca.id, ca);
          const merged = Array.from(map.values());
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
      if (cloud.rules && Array.isArray(cloud.rules)) {
        setRules(cloud.rules);
        try {
          localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(cloud.rules));
        } catch {}
      }
      if (cloud.category_learnings && Array.isArray(cloud.category_learnings)) {
        setLearnings(cloud.category_learnings);
        try {
          localStorage.setItem(STORAGE_KEY_LEARNINGS, JSON.stringify(cloud.category_learnings));
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
    const now = Date.now();
    persistTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "classified",
              split,
              payer: payer || t.payer,
              updatedAt: now,
            }
          : t
      )
    );
  };

  const reclassifyTransaction = (id: string, split: SplitType) => {
    const now = Date.now();
    persistTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, split, status: "classified", updatedAt: now } : t))
    );
  };

  const updateTransactionCategory = useCallback(
    (id: string, newCategoryName: string) => {
      const found =
        categories.find((c) => c.name === newCategoryName) ||
        CATEGORIES_LIST.find((c) => c.name === newCategoryName);
      const color = found ? found.color : "#64748B";
      const now = Date.now();

      const current = transactionsRef.current;
      const targetTx = current.find((t) => t.id === id);
      const targetMerchant = targetTx?.merchant || "";

      // Continuous feedback learning: memorize user's preference for future movements
      if (targetMerchant) {
        learnCategory(targetMerchant, newCategoryName);
      }

      persistTransactions((prev) =>
        prev.map((t) => {
          if (t.id === id || (targetMerchant && isMerchantMatch(t.merchant, targetMerchant))) {
            return {
              ...t,
              category: newCategoryName,
              categoryColor: color,
              updatedAt: now,
            };
          }
          return t;
        })
      );
    },
    [categories, learnCategory, persistTransactions]
  );

  const confirmAutoAssigned = useCallback(
    (id: string) => {
      const now = Date.now();
      persistTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "classified", updatedAt: now } : t))
      );
    },
    [persistTransactions]
  );

  const confirmAllAutoAssigned = useCallback(() => {
    const now = Date.now();
    persistTransactions((prev) =>
      prev.map((t) => (t.status === "auto_assigned" ? { ...t, status: "classified", updatedAt: now } : t))
    );
  }, [persistTransactions]);

  const assignAllPendingToCardHolder = useCallback((): {
    count: number;
    memberACount: number;
    memberBCount: number;
    jointCount: number;
  } => {
    const currentAccounts = accountsRef.current || accounts;
    const defaultCardAcc = currentAccounts.find(
      (a) =>
        a.accountName.toLowerCase().includes("tarjeta") ||
        a.id.startsWith("card_") ||
        a.id === "acc_card_bankinter"
    );

    let memberACount = 0;
    let memberBCount = 0;
    let jointCount = 0;
    let count = 0;
    const now = Date.now();

    persistTransactions((prev) => {
      return prev.map((t) => {
        if (t.status !== "pending") return t;

        count++;

        // 1. Try to find matched account by accountLabel or id
        const targetLabel = (t.accountLabel || "").toLowerCase().trim();
        const rawConcept = (t.rawConcept || t.merchant || "").toLowerCase();

        // If it's a card billing statement (e.g. "Recibo VISA CLASICA"), always mark as ignored ("No contabilizado")
        if (isCardBillingStatement(rawConcept) || isCardBillingStatement(targetLabel)) {
          return {
            ...t,
            status: "classified" as const,
            split: "ignored" as const,
            payer: "joint" as const,
            category: "Liquidación / Neteo",
            categoryColor: "#8B5CF6",
            updatedAt: now,
          };
        }

        let targetOwnership: "USER_A" | "USER_B" | "JOINT" | null = null;

        const matchedAcc = currentAccounts.find((a) => {
          const aId = (a.id || "").toLowerCase();
          const aName = (a.accountName || "").toLowerCase();
          if (targetLabel && (aId === targetLabel || aName === targetLabel)) return true;
          if (targetLabel && aName.includes(targetLabel)) return true;
          if (targetLabel && targetLabel.includes(aName)) return true;
          return false;
        });

        if (matchedAcc) {
          targetOwnership = matchedAcc.ownership;
        } else if (
          t.id.startsWith("card_") ||
          /tarjeta|visa|mastercard|card/i.test(targetLabel) ||
          /tarjeta|visa|mastercard/i.test(rawConcept)
        ) {
          if (defaultCardAcc) {
            targetOwnership = defaultCardAcc.ownership;
          }
        }

        // If not resolved from accounts, use payer if set
        if (!targetOwnership) {
          if (t.payer === "memberB") targetOwnership = "USER_B";
          else if (t.payer === "joint") targetOwnership = "JOINT";
          else if (t.payer === "memberA") targetOwnership = "USER_A";
        }

        // If still not resolved, check text
        if (!targetOwnership) {
          if (targetLabel.includes("andrea") || rawConcept.includes("andrea")) {
            targetOwnership = "USER_B";
          } else if (targetLabel.includes("conjunt") || targetLabel.includes("compartid") || targetLabel.includes("50/50")) {
            targetOwnership = "JOINT";
          } else {
            targetOwnership = defaultCardAcc?.ownership || "USER_A";
          }
        }

        let split: SplitType = "50/50";
        let payer: PayerType = "joint";

        if (targetOwnership === "USER_B") {
          split = "memberB";
          payer = "memberB";
          memberBCount++;
        } else if (targetOwnership === "JOINT") {
          split = "50/50";
          payer = "joint";
          jointCount++;
        } else {
          split = "memberA";
          payer = "memberA";
          memberACount++;
        }

        return {
          ...t,
          status: "classified" as const,
          split,
          payer,
          updatedAt: now,
        };
      });
    });

    return { count, memberACount, memberBCount, jointCount };
  }, [accounts, persistTransactions]);


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

  const autoAssignedTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "auto_assigned")
        .sort((a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)),
    [transactions]
  );

  const allPendingTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "pending" && !t.isCredit)
        .sort((a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)),
    [transactions]
  );

  const classifiedTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.status === "classified" || t.status === "auto_assigned"),
    [filteredTransactions]
  );

  // 1. Joint Shared 50/50 expenses for graphs & summaries:
  // - ONLY Classified / auto_assigned as 50/50
  // - Pending transactions waiting in inbox are NEVER counted as assigned expenses!
  const jointClassifiedTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        return (t.status === "classified" || t.status === "auto_assigned") && t.split === "50/50";
      }),
    [filteredTransactions]
  );

  // 2. Personal Member A movements for graphs & summaries:
  // - ONLY Classified / auto_assigned as memberA
  // - Pending transactions waiting in inbox are NEVER counted as assigned expenses!
  const memberAClassifiedTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        return (t.status === "classified" || t.status === "auto_assigned") && t.split === "memberA";
      }),
    [filteredTransactions]
  );

  // 3. Personal Member B movements for graphs & summaries:
  // - ONLY Classified / auto_assigned as memberB
  // - Pending transactions waiting in inbox are NEVER counted as assigned expenses!
  const memberBClassifiedTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        return (t.status === "classified" || t.status === "auto_assigned") && t.split === "memberB";
      }),
    [filteredTransactions]
  );

  // Totals
  const totalJointSpent = useMemo(
    () => jointClassifiedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [jointClassifiedTransactions]
  );

  const totalMemberASpent = useMemo(
    () =>
      memberAClassifiedTransactions
        .filter((t) => !t.isCredit)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [memberAClassifiedTransactions]
  );

  const totalMemberBSpent = useMemo(
    () =>
      memberBClassifiedTransactions
        .filter((t) => !t.isCredit)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [memberBClassifiedTransactions]
  );

  // Total expenditure recognized for each person: individual expenses (100%) + joint expenses (50%)
  const totalMemberASpentWithJoint = useMemo(
    () => Math.round((totalMemberASpent + totalJointSpent / 2) * 100) / 100,
    [totalMemberASpent, totalJointSpent]
  );

  const totalMemberBSpentWithJoint = useMemo(
    () => Math.round((totalMemberBSpent + totalJointSpent / 2) * 100) / 100,
    [totalMemberBSpent, totalJointSpent]
  );

  // Category breakdown builders helper with custom factor per item
  const buildWeightedCategoryBreakdown = useCallback(
    (items: Array<{ transaction: Transaction; factor: number }>) => {
      const map = new Map<string, { value: number; color: string; count: number }>();
      for (const { transaction: t, factor } of items) {
        if (t.isCredit || t.movementType === "transfer_to_joint") continue;

        const catObj =
          categories.find((c) => c.name.toLowerCase().trim() === (t.category || "").toLowerCase().trim()) ||
          CATEGORIES_LIST.find((c) => c.name.toLowerCase().trim() === (t.category || "").toLowerCase().trim());

        const catName = catObj ? catObj.name : (t.category || "Otros");
        const catColor = catObj ? catObj.color : (t.categoryColor || "#64748B");
        const amt = Math.abs(t.amount) * factor;

        const existing = map.get(catName);
        if (existing) {
          existing.value += amt;
          existing.count += 1;
        } else {
          map.set(catName, { value: amt, color: catColor, count: 1 });
        }
      }
      return Array.from(map.entries())
        .filter(([, data]) => data.value > 0)
        .map(([name, data]) => ({
          name,
          value: Math.round(data.value * 100) / 100,
          color: data.color,
          count: data.count,
        }))
        .sort((a, b) => b.value - a.value);
    },
    [categories]
  );

  const buildCategoryBreakdown = useCallback(
    (list: Transaction[]) => {
      return buildWeightedCategoryBreakdown(list.map((t) => ({ transaction: t, factor: 1.0 })));
    },
    [buildWeightedCategoryBreakdown]
  );

  const jointCategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(jointClassifiedTransactions),
    [jointClassifiedTransactions, buildCategoryBreakdown]
  );

  // Carlos personal category breakdown: 100% individual (only personal expenses)
  const memberAPersonalCategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(memberAClassifiedTransactions),
    [memberAClassifiedTransactions, buildCategoryBreakdown]
  );

  // Andrea personal category breakdown: 100% individual (only personal expenses)
  const memberBPersonalCategoriesBreakdown = useMemo(
    () => buildCategoryBreakdown(memberBClassifiedTransactions),
    [memberBClassifiedTransactions, buildCategoryBreakdown]
  );

  // Carlos recognized category breakdown: 100% individual + 50% joint (for Resumen Mensual scope)
  const memberACategoriesBreakdown = useMemo(
    () =>
      buildWeightedCategoryBreakdown([
        ...memberAClassifiedTransactions.map((t) => ({ transaction: t, factor: 1.0 })),
        ...jointClassifiedTransactions.map((t) => ({ transaction: t, factor: 0.5 })),
      ]),
    [memberAClassifiedTransactions, jointClassifiedTransactions, buildWeightedCategoryBreakdown]
  );

  // Andrea recognized category breakdown: 100% individual + 50% joint (for Resumen Mensual scope)
  const memberBCategoriesBreakdown = useMemo(
    () =>
      buildWeightedCategoryBreakdown([
        ...memberBClassifiedTransactions.map((t) => ({ transaction: t, factor: 1.0 })),
        ...jointClassifiedTransactions.map((t) => ({ transaction: t, factor: 0.5 })),
      ]),
    [memberBClassifiedTransactions, jointClassifiedTransactions, buildWeightedCategoryBreakdown]
  );

  // Detailed recognized movements list for Carlos (individual + 50% joint)
  const memberARecognizedMovements = useMemo((): RecognizedMovementItem[] => {
    const list: RecognizedMovementItem[] = [];
    for (const t of memberAClassifiedTransactions) {
      if (t.isCredit || t.movementType === "transfer_to_joint") continue;
      list.push({
        transaction: t,
        recognizedAmount: Math.abs(t.amount),
        isSharedHalf: false,
      });
    }
    for (const t of jointClassifiedTransactions) {
      if (t.isCredit || t.movementType === "transfer_to_joint") continue;
      list.push({
        transaction: t,
        recognizedAmount: Math.round((Math.abs(t.amount) / 2) * 100) / 100,
        isSharedHalf: true,
      });
    }
    return list.sort(
      (a, b) =>
        getTransactionSortTimestamp(b.transaction) - getTransactionSortTimestamp(a.transaction)
    );
  }, [memberAClassifiedTransactions, jointClassifiedTransactions]);

  // Detailed recognized movements list for Andrea (individual + 50% joint)
  const memberBRecognizedMovements = useMemo((): RecognizedMovementItem[] => {
    const list: RecognizedMovementItem[] = [];
    for (const t of memberBClassifiedTransactions) {
      if (t.isCredit || t.movementType === "transfer_to_joint") continue;
      list.push({
        transaction: t,
        recognizedAmount: Math.abs(t.amount),
        isSharedHalf: false,
      });
    }
    for (const t of jointClassifiedTransactions) {
      if (t.isCredit || t.movementType === "transfer_to_joint") continue;
      list.push({
        transaction: t,
        recognizedAmount: Math.round((Math.abs(t.amount) / 2) * 100) / 100,
        isSharedHalf: true,
      });
    }
    return list.sort(
      (a, b) =>
        getTransactionSortTimestamp(b.transaction) - getTransactionSortTimestamp(a.transaction)
    );
  }, [memberBClassifiedTransactions, jointClassifiedTransactions]);

  // Carlos (Member A) Income Movements
  const memberAIncomeTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (!t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        if (t.split === "memberA") return true;
        const acc = accounts.find((a) => a.id === t.accountLabel || a.accountName === t.accountLabel);
        return (t.payer === "memberA" || acc?.ownership === "USER_A") && t.split !== "memberB" && t.split !== "50/50";
      }),
    [filteredTransactions, accounts]
  );

  // Andrea (Member B) Income Movements
  const memberBIncomeTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (!t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        if (t.split === "memberB") return true;
        const acc = accounts.find((a) => a.id === t.accountLabel || a.accountName === t.accountLabel);
        return (t.payer === "memberB" || acc?.ownership === "USER_B") && t.split !== "memberA" && t.split !== "50/50";
      }),
    [filteredTransactions, accounts]
  );

  // Joint Income Movements
  const jointIncomeTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) => {
        if (!t.isCredit || t.movementType === "transfer_to_joint" || t.movementType === "settlement") return false;
        if (t.split === "50/50") return true;
        const acc = accounts.find((a) => a.id === t.accountLabel || a.accountName === t.accountLabel);
        return (t.payer === "joint" || acc?.ownership === "JOINT") && t.split !== "memberA" && t.split !== "memberB";
      }),
    [filteredTransactions, accounts]
  );

  // All Household Income Movements
  const householdIncomeTransactions = useMemo(
    () =>
      filteredTransactions.filter(
        (t) => t.isCredit && t.movementType !== "transfer_to_joint" && t.movementType !== "settlement"
      ),
    [filteredTransactions]
  );

  // Carlos Personal Movements (Both 100% Personal Expenses AND Incomes)
  const memberAPersonalMovements = useMemo(
    () =>
      [...memberAClassifiedTransactions, ...memberAIncomeTransactions].sort(
        (a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)
      ),
    [memberAClassifiedTransactions, memberAIncomeTransactions]
  );

  // Andrea Personal Movements (Both 100% Personal Expenses AND Incomes)
  const memberBPersonalMovements = useMemo(
    () =>
      [...memberBClassifiedTransactions, ...memberBIncomeTransactions].sort(
        (a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)
      ),
    [memberBClassifiedTransactions, memberBIncomeTransactions]
  );

  // Joint Movements with Incomes
  const jointMovementsWithIncome = useMemo(
    () =>
      [...jointClassifiedTransactions, ...jointIncomeTransactions].sort(
        (a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)
      ),
    [jointClassifiedTransactions, jointIncomeTransactions]
  );

  // Household Movements with Incomes
  const householdMovementsWithIncome = useMemo(
    () =>
      filteredTransactions
        .filter(
          (t) =>
            t.movementType !== "transfer_to_joint" &&
            t.movementType !== "settlement" &&
            (t.isCredit || t.status === "classified" || t.status === "auto_assigned" || t.status === "pending")
        )
        .sort((a, b) => getTransactionSortTimestamp(b) - getTransactionSortTimestamp(a)),
    [filteredTransactions]
  );

  const totalJointIncome = useMemo(
    () => jointIncomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [jointIncomeTransactions]
  );

  const totalMemberAIncome = useMemo(
    () => memberAIncomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [memberAIncomeTransactions]
  );

  const totalMemberBIncome = useMemo(
    () => memberBIncomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [memberBIncomeTransactions]
  );

  const totalHouseholdSpent = useMemo(
    () => totalJointSpent + totalMemberASpent + totalMemberBSpent,
    [totalJointSpent, totalMemberASpent, totalMemberBSpent]
  );

  const totalHouseholdIncome = useMemo(
    () =>
      filteredTransactions
        .filter(
          (t) =>
            t.isCredit &&
            t.movementType !== "transfer_to_joint" &&
            t.movementType !== "settlement"
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [filteredTransactions]
  );

  const householdCategoriesBreakdown = useMemo(
    () =>
      buildCategoryBreakdown(
        filteredTransactions.filter(
          (t) =>
            !t.isCredit &&
            t.movementType !== "transfer_to_joint" &&
            t.movementType !== "settlement" &&
            (t.status === "classified" || t.status === "auto_assigned")
        )
      ),
    [filteredTransactions, buildCategoryBreakdown]
  );

  const memberAHouseholdCategoriesBreakdown = useMemo(
    () =>
      buildWeightedCategoryBreakdown([
        ...memberAClassifiedTransactions.map((t) => ({ transaction: t, factor: 1.0 })),
        ...jointClassifiedTransactions.map((t) => ({ transaction: t, factor: 0.5 })),
      ]),
    [memberAClassifiedTransactions, jointClassifiedTransactions, buildWeightedCategoryBreakdown]
  );

  const memberBHouseholdCategoriesBreakdown = useMemo(
    () =>
      buildWeightedCategoryBreakdown([
        ...memberBClassifiedTransactions.map((t) => ({ transaction: t, factor: 1.0 })),
        ...jointClassifiedTransactions.map((t) => ({ transaction: t, factor: 0.5 })),
      ]),
    [memberBClassifiedTransactions, jointClassifiedTransactions, buildWeightedCategoryBreakdown]
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
        totalMemberASpentWithJoint,
        totalMemberBSpentWithJoint,
        memberARecognizedMovements,
        memberBRecognizedMovements,
        memberAPersonalMovements,
        memberBPersonalMovements,
        memberAIncomeTransactions,
        memberBIncomeTransactions,
        jointIncomeTransactions,
        householdIncomeTransactions,
        jointMovementsWithIncome,
        householdMovementsWithIncome,
        totalHouseholdSpent,
        totalHouseholdIncome,
        totalJointIncome,
        totalMemberAIncome,
        totalMemberBIncome,
        categoriesBreakdown: jointCategoriesBreakdown,
        jointCategoriesBreakdown,
        memberAPersonalCategoriesBreakdown,
        memberBPersonalCategoriesBreakdown,
        memberACategoriesBreakdown,
        memberBCategoriesBreakdown,
        householdCategoriesBreakdown,
        memberAHouseholdCategoriesBreakdown,
        memberBHouseholdCategoriesBreakdown,
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
        deleteMovementsByBank,
        rules,
        learnings,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        learnCategory,
        confirmAutoAssigned,
        confirmAllAutoAssigned,
        assignAllPendingToCardHolder,
        autoAssignedTransactions,
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
