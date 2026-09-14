"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { useUserNames } from "./UserNamesContext";

export type SplitType = "50/50" | "memberA" | "memberB";
export type PayerType = "memberA" | "memberB" | "joint";

export interface CategoryInfo {
  name: string;
  color: string;
}

export const CATEGORIES_LIST: CategoryInfo[] = [
  { name: "Supermercado", color: "#00D09C" },
  { name: "Hogar & Luz", color: "#0EA5E9" },
  { name: "Restaurantes & Ocio", color: "#F59E0B" },
  { name: "Transporte & Gasolina", color: "#6366F1" },
  { name: "Otros Gastos Comunes", color: "#EC4899" },
];

export interface Transaction {
  id: string;
  merchant: string;
  date: string;
  monthKey: string; // "2026-09" | "2026-08"
  amount: number;
  category: string;
  categoryColor: string;
  accountLabel: string; // e.g. "Tarjeta Débito" or "Cuenta Santander"
  status: "pending" | "classified";
  payer: PayerType;
  split: SplitType;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Septiembre 2026
  {
    id: "tx-1",
    merchant: "Mercadona Gran Vía",
    date: "14 Sep, 11:42",
    monthKey: "2026-09",
    amount: 64.2,
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "Tarjeta Débito",
    status: "pending",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-2",
    merchant: "Iberdrola Clientes",
    date: "13 Sep, 09:15",
    monthKey: "2026-09",
    amount: 89.4,
    category: "Hogar & Luz",
    categoryColor: "#0EA5E9",
    accountLabel: "Cuenta Santander",
    status: "pending",
    payer: "memberB",
    split: "50/50",
  },
  {
    id: "tx-3",
    merchant: "Restaurante La Tagliatella",
    date: "12 Sep, 21:30",
    monthKey: "2026-09",
    amount: 54.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Tarjeta Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-4",
    merchant: "Repsol Estación de Servicio",
    date: "10 Sep, 18:20",
    monthKey: "2026-09",
    amount: 45.0,
    category: "Transporte & Gasolina",
    categoryColor: "#6366F1",
    accountLabel: "Tarjeta Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-5",
    merchant: "Farmacia Central",
    date: "08 Sep, 12:10",
    monthKey: "2026-09",
    amount: 32.5,
    category: "Otros Gastos Comunes",
    categoryColor: "#EC4899",
    accountLabel: "Cuenta Santander",
    status: "classified",
    payer: "memberB",
    split: "50/50",
  },
  {
    id: "tx-6",
    merchant: "Carrefour Market",
    date: "05 Sep, 16:40",
    monthKey: "2026-09",
    amount: 128.0,
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "Tarjeta Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  // Agosto 2026 (Mes anterior)
  {
    id: "tx-7",
    merchant: "Lidl Supermercados",
    date: "28 Ago, 10:15",
    monthKey: "2026-08",
    amount: 95.3,
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "Cuenta Santander",
    status: "classified",
    payer: "memberB",
    split: "50/50",
  },
  {
    id: "tx-8",
    merchant: "Cine Yelmo Ideal",
    date: "24 Ago, 20:00",
    monthKey: "2026-08",
    amount: 22.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Tarjeta Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-9",
    merchant: "Gas Natural Suministros",
    date: "15 Ago, 08:30",
    monthKey: "2026-08",
    amount: 68.4,
    category: "Hogar & Luz",
    categoryColor: "#0EA5E9",
    accountLabel: "Cuenta Santander",
    status: "classified",
    payer: "memberB",
    split: "50/50",
  },
  {
    id: "tx-10",
    merchant: "Taller Mecánico Rápido",
    date: "12 Ago, 11:20",
    monthKey: "2026-08",
    amount: 140.0,
    category: "Transporte & Gasolina",
    categoryColor: "#6366F1",
    accountLabel: "Tarjeta Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
];

export const AVAILABLE_MONTHS = [
  { key: "2026-09", label: "Septiembre 2026" },
  { key: "2026-08", label: "Agosto 2026" },
  { key: "2026-07", label: "Julio 2026" },
];

interface TransactionsContextType {
  transactions: Transaction[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  classifyTransaction: (id: string, split: SplitType, payer?: PayerType) => void;
  reclassifyTransaction: (id: string, split: SplitType) => void;
  updateTransactionCategory: (id: string, newCategoryName: string) => void;
  getAccountDisplay: (tx: Transaction) => string;
  filteredTransactions: Transaction[];
  pendingTransactions: Transaction[];
  classifiedTransactions: Transaction[];
  totalSpent: number;
  categoriesBreakdown: { name: string; value: number; color: string; count: number }[];
  balanceData: {
    paidByA: number;
    paidByB: number;
    debtor: "memberA" | "memberB" | "none";
    debtorName: string;
    creditorName: string;
    netDebt: number;
  };
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { memberAName, memberBName } = useUserNames();
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");

  const classifyTransaction = (id: string, split: SplitType, payer?: PayerType) => {
    setTransactions((prev) =>
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
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, split, status: "classified" } : t))
    );
  };

