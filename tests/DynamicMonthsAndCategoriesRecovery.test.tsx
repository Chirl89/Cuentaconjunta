import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  computeAvailableMonths,
  formatMonthLabel,
  getPreviousMonthKey,
  reconcileCategoriesWithTransactions,
  areCategoriesEqual,
  CATEGORIES_LIST,
  AVAILABLE_MONTHS,
  TransactionsProvider,
  useTransactions,
  Transaction,
} from "@/context/TransactionsContext";
import { classifyConcept } from "@/lib/categorization/classifier";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { MonthSelector } from "@/components/MonthSelector";

describe("Dynamic Months and Category Recovery Fix (v0.13.2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Dynamic Month Generation", () => {
    it("formats month keys to friendly Spanish labels", () => {
      expect(formatMonthLabel("2026-10")).toBe("Octubre 2026");
      expect(formatMonthLabel("2026-09")).toBe("Septiembre 2026");
      expect(formatMonthLabel("2026-08")).toBe("Agosto 2026");
      expect(formatMonthLabel("2026-01")).toBe("Enero 2026");
      expect(formatMonthLabel("2027-03")).toBe("Marzo 2027");
    });

    it("calculates previous month key generically across year boundaries", () => {
      expect(getPreviousMonthKey("2026-10")).toBe("2026-09");
      expect(getPreviousMonthKey("2026-09")).toBe("2026-08");
      expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
      expect(getPreviousMonthKey("2027-01")).toBe("2026-12");
    });

    it("includes October 2026 and any transaction months dynamically", () => {
      const mockTxs: Partial<Transaction>[] = [
        { id: "tx-oct", monthKey: "2026-10", amount: 50, category: "Supermercado" } as Transaction,
        { id: "tx-nov", monthKey: "2026-11", amount: 30, category: "Hogar & Luz" } as Transaction,
      ];

      const months = computeAvailableMonths(mockTxs as Transaction[]);
      const keys = months.map((m) => m.key);

      expect(keys).toContain("2026-10");
      expect(keys).toContain("2026-11");
      expect(keys).toContain("2026-09");
      expect(keys).toContain("2026-08");

      // Verify descending sort order
      for (let i = 0; i < months.length - 1; i++) {
        expect(months[i].key > months[i + 1].key).toBe(true);
      }
    });

    it("AVAILABLE_MONTHS includes current year and month dynamically", () => {
      expect(AVAILABLE_MONTHS.length).toBeGreaterThanOrEqual(6);
      const keys = AVAILABLE_MONTHS.map((m) => m.key);
      expect(keys).toContain("2026-10");
    });
  });

  describe("Category Recovery and Lotería Recognition", () => {
    it("includes Lotería in base CATEGORIES_LIST", () => {
      const loteria = CATEGORIES_LIST.find((c) => c.name.toLowerCase() === "lotería");
      expect(loteria).toBeDefined();
      expect(loteria?.color).toBe("#D97706");
    });

    it("classifies lottery merchants to Lotería automatically", () => {
      const res1 = classifyConcept("SELAE LOTERIA PRIMITIVA");
      expect(res1.category).toBe("Lotería");

      const res2 = classifyConcept("ADMINISTRACION LOTERIA 12 MADRID");
      expect(res2.category).toBe("Lotería");

      const res3 = classifyConcept("EUROMILLONES ONLAE");
      expect(res3.category).toBe("Lotería");

      const res4 = classifyConcept("APUESTAS DEL ESTADO");
      expect(res4.category).toBe("Lotería");
    });

    it("auto-discovers and recovers custom categories from transactions", () => {
      const txsWithCustom: Partial<Transaction>[] = [
        { id: "1", category: "Lotería", categoryColor: "#D97706", amount: 20 } as Transaction,
        { id: "2", category: "Gimnasio & CrossFit", categoryColor: "#6366F1", amount: 50 } as Transaction,
      ];

      const recovered = reconcileCategoriesWithTransactions([], txsWithCustom as Transaction[]);
      const names = recovered.map((c) => c.name);

      expect(names).toContain("Lotería");
      expect(names).toContain("Gimnasio & CrossFit");

      const gymCat = recovered.find((c) => c.name === "Gimnasio & CrossFit");
      expect(gymCat?.color).toBe("#6366F1");
    });

    it("areCategoriesEqual detects identity and differences accurately", () => {
      const a = [{ name: "A", color: "#111", isSystem: false }];
      const b = [{ name: "A", color: "#111", isSystem: false }];
      const c = [{ name: "A", color: "#222", isSystem: false }];
      const d = [{ name: "B", color: "#111", isSystem: false }];

      expect(areCategoriesEqual(a, b)).toBe(true);
      expect(areCategoriesEqual(a, c)).toBe(false);
      expect(areCategoriesEqual(a, d)).toBe(false);
    });
  });

  describe("MonthSelector Component Integration", () => {
    const TestConsumer = () => {
      const { selectedMonth, setSelectedMonth, availableMonths } = useTransactions();
      return (
        <div>
          <MonthSelector />
          <div data-testid="current-selected">{selectedMonth}</div>
          <div data-testid="months-count">{availableMonths.length}</div>
          <button data-testid="btn-select-oct" onClick={() => setSelectedMonth("2026-10")}>
            Select Oct
          </button>
        </div>
      );
    };

    it("renders dynamic month list and allows navigation to October", () => {
      render(
        <UserNamesProvider>
          <TransactionsProvider>
            <TestConsumer />
          </TransactionsProvider>
        </UserNamesProvider>
      );

      // Verify months-count is at least 6
      const count = Number(screen.getByTestId("months-count").textContent);
      expect(count).toBeGreaterThanOrEqual(6);

      // Can select October
      fireEvent.click(screen.getByTestId("btn-select-oct"));
      expect(screen.getByTestId("current-selected").textContent).toBe("2026-10");
      expect(screen.getAllByText("Octubre 2026").length).toBeGreaterThanOrEqual(1);
    });
  });
});
