import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { TransactionsProvider, useTransactions } from "@/context/TransactionsContext";
import { isCardBillingStatement, runCategorizationPipeline } from "@/lib/categorization";

const TestReciboVisaComponent = () => {
  const {
    transactions,
    allPendingTransactions,
    classifiedTransactions,
    totalSpent,
    totalJointSpent,
    importBankMovements,
    rules,
  } = useTransactions();

  const reciboTx = transactions.find((t) => t.merchant.includes("Recibo VISA"));

  return (
    <div>
      <span data-testid="pending-count">{allPendingTransactions.length}</span>
      <span data-testid="classified-count">{classifiedTransactions.length}</span>
      <span data-testid="total-spent">{totalSpent}</span>
      <span data-testid="total-joint-spent">{totalJointSpent}</span>
      <span data-testid="recibo-split">{reciboTx?.split || "none"}</span>
      <span data-testid="recibo-category">{reciboTx?.category || "none"}</span>
      <span data-testid="rules-count">{rules.length}</span>

      <button
        data-testid="btn-import-recibo"
        onClick={() => {
          importBankMovements([
            {
              id: "bank_stmt_recibo_visa_1",
              concept: "Recibo VISA CLASICA",
              amount: 540.25,
              date: "05/09/2026",
              monthKey: "2026-09",
              accountLabel: "Cuenta Bankinter",
              ownership: "JOINT",
            },
          ]);
        }}
      >
        Import Recibo VISA
      </button>
    </div>
  );
};

describe("Recibo VISA CLASICA - No Contabilizado por Defecto", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isCardBillingStatement correctly identifies card statement debits", () => {
    expect(isCardBillingStatement("Recibo VISA CLASICA")).toBe(true);
    expect(isCardBillingStatement("RECIBO VISA")).toBe(true);
    expect(isCardBillingStatement("recibo tarjeta")).toBe(true);
    expect(isCardBillingStatement("Cargo Tarjeta Visa")).toBe(true);
    expect(isCardBillingStatement("Liquidación Tarjeta")).toBe(true);

    expect(isCardBillingStatement("Mercadona")).toBe(false);
    expect(isCardBillingStatement("Gasolinera Repsol")).toBe(false);
    expect(isCardBillingStatement("Restaurante Casa Pepe")).toBe(false);
  });

  it("runCategorizationPipeline classifies Recibo VISA as ignored by default", () => {
    const res = runCategorizationPipeline({
      merchant: "Recibo VISA CLASICA",
      amount: 450.0,
      accountLabel: "Cuenta Corriente",
    });

    expect(res.split).toBe("ignored");
    expect(res.category).toBe("Liquidación / Neteo");
  });

  it("imports Recibo VISA CLASICA as ignored, avoids double counting and triage inbox", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestReciboVisaComponent />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialPending = Number(screen.getByTestId("pending-count").textContent);
    const initialTotalSpent = Number(screen.getByTestId("total-spent").textContent);

    // Import the bank statement charge "Recibo VISA CLASICA"
    act(() => {
      fireEvent.click(screen.getByTestId("btn-import-recibo"));
    });

    // Should NOT go to pending / triage inbox
    expect(Number(screen.getByTestId("pending-count").textContent)).toBe(initialPending);

    // Should be classified as ignored
    expect(screen.getByTestId("recibo-split").textContent).toBe("ignored");
    expect(screen.getByTestId("recibo-category").textContent).toBe("Liquidación / Neteo");

    // Total spent should NOT have increased by 540.25 (avoids duplicate counting!)
    expect(Number(screen.getByTestId("total-spent").textContent)).toBe(initialTotalSpent);
  });
});
