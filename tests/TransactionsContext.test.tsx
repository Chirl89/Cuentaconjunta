import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    accounts,
    selectedMonth,
    totalSpent,
    pendingTransactions,
    classifiedTransactions,
    settleDebt,
    resetSettlement,
  } = useTransactions();

  const jointAccount = accounts.find((a) => a.ownership === "JOINT");

  return (
    <div>
      <span data-testid="month">{selectedMonth}</span>
      <span data-testid="debt">{balanceData.netDebt}</span>
      <span data-testid="debt-to-joint">{balanceData.netDebtToJoint}</span>
      <span data-testid="debtor">{balanceData.debtor}</span>
      <span data-testid="total-spent">{totalSpent}</span>
      <span data-testid="pending-count">{pendingTransactions.length}</span>
      <span data-testid="joint-balance">{jointAccount?.balance || 0}</span>
      <span data-testid="classified-count">{classifiedTransactions.length}</span>

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

      {/* Attempt to edit automated bank transaction tx-3 */}
      <button
        data-testid="btn-update-automated-tx3"
        onClick={() =>
          updateTransaction("tx-3", {
            merchant: "Intento Editar Banco",
            amount: 999,
            category: "Restaurantes & Ocio",
            payer: "memberB",
            split: "50/50",
          })
        }
      >
        Update Automated tx-3
      </button>

      {/* Attempt to delete automated bank transaction tx-3 */}
      <button
        data-testid="btn-delete-automated-tx3"
        onClick={() => deleteTransaction("tx-3")}
      >
        Delete Automated tx-3
      </button>

      {/* Add contribution to joint account */}
      <button
        data-testid="btn-transfer-to-joint"
        onClick={() =>
          addTransaction({
            merchant: "Aportación 100 Carlos",
            amount: 100,
            category: "Aportación Conjunta",
            payer: "memberA",
            split: "50/50",
            movementType: "transfer_to_joint",
          })
        }
      >
        Transfer 100 to Joint
      </button>

      {/* Helper to update first manual transaction */}
      <button
        data-testid="btn-update-first-manual"
        onClick={() => {
          const manual = classifiedTransactions.find((t) => t.isManual);
          if (manual) {
            updateTransaction(manual.id, {
              merchant: "Manual Editado",
              amount: 50,
              category: "Supermercado",
              payer: "memberA",
              split: "50/50",
            });
          }
        }}
      >
        Update First Manual
      </button>

      {/* Helper to delete first manual transaction */}
      <button
        data-testid="btn-delete-first-manual"
        onClick={() => {
          const manual = classifiedTransactions.find((t) => t.isManual);
          if (manual) {
            deleteTransaction(manual.id);
          }
        }}
      >
        Delete First Manual
      </button>
      {/* Add 100% personal purchase for partner */}
      <button
        data-testid="btn-add-for-andrea"
        onClick={() =>
          addTransaction({
            merchant: "Libro para Andrea",
            amount: 50,
            category: "Otros Gastos Comunes",
            payer: "memberA",
            split: "memberB",
          })
        }
      >
        Buy for Andrea 100%
      </button>

      {/* Settle debt button */}
      <button data-testid="btn-settle" onClick={() => settleDebt("direct")}>
        Settle Debt
      </button>
      <button data-testid="btn-reset-settle" onClick={() => resetSettlement()}>
        Reset Settle
      </button>
    </div>
  );
};

