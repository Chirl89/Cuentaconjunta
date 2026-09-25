import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TransactionsProvider, useTransactions } from "../src/context/TransactionsContext";
import { UserNamesProvider } from "../src/context/UserNamesContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserNamesProvider>
    <TransactionsProvider>{children}</TransactionsProvider>
  </UserNamesProvider>
);

describe("Revolut Incomes/Expenses & Reglas de Autoasignación Sólo Categorías en Triaje", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("carga extracto de Revolut con ingresos (positivos) y gastos (negativos) correctamente", () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });

    act(() => {
      result.current.importBankMovements([
        {
          id: "rev-exp-1",
          concept: "Mercadona Supermercado",
          amount: 32.5,
          date: "20/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut",
          ownership: "USER_A",
          isCredit: false,
        },
        {
          id: "rev-inc-1",
          concept: "Top-Up Recarga Carlos",
          amount: 500.0,
          date: "21/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut",
          ownership: "USER_A",
          isCredit: true,
        },
      ]);
    });

    const expenseTx = result.current.transactions.find((t) => t.id === "rev-exp-1");
    const incomeTx = result.current.transactions.find((t) => t.id === "rev-inc-1");

    expect(expenseTx).toBeDefined();
    expect(incomeTx).toBeDefined();

    // El gasto debe ser isCredit: false, movementType: "expense", y estar en triaje (pending)
    expect(expenseTx?.isCredit).toBe(false);
    expect(expenseTx?.movementType).toBe("expense");
    expect(expenseTx?.status).toBe("pending");
    expect(result.current.allPendingTransactions.some((t) => t.id === "rev-exp-1")).toBe(true);

    // El ingreso debe ser isCredit: true, classified, y NO estar en triaje de gastos
    expect(incomeTx?.isCredit).toBe(true);
    expect(incomeTx?.status).toBe("classified");
    expect(incomeTx?.category).toBe("Ingreso / Nómina");
    expect(result.current.allPendingTransactions.some((t) => t.id === "rev-inc-1")).toBe(false);
    expect(result.current.memberAIncomeTransactions.some((t) => t.id === "rev-inc-1")).toBe(true);
  });

  it("las reglas de autoasignación sólo aplican categoría por defecto y dejan el movimiento en triaje", () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });

    // 1. Creamos una regla para Mercadona que define categoría "Supermercado"
    act(() => {
      result.current.addRule({
        name: "Compras Mercadona",
        pattern: "Mercadona",
        assignTo: "JOINT",
        splitRatio: 0.5,
        categoryName: "Supermercado",
        isActive: true,
      });
    });

    // 2. Importamos una compra en Mercadona
    act(() => {
      result.current.importBankMovements([
        {
          id: "tx-mercadona-1",
          concept: "MERCADONA RONDA DE VALENCIA",
          amount: 64.2,
          date: "15/09/2026",
          monthKey: "2026-09",
          bankName: "Bankinter",
          accountLabel: "Tarjeta VISA",
          ownership: "USER_A",
          isCredit: false,
        },
      ]);
    });

    const mercadonaTx = result.current.transactions.find((t) => t.id === "tx-mercadona-1");
    expect(mercadonaTx).toBeDefined();

    // Debe tener la categoría "Supermercado" asignada por la regla
    expect(mercadonaTx?.category).toBe("Supermercado");
    expect(mercadonaTx?.autoAssignedRuleId).toBeDefined();

    // PERO su estado debe seguir siendo "pending" para estar en la bandeja de triaje
    // y no preasignar Carlos, Andrea o 50/50 como final
    expect(mercadonaTx?.status).toBe("pending");
    expect(result.current.allPendingTransactions.some((t) => t.id === "tx-mercadona-1")).toBe(true);

    // El usuario puede ahora clasificarlo fácilmente a 1 click (por ej. a Carlos 100% o 50/50)
    act(() => {
      result.current.classifyTransaction("tx-mercadona-1", "memberA");
    });

    const classifiedTx = result.current.transactions.find((t) => t.id === "tx-mercadona-1");
    expect(classifiedTx?.status).toBe("classified");
    expect(classifiedTx?.split).toBe("memberA");
    expect(classifiedTx?.category).toBe("Supermercado");
  });

  it("deleteMovementsByBank elimina todos los movimientos del banco especificado sin afectar al resto", () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });

    act(() => {
      result.current.importBankMovements([
        {
          id: "bk-1",
          concept: "Compra Bankinter",
          amount: 50.0,
          date: "10/09/2026",
          monthKey: "2026-09",
          bankName: "Bankinter",
          accountLabel: "Tarjeta Bankinter",
        },
        {
          id: "rev-1",
          concept: "Compra Revolut 1",
          amount: 25.0,
          date: "11/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut",
        },
        {
          id: "rev-2",
          concept: "Compra Revolut 2",
          amount: 15.0,
          date: "12/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut",
        },
      ]);
    });

    expect(result.current.transactions.some((t) => t.id === "rev-1")).toBe(true);
    expect(result.current.transactions.some((t) => t.id === "rev-2")).toBe(true);
    expect(result.current.transactions.some((t) => t.id === "bk-1")).toBe(true);

    // Borramos los movimientos de Revolut
    act(() => {
      const deleted = result.current.deleteMovementsByBank("revolut");
      expect(deleted).toBe(2);
    });

    // Ningún movimiento de Revolut debe quedar, el de Bankinter permanece
    expect(result.current.transactions.some((t) => t.id === "rev-1")).toBe(false);
    expect(result.current.transactions.some((t) => t.id === "rev-2")).toBe(false);
    expect(result.current.transactions.some((t) => t.id === "bk-1")).toBe(true);
  });

  it("elimina todos los movimientos de Revolut INCLUSO los ya clasificados y asignados", () => {
    const { result } = renderHook(() => useTransactions(), { wrapper });

    act(() => {
      result.current.importBankMovements([
        {
          id: "rev-classified-1",
          concept: "Cena Restaurante Revolut",
          amount: 45.0,
          date: "14/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut",
        },
        {
          id: "rev-pending-2",
          concept: "Farmacia Revolut",
          amount: 18.2,
          date: "15/09/2026",
          monthKey: "2026-09",
          bankName: "Revolut",
          accountLabel: "Tarjeta Revolut *8821",
        },
        {
          id: "bk-stay-1",
          concept: "Luz Bankinter",
          amount: 60.0,
          date: "16/09/2026",
          monthKey: "2026-09",
          bankName: "Bankinter",
          accountLabel: "Tarjeta VISA",
        },
      ]);
    });

    // Clasificamos el primer movimiento de Revolut a Carlos (memberA)
    act(() => {
      result.current.classifyTransaction("rev-classified-1", "memberA", "50/50", "Restaurantes", "#F59E0B");
    });

    const tx1 = result.current.transactions.find((t) => t.id === "rev-classified-1");
    expect(tx1?.status).toBe("classified");
    expect(result.current.classifiedTransactions.some((t) => t.id === "rev-classified-1")).toBe(true);

    // Ejecutamos el borrado total de movimientos de Revolut
    act(() => {
      const deleted = result.current.deleteMovementsByBank("revolut");
      expect(deleted).toBe(2);
    });

    // Comprobamos que ni el clasificado ni el pendiente de Revolut siguen existiendo
    expect(result.current.transactions.some((t) => t.id === "rev-classified-1")).toBe(false);
    expect(result.current.classifiedTransactions.some((t) => t.id === "rev-classified-1")).toBe(false);
    expect(result.current.transactions.some((t) => t.id === "rev-pending-2")).toBe(false);
    expect(result.current.allPendingTransactions.some((t) => t.id === "rev-pending-2")).toBe(false);

    // El movimiento de Bankinter permanece intacto
    expect(result.current.transactions.some((t) => t.id === "bk-stay-1")).toBe(true);
  });
});

