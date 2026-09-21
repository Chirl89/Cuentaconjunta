import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConnectBankModal from "../src/components/ConnectBankModal";
import { UserNamesProvider } from "../src/context/UserNamesContext";
import { AuthProvider } from "../src/context/AuthContext";
import { TransactionsProvider, useTransactions } from "../src/context/TransactionsContext";

// Helper component to render modal with providers
function renderWithProviders(
  ui: React.ReactElement,
  activeRole: "memberA" | "memberB" = "memberA",
  names = { memberA: "Carlos", memberB: "Andrea" }
) {
  // Mock localStorage for role
  window.localStorage.setItem("fitduo_active_role", activeRole);

  return render(
    <AuthProvider>
      <UserNamesProvider initialNames={names}>
        <TransactionsProvider>
          {ui}
        </TransactionsProvider>
      </UserNamesProvider>
    </AuthProvider>
  );
}

describe("Paso 6: Añadir Cuentas y Tarjetas con Titularidad por Defecto (FitDuo)", () => {
  it("defaults account ownership to memberA (Carlos) when memberA is active", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="account"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    // Verify modal rendered in account mode
    expect(screen.getByText("Añadir Nueva Cuenta Bancaria")).toBeDefined();
    // Default explanation shows assigned to Carlos
    expect(screen.getAllByText(/Carlos/i).length).toBeGreaterThanOrEqual(1);

    // Submit form with default ownership
    const submitBtn = screen.getByRole("button", { name: /Guardar Cuenta Bancaria/i });
    fireEvent.click(submitBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const savedAccount = onAccountsConnected.mock.calls[0][0][0];
    expect(savedAccount.bankName).toBe("Bankinter");
    expect(savedAccount.ownership).toBe("USER_A");
  });

  it("defaults account ownership to memberB (Andrea) when memberB is active", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="account"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberB"
    );

    const submitBtn = screen.getByRole("button", { name: /Guardar Cuenta Bancaria/i });
    fireEvent.click(submitBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const savedAccount = onAccountsConnected.mock.calls[0][0][0];
    expect(savedAccount.ownership).toBe("USER_B");
  });

  it("assigns account ownership to JOINT when marked as cuenta conjunta", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="account"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    // Toggle the 'Es la cuenta conjunta' checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole("button", { name: /Guardar Cuenta Bancaria/i });
    fireEvent.click(submitBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const savedAccount = onAccountsConnected.mock.calls[0][0][0];
    expect(savedAccount.ownership).toBe("JOINT");
  });

  it("defaults card ownership to active user unless marked as tarjeta conjunta", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="card"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    expect(screen.getByText("Añadir Nueva Tarjeta")).toBeDefined();

    // 1. Submit as default owner (USER_A)
    const submitBtn = screen.getByRole("button", { name: /Guardar Tarjeta/i });
    fireEvent.click(submitBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const savedCard = onAccountsConnected.mock.calls[0][0][0];
    expect(savedCard.accountName).toContain("Tarjeta VISA");
    expect(savedCard.ownership).toBe("USER_A");

    // 2. Mark as tarjeta conjunta
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.click(submitBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(2);
    const savedJointCard = onAccountsConnected.mock.calls[1][0][0];
    expect(savedJointCard.ownership).toBe("JOINT");
  });

  it("addConnectedAccounts prevents collisions and does not overwrite accounts of the same bank with different names", () => {
    function ConsumerComponent() {
      const { accounts, addConnectedAccounts } = useTransactions();
      return (
        <div>
          <span data-testid="accounts-count">{accounts.length}</span>
          <button
            data-testid="btn-add-acc"
            onClick={() =>
              addConnectedAccounts([
                {
                  id: "bankinter_checking",
                  bankName: "Bankinter",
                  accountName: "Cuenta Corriente Nómina",
                  ibanMask: "ES91 •••• 1111",
                  ownership: "USER_A",
                  balance: 2000,
                  status: "active",
                },
              ])
            }
          >
            Add Checking
          </button>
          <button
            data-testid="btn-add-card"
            onClick={() =>
              addConnectedAccounts([
                {
                  id: "bankinter_card",
                  bankName: "Bankinter",
                  accountName: "Tarjeta VISA Clásica",
                  ibanMask: "VISA **** 3080",
                  ownership: "USER_A",
                  balance: 0,
                  status: "active",
                },
              ])
            }
          >
            Add Card
          </button>
          <ul>
            {accounts.map((a) => (
              <li key={a.id} data-testid={`acc-${a.id}`}>
                {a.accountName} - {a.ownership}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    render(
      <AuthProvider>
        <UserNamesProvider>
          <TransactionsProvider>
            <ConsumerComponent />
          </TransactionsProvider>
        </UserNamesProvider>
      </AuthProvider>
    );

    // Initially accounts exist (default bankinter checking)
    const initialCount = parseInt(screen.getByTestId("accounts-count").textContent || "0", 10);

    // Add checking
    fireEvent.click(screen.getByTestId("btn-add-acc"));
    // Add card
    fireEvent.click(screen.getByTestId("btn-add-card"));

    // Both should exist without one replacing the other
    expect(screen.getByTestId("acc-bankinter_checking")).toBeDefined();
    expect(screen.getByTestId("acc-bankinter_card")).toBeDefined();
  });
});
