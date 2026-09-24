import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { TransactionsProvider, useTransactions } from "@/context/TransactionsContext";
import Home from "@/app/page";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { ProfileSecurityProvider } from "@/context/ProfileSecurityContext";

const TestCardHolderAssignment = () => {
  const {
    allPendingTransactions,
    classifiedTransactions,
    assignAllPendingToCardHolder,
    importBankMovements,
  } = useTransactions();

  return (
    <div>
      <span data-testid="pending-count">{allPendingTransactions.length}</span>
      <span data-testid="classified-count">{classifiedTransactions.length}</span>
      <button
        data-testid="btn-import-mixed"
        onClick={() => {
          importBankMovements([
            {
              id: "card_carlos_1",
              concept: "Tienda Ropa Carlos",
              amount: 45.5,
              date: "10/09/2026",
              monthKey: "2026-09",
              accountLabel: "Tarjeta VISA Carlos",
              ownership: "USER_A",
            },
            {
              id: "card_andrea_1",
              concept: "Zapateria Andrea",
              amount: 89.9,
              date: "11/09/2026",
              monthKey: "2026-09",
              accountLabel: "Tarjeta VISA Andrea",
              ownership: "USER_B",
            },
            {
              id: "card_joint_1",
              concept: "Libreria Compartida",
              amount: 60.0,
              date: "12/09/2026",
              monthKey: "2026-09",
              accountLabel: "Tarjeta Conjunta Compartida",
              ownership: "JOINT",
            },
          ]);
        }}
      >
        Import Mixed
      </button>

      <button
        data-testid="btn-assign-all"
        onClick={() => {
          assignAllPendingToCardHolder();
        }}
      >
        Asignar bandeja de triaje al titular
      </button>
    </div>
  );
};

const SettingsTabTester = () => {
  const { setActiveTab } = useNavigation();
  React.useEffect(() => {
    setActiveTab("ajustes");
  }, [setActiveTab]);

  return <Home />;
};

describe("Asignar bandeja de triaje al titular", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("assigns movements to card holders correctly and leaves triage inbox empty", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestCardHolderAssignment />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    // Initial pending from mock dataset
    const initialPending = Number(screen.getByTestId("pending-count").textContent);

    // Import 3 new movements with different card ownerships
    act(() => {
      fireEvent.click(screen.getByTestId("btn-import-mixed"));
    });

    const newPending = Number(screen.getByTestId("pending-count").textContent);
    expect(newPending).toBe(initialPending + 3);

    // Execute bulk assignment
    act(() => {
      fireEvent.click(screen.getByTestId("btn-assign-all"));
    });

    // Pending count must now be exactly 0 (empty triage inbox!)
    expect(screen.getByTestId("pending-count").textContent).toBe("0");
  });

  it("renders the button 'Asignar bandeja de triaje al titular' in settings and can execute it", async () => {
    render(
      <AuthProvider>
        <UserNamesProvider>
          <NavigationProvider>
            <ProfileSecurityProvider>
              <TransactionsProvider>
                <SettingsTabTester />
              </TransactionsProvider>
            </ProfileSecurityProvider>
          </NavigationProvider>
        </UserNamesProvider>
      </AuthProvider>
    );

    // Check if the section and button exist
    const assignBtn = screen.getByRole("button", {
      name: /Asignar bandeja de triaje al titular/i,
    });
    expect(assignBtn).toBeInTheDocument();

    // Click it to assign all pending triage movements
    act(() => {
      fireEvent.click(assignBtn);
    });

    // Button should now be disabled because pending count is 0
    expect(assignBtn).toBeDisabled();
    expect(screen.getByText(/movimiento\(s\) de triaje asignados al titular/i)).toBeInTheDocument();
    expect(screen.getByText(/Movimientos pendientes en triaje:/i)).toBeInTheDocument();
  });
});