  const updateTransactionCategory = (id: string, newCategoryName: string) => {
    const found = CATEGORIES_LIST.find((c) => c.name === newCategoryName);
    const color = found ? found.color : "#64748B";

    setTransactions((prev) =>
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
    if (tx.payer === "memberA") {
      return `${tx.accountLabel} (${memberAName})`;
    }
    if (tx.payer === "memberB") {
      return `${tx.accountLabel} (${memberBName})`;
    }
    return "Cuenta Conjunta BBVA ••8491";
  };

  // Transactions filtered by selected month
  const filteredTransactions = useMemo(
    () => transactions.filter((t) => t.monthKey === selectedMonth),
    [transactions, selectedMonth]
  );

  const pendingTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.status === "pending"),
    [filteredTransactions]
  );

  const classifiedTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.status === "classified"),
    [filteredTransactions]
  );

  // Total spent (all classified expenses in this month)
  const totalSpent = useMemo(() => {
    return classifiedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [classifiedTransactions]);

  // Categories Breakdown for Donut Chart dynamically calculated from current month classified transactions
  const categoriesBreakdown = useMemo(() => {
    const map = new Map<string, { value: number; color: string; count: number }>();
    for (const t of classifiedTransactions) {
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
  }, [classifiedTransactions]);

  // Mathematical Balance Engine: "Quién debe a quién"
  const balanceData = useMemo(() => {
    let paidByA = 0;
    let paidByB = 0;

    for (const t of classifiedTransactions) {
      if (t.split === "50/50") {
        if (t.payer === "memberA") {
          paidByA += t.amount;
        } else if (t.payer === "memberB") {
          paidByB += t.amount;
        }
      } else if (t.split === "memberA") {
        // Personal expense of Member A
        if (t.payer === "memberB") {
          paidByB += t.amount * 2;
        }
      } else if (t.split === "memberB") {
        // Personal expense of Member B
        if (t.payer === "memberA") {
          paidByA += t.amount * 2;
        }
      }
    }

    const diff = paidByA - paidByB;
    const netDebt = Math.abs(diff) / 2;

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
      paidByA: Math.round(paidByA * 100) / 100,
      paidByB: Math.round(paidByB * 100) / 100,
      debtor,
      debtorName,
      creditorName,
      netDebt: Math.round(netDebt * 100) / 100,
    };
  }, [classifiedTransactions, memberAName, memberBName]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        selectedMonth,
        setSelectedMonth,
        classifyTransaction,
        reclassifyTransaction,
        updateTransactionCategory,
        getAccountDisplay,
        filteredTransactions,
        pendingTransactions,
        classifiedTransactions,
        totalSpent,
        categoriesBreakdown,
        balanceData,
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
