import { getTransactionSortTimestamp } from "@/context/TransactionsContext";

export type SortCriterion = "fecha" | "importe" | "categoria";
export type SortDirection = "asc" | "desc";

export function compareTransactions<
  T extends {
    date?: string;
    monthKey?: string;
    id?: string;
    createdAt?: number;
    bankMovementId?: string;
    amount: number;
    category?: string;
  }
>(a: T, b: T, criterion: SortCriterion, direction: SortDirection): number {
  if (criterion === "fecha") {
    const timeA = getTransactionSortTimestamp(a);
    const timeB = getTransactionSortTimestamp(b);
    return direction === "desc" ? timeB - timeA : timeA - timeB;
  }

  if (criterion === "importe") {
    const amtA = Math.abs(a.amount);
    const amtB = Math.abs(b.amount);
    return direction === "desc" ? amtB - amtA : amtA - amtB;
  }

  if (criterion === "categoria") {
    const catA = (a.category || "").toLowerCase().trim();
    const catB = (b.category || "").toLowerCase().trim();
    const comp = catA.localeCompare(catB, "es", { sensitivity: "base" });
    return direction === "asc" ? comp : -comp;
  }

  return 0;
}

export function sortTransactionsList<
  T extends {
    date?: string;
    monthKey?: string;
    id?: string;
    createdAt?: number;
    bankMovementId?: string;
    amount: number;
    category?: string;
  }
>(
  transactions: T[],
  criterion: SortCriterion,
  direction: SortDirection,
  prevCriterion?: SortCriterion | null,
  prevDirection?: SortDirection | null
): T[] {
  return [...transactions].sort((a, b) => {
    // 1. Criterio primario
    const primary = compareTransactions(a, b, criterion, direction);
    if (primary !== 0) return primary;

    // 2. Criterio secundario de desempate (el criterio inmediatamente anterior si es diferente)
    if (prevCriterion && prevDirection && prevCriterion !== criterion) {
      const secondary = compareTransactions(a, b, prevCriterion, prevDirection);
      if (secondary !== 0) return secondary;
    }

    // 3. Desempate determinista estable por fecha descendente y luego ID
    const timeA = getTransactionSortTimestamp(a);
    const timeB = getTransactionSortTimestamp(b);
    if (timeB !== timeA) return timeB - timeA;

    return (a.id || "").localeCompare(b.id || "");
  });
}
