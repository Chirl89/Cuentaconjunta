import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { TransactionsProvider, useTransactions } from "@/context/TransactionsContext";

const TestComponent = () => {
  const {
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
        data-testid="btn-change-cat"
        onClick={() => updateTransactionCategory("tx-3", "Hogar & Luz")}
      >
        Change Cat tx-3
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

  it("updates category and recalculates category breakdown", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialHogarVal = Number(screen.getByTestId("tx3-cat").textContent);
    fireEvent.click(screen.getByTestId("btn-change-cat"));
    const newHogarVal = Number(screen.getByTestId("tx3-cat").textContent);

    expect(newHogarVal).toBeGreaterThan(initialHogarVal);
  });
});