describe("TransactionsContext Dynamic Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });
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

  it("strictly prevents editing or deleting automated bank transactions", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialSpent = Number(screen.getByTestId("total-spent").textContent);
    const initialClassifiedCount = Number(screen.getByTestId("classified-count").textContent);

    // Attempting to edit tx-3 (bank movement) has NO effect
    fireEvent.click(screen.getByTestId("btn-update-automated-tx3"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent);

    // Attempting to delete tx-3 (bank movement) has NO effect
    fireEvent.click(screen.getByTestId("btn-delete-automated-tx3"));
    expect(Number(screen.getByTestId("classified-count").textContent)).toBe(initialClassifiedCount);
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent);
  });

  it("allows editing and deleting manual transactions", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialSpent = Number(screen.getByTestId("total-spent").textContent);
    const initialCount = Number(screen.getByTestId("classified-count").textContent);

    // 1. Add manual expense (+20€)
    fireEvent.click(screen.getByTestId("btn-add-manual"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent + 20);
    expect(Number(screen.getByTestId("classified-count").textContent)).toBe(initialCount + 1);

    // 2. Edit manual expense from 20€ to 50€ (+30€)
    fireEvent.click(screen.getByTestId("btn-update-first-manual"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent + 50);

    // 3. Delete manual expense
    fireEvent.click(screen.getByTestId("btn-delete-first-manual"));
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialSpent);
    expect(Number(screen.getByTestId("classified-count").textContent)).toBe(initialCount);
  });

  it("correctly handles contribution to joint account with dual net settlement options", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialJointBalance = Number(screen.getByTestId("joint-balance").textContent);

    // Carlos contributes 100€ to joint account
    fireEvent.click(screen.getByTestId("btn-transfer-to-joint"));

    // Joint account balance increases by 100€
    const newJointBalance = Number(screen.getByTestId("joint-balance").textContent);
    expect(newJointBalance).toBe(initialJointBalance + 100);

    // Dual net settlement: netDebtToJoint is exactly double netDebt
    const netDebt = Number(screen.getByTestId("debt").textContent);
    const netDebtToJoint = Number(screen.getByTestId("debt-to-joint").textContent);
    expect(netDebtToJoint).toBe(Math.round(netDebt * 2 * 100) / 100);
  });

  it("adds 100% debt when Carlos buys something exclusively for Andrea", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialDebt = Number(screen.getByTestId("debt").textContent);
    const initialDebtor = screen.getByTestId("debtor").textContent;

    // Carlos buys a 50€ item for Andrea (100% debt)
    fireEvent.click(screen.getByTestId("btn-add-for-andrea"));

    const newDebt = Number(screen.getByTestId("debt").textContent);
    const newDebtor = screen.getByTestId("debtor").textContent;

    // Since Carlos had credit, Andrea owes Carlos 50€ more!
    expect(newDebtor).toBe("memberB");
    expect(newDebt).toBe(initialDebt + 50);
  });

  it("settles debt to 0 when settlement is registered and can be undone", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialDebt = Number(screen.getByTestId("debt").textContent);
    expect(initialDebt).toBeGreaterThan(0);

    // Settle debt
    fireEvent.click(screen.getByTestId("btn-settle"));
    expect(Number(screen.getByTestId("debt").textContent)).toBe(0);
    expect(screen.getByTestId("debtor").textContent).toBe("none");

    // Reset/undo settlement
    fireEvent.click(screen.getByTestId("btn-reset-settle"));
    expect(Number(screen.getByTestId("debt").textContent)).toBe(initialDebt);
  });

  it("persists classified transactions and manual expenses across page reloads / remounts", () => {
    // 1. Initial mount
    const { unmount } = render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    // Initial state: 2 pending transactions
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(2);

    // Classify tx-1 and add a manual transaction
    fireEvent.click(screen.getByTestId("btn-classify"));
    fireEvent.click(screen.getByTestId("btn-add-manual"));

    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(1);
    const spentBeforeUnmount = Number(screen.getByTestId("total-spent").textContent);
    const classifiedBeforeUnmount = Number(screen.getByTestId("classified-count").textContent);

    // 2. Unmount (simulates navigating away or page unload)
    unmount();

    // 3. Remount (simulates page refresh F5)
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    // Verify all changes were rehydrated from localStorage!
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(1);
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(spentBeforeUnmount);
    expect(Number(screen.getByTestId("classified-count").textContent)).toBe(classifiedBeforeUnmount);
  });

  it("synchronizes transaction updates received from another tab or device via BroadcastChannel", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialPending = Number(screen.getByTestId("pending-count").textContent);
    expect(initialPending).toBe(2);

    // Simulate another device or tab classifying tx-1
    act(() => {
      const channel = new BroadcastChannel("cuentaconjunta_transactions_sync");
      channel.postMessage({
        type: "TRANSACTIONS_SYNC",
        inviteCode: "FITDUO",
        transactions: [
          {
            id: "tx-remote-1",
            merchant: "Compra Remota Pareja",
            date: "14 Sep",
            monthKey: "2026-09",
            amount: 75.0,
            category: "Supermercado",
            categoryColor: "#00D09C",
            accountLabel: "Santander Débito",
            status: "classified",
            payer: "memberA",
            split: "50/50",
            isManual: true,
          },
        ],
      });
      channel.close();
    });

    // Component immediately reflects the synchronized remote state without manual page refresh
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(0);
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(75.0);
    expect(Number(screen.getByTestId("classified-count").textContent)).toBe(1);
  });
});
