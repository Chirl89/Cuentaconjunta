import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  TransactionsProvider,
  useTransactions,
  calculateCategoryUsage,
  Transaction,
} from "@/context/TransactionsContext";
import { UserNamesProvider } from "@/context/UserNamesContext";

describe("Gestión de Conceptos & Cálculo de Tiempo Sin Uso", () => {
  describe("1. Función calculateCategoryUsage", () => {
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
  });

  describe("2. Acciones del Hook useTransactions (addCategory & deleteCategory)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserNamesProvider>
        <TransactionsProvider>{children}</TransactionsProvider>
      </UserNamesProvider>
    );

    it("allows adding a new custom concept with custom color", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      let addResult: { success: boolean; error?: string } = { success: false };
      act(() => {
        addResult = result.current.addCategory("Mascotas", "#14B8A6");
      });

      expect(addResult.success).toBe(true);
      expect(result.current.categories.some((c) => c.name === "Mascotas")).toBe(true);

      const created = result.current.categories.find((c) => c.name === "Mascotas");
      expect(created?.color).toBe("#14B8A6");
      expect(created?.isSystem).toBe(false);

      // Verify usage for newly added concept (no expenses yet)
      const usage = result.current.getCategoryUsageStatus("Mascotas");
      expect(usage.isUnused).toBe(true);
      expect(usage.unusedText).toBe("No usado en > 2 meses");
    });

    it("rejects duplicate category names (case-insensitive) or empty names", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      let resEmpty: { success: boolean; error?: string } = { success: false };
      act(() => {
        resEmpty = result.current.addCategory("   ");
      });
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain("no puede estar vacío");

      let resDuplicate: { success: boolean; error?: string } = { success: false };
      act(() => {
        resDuplicate = result.current.addCategory("supermercado");
      });
      expect(resDuplicate.success).toBe(false);
      expect(resDuplicate.error).toContain("Ya existe");
    });

    it("blocks deletion of system categories", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      let delRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        delRes = result.current.deleteCategory("Supermercado");
      });

      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain("sistema");
      expect(result.current.categories.some((c) => c.name === "Supermercado")).toBe(true);
    });

    it("blocks deletion of custom categories if they have transactions attached", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      act(() => {
        result.current.addCategory("Cursos Online", "#8B5CF6");
        result.current.addTransaction({
          merchant: "Udemy React",
          amount: 15,
          category: "Cursos Online",
          payer: "memberA",
          split: "50/50",
        });
      });

      let delRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        delRes = result.current.deleteCategory("Cursos Online");
      });

      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain("transacciones asociadas");
      expect(result.current.categories.some((c) => c.name === "Cursos Online")).toBe(true);
    });

    it("allows deleting custom category when no transactions are using it", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      act(() => {
        result.current.addCategory("Temporal", "#64748B");
      });
      expect(result.current.categories.some((c) => c.name === "Temporal")).toBe(true);

      let delRes: { success: boolean; error?: string } = { success: false };
      act(() => {
        delRes = result.current.deleteCategory("Temporal");
      });

      expect(delRes.success).toBe(true);
      expect(result.current.categories.some((c) => c.name === "Temporal")).toBe(false);
    });
  });
});
