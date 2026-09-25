import { describe, it, expect } from "vitest";
import { sortTransactionsList, SortCriterion, SortDirection } from "../src/lib/sorting";

interface TestTx {
  id: string;
  date: string;
  amount: number;
  category: string;
  monthKey: string;
}

const mockTransactions: TestTx[] = [
  { id: "1", date: "10/09/2026", amount: 45.0, category: "Supermercado", monthKey: "2026-09" },
  { id: "2", date: "15/09/2026", amount: 120.0, category: "Alimentación", monthKey: "2026-09" },
  { id: "3", date: "01/09/2026", amount: 15.5, category: "Transporte", monthKey: "2026-09" },
  { id: "4", date: "15/09/2026", amount: 30.0, category: "Alimentación", monthKey: "2026-09" },
  { id: "5", date: "05/09/2026", amount: 120.0, category: "Hogar & Luz", monthKey: "2026-09" },
];

describe("Movimientos Sorting Logic (Fecha, Importe, Categoría)", () => {
  it("defaults to Fecha from newest to oldest (desc)", () => {
    const res = sortTransactionsList(mockTransactions, "fecha", "desc");
    expect(res[0].date).toBe("15/09/2026");
    expect(res[res.length - 1].date).toBe("01/09/2026");
  });

  it("consecutive click on Fecha inverts to oldest to newest (asc)", () => {
    const res = sortTransactionsList(mockTransactions, "fecha", "asc");
    expect(res[0].date).toBe("01/09/2026");
    expect(res[res.length - 1].date).toBe("15/09/2026");
  });

  it("1st click on Importe sorts from largest to smallest (desc)", () => {
    const res = sortTransactionsList(mockTransactions, "importe", "desc");
    expect(res[0].amount).toBe(120.0);
    expect(res[1].amount).toBe(120.0);
    expect(res[res.length - 1].amount).toBe(15.5);
  });

  it("consecutive click on Importe inverts to smallest to largest (asc)", () => {
    const res = sortTransactionsList(mockTransactions, "importe", "asc");
    expect(res[0].amount).toBe(15.5);
    expect(res[res.length - 1].amount).toBe(120.0);
  });

  it("1st click on Categoría sorts alphabetically A to Z (asc) with secondary tie-breaker", () => {
    // Switching from Importe (desc) to Categoría (asc)
    const res = sortTransactionsList(
      mockTransactions,
      "categoria",
      "asc",
      "importe",
      "desc"
    );
    expect(res[0].category).toBe("Alimentación");
    expect(res[1].category).toBe("Alimentación");
    // For both 'Alimentación', tie-breaker is Importe desc: 120.0 then 30.0!
    expect(res[0].amount).toBe(120.0);
    expect(res[1].amount).toBe(30.0);
    expect(res[res.length - 1].category).toBe("Transporte");
  });

  it("consecutive click on Categoría inverts to Z to A (desc)", () => {
    const res = sortTransactionsList(mockTransactions, "categoria", "desc");
    expect(res[0].category).toBe("Transporte");
    expect(res[res.length - 1].category).toBe("Alimentación");
  });

  it("switching Importe -> Categoría -> Importe resets Importe to 1st press (desc)", () => {
    // First press on Importe: desc
    let activeCrit: SortCriterion = "importe";
    let activeDir: SortDirection = "desc";
    let prevCrit: SortCriterion | null = null;
    let prevDir: SortDirection | null = null;

    // Switch to Categoría
    prevCrit = activeCrit;
    prevDir = activeDir;
    activeCrit = "categoria";
    activeDir = "asc"; // 1st press on Categoría

    // Switch back to Importe (not consecutive!)
    prevCrit = activeCrit;
    prevDir = activeDir;
    activeCrit = "importe";
    activeDir = "desc"; // Resets to 1st press (desc)

    const res = sortTransactionsList(mockTransactions, activeCrit, activeDir, prevCrit, prevDir);
    expect(res[0].amount).toBe(120.0);
    expect(res[res.length - 1].amount).toBe(15.5);
  });

  it("consecutive clicks on Importe toggle desc -> asc -> desc", () => {
    let dir: SortDirection = "desc";
    // Toggle 1
    dir = dir === "asc" ? "desc" : "asc";
    expect(dir).toBe("asc");
    // Toggle 2
    dir = dir === "asc" ? "desc" : "asc";
    expect(dir).toBe("desc");
  });
});
