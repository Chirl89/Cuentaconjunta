import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { TransactionsProvider, useTransactions } from "@/context/TransactionsContext";

const TestComponent = () => {
  const {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    balanceData,
    classifyTransaction,
    reclassifyTransaction,
    updateTransactionCategory,
    categoriesBreakdown,
    selectedMonth,
    setSelectedMonth,
    totalSpent,
    pendingTransactions,
  } = useTransactions();

  return (
    <div>
      <span data-testid="month">{selectedMonth}</span>
      <span data-testid="debt">{balanceData.netDebt}</span>
      <span data-testid="debtor">{balanceData.debtor}</span>
      <span data-testid="total-spent">{totalSpent}</span>
      <span data-testid="pending-count">{pendingTransactions.length}</span>

      <button
        data-testid="btn-classify"
        onClick={() => classifyTransaction("tx-1", "50/50")}
      >
        Classify tx-1
      </button>

      <button
        data-testid="btn-reclassify"
        onClick={() => reclassifyTransaction("tx-3", "memberA")}
      >
        Reclassify tx-3
      </button>

      <span data-testid="tx3-cat">{categoriesBreakdown.find((c) => c.name === "Hogar & Luz")?.value || 0}</span>

      <button
        data-testid="btn-add-manual"
        onClick={() =>
          addTransaction({
            merchant: "Gasto Manual Test",
            amount: 20,
            category: "Supermercado",
            payer: "memberA",
            split: "50/50",
          })
        }
      >
        Add Manual
      </button>

      <button
        data-testid="btn-add-joint"
        onClick={() =>
          addTransaction({
            merchant: "Gasto Conjunta Test",
            amount: 40,
            category: "Supermercado",
            payer: "joint",
            split: "50/50",
          })
        }
      >
        Add Joint
      </button>

      <button
        data-testid="btn-update-tx3"
        onClick={() =>
          updateTransaction("tx-3", {
            merchant: "Restaurante Actualizado",
            amount: 100,
            category: "Restaurantes & Ocio",
            payer: "memberA",
            split: "50/50",
          })
        }
      >
        Update tx-3
      </button>

      <button
        data-testid="btn-delete-tx3"
        onClick={() => deleteTransaction("tx-3")}
      >
        Delete tx-3
      </button>
    </div>
  );
};

describe("TransactionsContext Dynamic Engine", () => {
  it("calculates initial debt and spent for current month", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getByTestId("month").textContent).toBe("2026-09");
    expect(Number(screen.getByTestId("debt").textContent)).toBeGreaterThan(0);
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(2);
  });

  it("dynamically recalculates debt and pending count when a transaction is classified", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialDebt = Number(screen.getByTestId("debt").textContent);
    const initialSpent = Number(screen.getByTestId("total-spent").textContent);

    fireEvent.click(screen.getByTestId("btn-classify"));

    // Pending count reduced by 1
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(1);

    // Total spent increased
    const newSpent = Number(screen.getByTestId("total-spent").textContent);
    expect(newSpent).toBeGreaterThan(initialSpent);

    // Net debt dynamically recalculated
    const newDebt = Number(screen.getByTestId("debt").textContent);
    expect(newDebt).not.toBe(initialDebt);
  });

  it("adds manual expense and recalculates balance immediately", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialSpent = Number(screen.getByTestId("total-spent").textContent);
    fireEvent.click(screen.getByTestId("btn-add-manual"));
    const newSpent = Number(screen.getByTestId("total-spent").textContent);

    expect(newSpent).toBe(initialSpent + 20);
  });

  it("supports adding an expense from joint account without altering debt", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialDebt = Number(screen.getByTestId("debt").textContent);
    const initialSpent = Number(screen.getByTestId("total-spent").textContent);

    fireEvent.click(screen.getByTestId("btn-add-joint"));

    // Spent increases by 40€
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent + 40);
    // Debt remains identical because joint funds were used
    expect(Number(screen.getByTestId("debt").textContent)).toBe(initialDebt);
  });

  it("updates an existing transaction and recalculates totals", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialSpent = Number(screen.getByTestId("total-spent").textContent);
    // tx-3 was 40€, updated to 100€ -> difference is +60€
    fireEvent.click(screen.getByTestId("btn-update-tx3"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent + 60);
  });

  it("deletes an existing transaction and recalculates totals", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialSpent = Number(screen.getByTestId("total-spent").textContent);
    // tx-3 is 40€ -> deleting it reduces total spent by 40€
    fireEvent.click(screen.getByTestId("btn-delete-tx3"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent - 40);
  });
});
