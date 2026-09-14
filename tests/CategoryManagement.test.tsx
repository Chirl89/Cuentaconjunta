import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  TransactionsProvider,
  useTransactions,
  calculateCategoryUsage,
  getCategoryMonthlyHistory,
  getCategoryFrequencyGroup,
  CATEGORY_COLOR_PALETTE,
  Transaction,
} from "@/context/TransactionsContext";
import { UserNamesProvider } from "@/context/UserNamesContext";

describe("Paso 3 Iteración 2: Gestión de Categorías, Desglose 12 Meses & Preservación de Fechas", () => {
  describe("1. Función calculateCategoryUsage & getCategoryMonthlyHistory", () => {
    const baseTx: Transaction = {
      id: "tx-test-1",
      merchant: "Test Merchant",
      date: "01 Sep",
      monthKey: "2026-09",
      amount: 50,
      category: "Supermercado",
      categoryColor: "#00D09C",
      accountLabel: "Cuenta",
      status: "classified",
      payer: "memberA",
      split: "50/50",
    };

    it("should report NOT unused if category was used in the current month (2026-09)", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Supermercado", monthKey: "2026-09" }];
      const usage = calculateCategoryUsage("Supermercado", txs, "2026-09");
      expect(usage.isUnused).toBe(false);
      expect(usage.unusedText).toBeNull();
    });

    it("should report NOT unused if category was used in the previous month (2026-08)", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Hogar", monthKey: "2026-08" }];
      const usage = calculateCategoryUsage("Hogar", txs, "2026-09");
      expect(usage.isUnused).toBe(false);
      expect(usage.unusedText).toBeNull();
    });

    it("should report 'No usado en 2 meses' if last transaction was in 2026-07", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Viajes", monthKey: "2026-07" }];
      const usage = calculateCategoryUsage("Viajes", txs, "2026-09");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en 2 meses");
    });

    it("should report 'No usado en 4 meses' if last transaction was in 2026-05", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Muebles", monthKey: "2026-05" }];
      const usage = calculateCategoryUsage("Muebles", txs, "2026-09");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en 4 meses");
    });

    it("should report 'No usado en 1 año' if last transaction was in 2025-09 (12 months ago)", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Seguros", monthKey: "2025-09" }];
      const usage = calculateCategoryUsage("Seguros", txs, "2026-09");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en 1 año");
    });

    it("should report 'No usado en > 2 meses' if category has never had any transaction", () => {
      const txs: Transaction[] = [{ ...baseTx, category: "Supermercado", monthKey: "2026-09" }];
      const usage = calculateCategoryUsage("Mascotas", txs, "2026-09");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en > 2 meses");
    });

    it("should return a 12-month historical breakdown with exact amounts for each month", () => {
      const testTxs: Transaction[] = [
        { ...baseTx, category: "Supermercado", amount: 300, monthKey: "2026-09" },
        { ...baseTx, category: "Supermercado", amount: 700, monthKey: "2026-08" },
        { ...baseTx, category: "Supermercado", amount: 150, monthKey: "2026-05" },
      ];

      const history = getCategoryMonthlyHistory("Supermercado", testTxs, "2026-09", 12);
      expect(history.length).toBe(12);

      // Month 0: Este mes (Sep 2026) -> 300€
      expect(history[0].monthKey).toBe("2026-09");
      expect(history[0].amount).toBe(300);
      expect(history[0].label).toContain("Este mes");

      // Month 1: El mes pasado (Ago 2026) -> 700€
      expect(history[1].monthKey).toBe("2026-08");
      expect(history[1].amount).toBe(700);
      expect(history[1].label).toContain("El mes pasado");

      // Month 4: May 2026 -> 150€
      expect(history[4].monthKey).toBe("2026-05");
      expect(history[4].amount).toBe(150);

      // Months without spending should be 0€
      expect(history[2].monthKey).toBe("2026-07");
      expect(history[2].amount).toBe(0);
    });
  });

  describe("2. Acciones del Hook useTransactions (Añadir y Eliminar Categorías)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserNamesProvider>
        <TransactionsProvider>{children}</TransactionsProvider>
      </UserNamesProvider>
    );

    it("allows adding a new category with custom color", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      let addResult: { success: boolean; error?: string } = { success: false };
      act(() => {
        addResult = result.current.addCategory("Mascotas", "#14B8A6");
      });

      expect(addResult.success).toBe(true);
      expect(result.current.categories.some((c) => c.name === "Mascotas")).toBe(true);

      const created = result.current.categories.find((c) => c.name === "Mascotas");
      expect(created?.color).toBe("#14B8A6");

      const usage = result.current.getCategoryUsageStatus("Mascotas");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en > 2 meses");
    });

    it("allows deleting ANY category and safely reassigns existing transactions to fallback", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // Add custom category and a transaction using it
      act(() => {
        result.current.addCategory("Veterinario", "#EC4899");
        result.current.addTransaction({
          merchant: "Clínica Animal",
          amount: 60,
          category: "Veterinario",
          payer: "memberA",
          split: "50/50",
        });
      });

      expect(result.current.categories.some((c) => c.name === "Veterinario")).toBe(true);
      expect(result.current.transactions.some((t) => t.category === "Veterinario")).toBe(true);

      // Delete the category - must succeed without being blocked!
      let delRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        delRes = result.current.deleteCategory("Veterinario");
      });

      expect(delRes.success).toBe(true);
      expect(result.current.categories.some((c) => c.name === "Veterinario")).toBe(false);

      // Transaction was NOT deleted or corrupted; it was cleanly reassigned to fallback category
      const reassignedTx = result.current.transactions.find((t) => t.merchant === "Clínica Animal");
      expect(reassignedTx).toBeDefined();
      expect(reassignedTx?.category).not.toBe("Veterinario");
    });
  });

  describe("3. Preservación Estricta de Fechas (La fecha de la transacción manda)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserNamesProvider>
        <TransactionsProvider>{children}</TransactionsProvider>
      </UserNamesProvider>
    );

    it("guarantees that a pending transaction from August classified while in September remains strictly in August", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // Add a simulated pending transaction from August (e.g. imported from bank feed)
      act(() => {
        result.current.setSelectedMonth("2026-09");
      });

      // tx-8 is in August 2026 (INITIAL_TRANSACTIONS has tx-8 in 2026-08)
      // Let's verify INITIAL_TRANSACTIONS has tx-1 (in Sep) and tx-8 (in Ago)
      const txAugust = result.current.transactions.find((t) => t.monthKey === "2026-08");
      expect(txAugust).toBeDefined();
      expect(txAugust?.monthKey).toBe("2026-08");

      // Now classify that transaction while current view is September
      act(() => {
        result.current.classifyTransaction(txAugust!.id, "50/50");
      });

      const updatedTx = result.current.transactions.find((t) => t.id === txAugust!.id);
      expect(updatedTx?.status).toBe("classified");
      // CRITICAL INVARIANT: monthKey MUST NOT change to 2026-09!
      expect(updatedTx?.monthKey).toBe("2026-08");
      expect(updatedTx?.date).toBe(txAugust?.date);
    });
  });

  describe("4. Paleta de 20 Colores Únicos, Edición Dinámica y Agrupación por Frecuencia", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserNamesProvider>
        <TransactionsProvider>{children}</TransactionsProvider>
      </UserNamesProvider>
    );

    it("has a palette of exactly 20 distinct, unique colors", () => {
      expect(CATEGORY_COLOR_PALETTE).toHaveLength(20);
      const uniqueColors = new Set(CATEGORY_COLOR_PALETTE.map((c) => c.toUpperCase()));
      expect(uniqueColors.size).toBe(20);
    });

    it("allows dynamically editing a category's color and immediately updates its transactions", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      const targetCategory = "Supermercado";
      const newColor = "#D946EF"; // Fuchsia, not in initial categories

      let updateRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        updateRes = result.current.updateCategoryColor(targetCategory, newColor);
      });

      expect(updateRes.success).toBe(true);
      const catObj = result.current.categories.find((c) => c.name === targetCategory);
      expect(catObj?.color).toBe(newColor);

      // Existing transactions of that category reflect the updated color
      const catTxs = result.current.transactions.filter((t) => t.category === targetCategory);
      expect(catTxs.length).toBeGreaterThan(0);
      for (const t of catTxs) {
        expect(t.categoryColor).toBe(newColor);
      }
    });

    it("prevents assigning a color that is already in use by another category", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // Hogar & Luz has #0EA5E9
      const usedColor = result.current.categories.find((c) => c.name === "Hogar & Luz")!.color;

      let updateRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        updateRes = result.current.updateCategoryColor("Restaurantes & Ocio", usedColor);
      });

      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain("en uso");
    });

    it("immediately frees up the old color when a category color is changed", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // Get current color of Restaurantes & Ocio
      const oldColor = result.current.categories.find((c) => c.name === "Restaurantes & Ocio")!.color;

      // Change Restaurantes to another unused color
      act(() => {
        result.current.updateCategoryColor("Restaurantes & Ocio", "#84CC16"); // Lime
      });

      // Now oldColor is free! We can add a new category with that freed oldColor
      let addRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        addRes = result.current.addCategory("Nueva Categ", oldColor);
      });

      expect(addRes.success).toBe(true);
      const newCat = result.current.categories.find((c) => c.name === "Nueva Categ");
      expect(newCat?.color).toBe(oldColor);
    });

    it("correctly segments categories into the 3 frequency groups (Frecuentes, Menos Frecuentes, Rara Vez)", () => {
      const baseTx: Transaction = {
        id: "test-tx",
        merchant: "Test",
        date: "01 Sep",
        monthKey: "2026-09",
        amount: 100,
        category: "TestCat",
        categoryColor: "#00D09C",
        accountLabel: "Cuenta",
        status: "classified",
        payer: "memberA",
        split: "50/50",
      };

      // 1. Used in reference month (2026-09) -> 'frequent'
      const txs1: Transaction[] = [{ ...baseTx, category: "Cat1", monthKey: "2026-09" }];
      expect(getCategoryFrequencyGroup("Cat1", txs1, "2026-09")).toBe("frequent");

      // 2. Used in previous month (2026-08) -> 'frequent'
      const txs2: Transaction[] = [{ ...baseTx, category: "Cat2", monthKey: "2026-08" }];
      expect(getCategoryFrequencyGroup("Cat2", txs2, "2026-09")).toBe("frequent");

      // 3. Used in month -2 (2026-07) -> 'less_frequent'
      const txs3: Transaction[] = [{ ...baseTx, category: "Cat3", monthKey: "2026-07" }];
      expect(getCategoryFrequencyGroup("Cat3", txs3, "2026-09")).toBe("less_frequent");

      // 4. Used > 3 months ago (2026-06) -> 'rare'
      const txs4: Transaction[] = [{ ...baseTx, category: "Cat4", monthKey: "2026-06" }];
      expect(getCategoryFrequencyGroup("Cat4", txs4, "2026-09")).toBe("rare");

      // 5. Never used -> 'rare'
      expect(getCategoryFrequencyGroup("UnusedCat", [], "2026-09")).toBe("rare");
    });
  });
});
