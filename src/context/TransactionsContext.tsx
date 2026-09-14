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
  accountLabel: string;
  status: "pending" | "classified";
  payer: PayerType;
  split: SplitType;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  ibanMask: string;
  ownership: "JOINT" | "USER_A" | "USER_B";
  balance: number;
}

// Crisp, round numbers for easy mental math
const INITIAL_TRANSACTIONS: Transaction[] = [
  // Septiembre 2026
  {
    id: "tx-1",
    merchant: "Mercadona Gran Vía",
    date: "14 Sep, 11:42",
    monthKey: "2026-09",
    amount: 50.0, // Round number
    category: "Supermercado",
    categoryColor: "#00D09C",
    accountLabel: "Santander Débito",
    status: "pending",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-2",
    merchant: "Iberdrola Electricidad",
    date: "13 Sep, 09:15",
    monthKey: "2026-09",
    amount: 30.0, // Round number
    category: "Hogar & Luz",
    categoryColor: "#0EA5E9",
    accountLabel: "CaixaBank Débito",
    status: "pending",
    payer: "memberB",
    split: "50/50",
  },
  {
    id: "tx-3",
    merchant: "Restaurante La Tagliatella",
    date: "12 Sep, 21:30",
    monthKey: "2026-09",
    amount: 40.0, // Round: Carlos paid 40€ 50/50
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-4",
    merchant: "Repsol Gasolina",
    date: "10 Sep, 18:20",
    monthKey: "2026-09",
    amount: 60.0, // Round: Carlos paid 60€ 50/50
    category: "Transporte & Gasolina",
    categoryColor: "#6366F1",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "50/50",
  },
  {
    id: "tx-5",
    merchant: "Farmacia Central",
    date: "08 Sep, 12:10",
    monthKey: "2026-09",
    amount: 20.0, // Round: Andrea paid 20€ 50/50
    category: "Otros Gastos Comunes",
    categoryColor: "#EC4899",
    accountLabel: "CaixaBank Débito",
    status: "classified",
    payer: "memberB",
    split: "50/50",
  },
  // Personal expense of Member A (no 50/50 duplication)
  {
    id: "tx-6",
    merchant: "Zara Moda Hombre",
    date: "06 Sep, 17:30",
    monthKey: "2026-09",
    amount: 50.0, // Solo Carlos
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    accountLabel: "Santander Débito",
    status: "classified",
    payer: "memberA",
    split: "memberA",
  },
  // Personal expense of Member B (no 50/50 duplication)
  {
    id: "tx-7",
    merchant: "Sephora Cosméticos",
    date: "04 Sep, 14:15",
    monthKey: "2026-09",
    amount: 30.0, // Solo Andrea
    category: "Otros Gastos Comunes",
    categoryColor: "#EC4899",
    accountLabel: "CaixaBank Débito",
    status: "classified",
    payer: "memberB",
    split: "memberB",
  },

  // Agosto 2026 (Mes anterior)
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
  },
];

export const INITIAL_ACCOUNTS: BankAccount[] = [
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
];

export const AVAILABLE_MONTHS = [
  { key: "2026-09", label: "Septiembre 2026" },
  { key: "2026-08", label: "Agosto 2026" },
  { key: "2026-07", label: "Julio 2026" },
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
  };
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { memberAName, memberBName } = useUserNames();
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [accounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");

  const addTransaction = (data: {
    merchant: string;
    amount: number;
    category: string;
    payer: PayerType;
    split: SplitType;
  }) => {
    const foundCat = CATEGORIES_LIST.find((c) => c.name === data.category);
    const color = foundCat ? foundCat.color : "#00D09C";

    const accountLabel =
      data.payer === "memberA"
        ? "Santander Débito"
        : data.payer === "memberB"
        ? "CaixaBank Débito"
        : "BBVA Conjunta";

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: data.merchant.trim() || "Gasto Manual",
      date: "Hoy, Manual",
      monthKey: selectedMonth,
      amount: Math.abs(data.amount),
      category: data.category,
      categoryColor: color,
      accountLabel,
      status: "classified",
      payer: data.payer,
      split: data.split,
    };

    setTransactions((prev) => [newTx, ...prev]);
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
    const foundCat = CATEGORIES_LIST.find((c) => c.name === data.category);
    const color = foundCat ? foundCat.color : "#00D09C";

    const accountLabel =
      data.payer === "memberA"
        ? "Santander Débito"
        : data.payer === "memberB"
        ? "CaixaBank Débito"
        : "BBVA Conjunta";

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              merchant: data.merchant.trim() || "Gasto",
              amount: Math.abs(data.amount),
              category: data.category,
              categoryColor: color,
              accountLabel,
              payer: data.payer,
              split: data.split,
            }
          : t
      )
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

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
      return `${tx.accountLabel || "Santander Débito"} (${memberAName})`;
    }
    if (tx.payer === "memberB") {
      return `${tx.accountLabel || "CaixaBank Débito"} (${memberBName})`;
    }
    return `${tx.accountLabel || "BBVA Conjunta"} (Conjunta)`;
  };

  // Filtered by selected month
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

  // 1. Joint Shared 50/50 expenses
  const jointClassifiedTransactions = useMemo(
    () => classifiedTransactions.filter((t) => t.split === "50/50"),
    [classifiedTransactions]
  );

  // 2. Personal Member A expenses (exclusive to A, NOT 50/50 to avoid duplication)
  const memberAClassifiedTransactions = useMemo(
    () => classifiedTransactions.filter((t) => t.split === "memberA"),
    [classifiedTransactions]
  );

  // 3. Personal Member B expenses (exclusive to B, NOT 50/50 to avoid duplication)
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
    () => memberAClassifiedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [memberAClassifiedTransactions]
  );

  const totalMemberBSpent = useMemo(
    () => memberBClassifiedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [memberBClassifiedTransactions]
  );

  // Category breakdown builders helper
  const buildCategoryBreakdown = (list: Transaction[]) => {
    const map = new Map<string, { value: number; color: string; count: number }>();
    for (const t of list) {
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

  // Mathematical Net Balance:
  // Carlos paid: sum of 50/50 where payer=A
  // Andrea paid: sum of 50/50 where payer=B
  // Net debt = |paidByA - paidByB| / 2
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
      } else if (t.split === "memberA" && t.payer === "memberB") {
        // Andrea paid for Carlos's personal expense
        paidByB += t.amount * 2;
      } else if (t.split === "memberB" && t.payer === "memberA") {
        // Carlos paid for Andrea's personal expense
        paidByA += t.amount * 2;
      } else if (t.split === "memberA" && t.payer === "joint") {
        // Joint account paid for Carlos's personal expense
        paidByB += t.amount;
      } else if (t.split === "memberB" && t.payer === "joint") {
        // Joint account paid for Andrea's personal expense
        paidByA += t.amount;
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
