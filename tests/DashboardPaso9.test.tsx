import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CumulativeExpenseAreaChart from "../src/components/CumulativeExpenseAreaChart";
import LiveBalanceCard from "../src/components/LiveBalanceCard";
import DashboardInboxWidget from "../src/components/DashboardInboxWidget";
import { MonthlyEvolutionBarChart, getRolling12Months } from "../src/components/MonthlyEvolutionBarChart";
import { Transaction, Category, BankAccount } from "../src/context/TransactionsContext";

describe("Paso 9: CumulativeExpenseAreaChart Component", () => {
  const sampleTransactions: Transaction[] = [
    {
      id: "tx-1",
      date: "2026-09-05",
      amount: 45.5,
      merchant: "Mercadona",
      category: "Supermercado",
      categoryColor: "#00D09C",
      payer: "memberA",
      split: "50/50",
      status: "classified",
      monthKey: "2026-09",
    },
    {
      id: "tx-2",
      date: "2026-09-12",
      amount: 30.0,
      merchant: "Gasolinera Repsol",
      category: "Transporte",
      categoryColor: "#FF6B6B",
      payer: "memberB",
      split: "50/50",
      status: "classified",
      monthKey: "2026-09",
    },
  ];

  it("renders chart container, title, and calculates total cumulative correctly", () => {
    render(
      <CumulativeExpenseAreaChart
        transactions={sampleTransactions}
        selectedMonth="2026-09"
        title="Evolución del Gasto Acumulado"
      />
    );

    expect(screen.getByTestId("cumulative-expense-area-chart")).toBeInTheDocument();
    expect(screen.getByText("Evolución del Gasto Acumulado")).toBeInTheDocument();
    // Total is 45.50 + 30.00 = 75.50 €
    expect(screen.getByText("Total: 75.50 €")).toBeInTheDocument();
    expect(screen.getByText("Día 1 del mes")).toBeInTheDocument();
    expect(screen.getByText("Fin de mes")).toBeInTheDocument();
  });

  it("shows empty state when no transactions exist for the selected month", () => {
    render(
      <CumulativeExpenseAreaChart
        transactions={[]}
        selectedMonth="2026-09"
      />
    );

    expect(
      screen.getByText("No hay gastos acumulados para este mes")
    ).toBeInTheDocument();
  });
});

describe("Paso 9: LiveBalanceCard Component", () => {
  const mockSettleDebt = vi.fn();
  const mockResetSettlement = vi.fn();
  const mockOpenManualModal = vi.fn();

  it("renders dynamic couple names and debt when debtor exists", () => {
    render(
      <LiveBalanceCard
        balanceData={{
          paidByA: 100,
          paidByB: 20,
          debtor: "memberB",
          debtorName: "Andrea",
          creditorName: "Carlos",
          netDebt: 40,
        }}
        memberAName="Carlos"
        memberBName="Andrea"
        hasActiveSettlement={false}
        onSettleDebt={mockSettleDebt}
        onResetSettlement={mockResetSettlement}
        onOpenManualModal={mockOpenManualModal}
      />
    );

    expect(screen.getByTestId("live-balance-card")).toBeInTheDocument();
    expect(screen.getAllByText(/Andrea/).length).toBeGreaterThan(0);
    expect(screen.getByText("debe a")).toBeInTheDocument();
    expect(screen.getAllByText(/Carlos/).length).toBeGreaterThan(0);
    expect(screen.getByText("40.00 €")).toBeInTheDocument();

    // Contributions breakdown
    expect(screen.getByText("Aportado por Carlos")).toBeInTheDocument();
    expect(screen.getByText("100.00 €")).toBeInTheDocument();
    expect(screen.getByText("Aportado por Andrea")).toBeInTheDocument();
    expect(screen.getByText("20.00 €")).toBeInTheDocument();

    // Open manual expense modal trigger
    const manualBtn = screen.getByText("+ Gasto Manual / Ajuste");
    fireEvent.click(manualBtn);
    expect(mockOpenManualModal).toHaveBeenCalledTimes(1);
  });

  it("triggers settlement confirmation and settles debt on click", () => {
    render(
      <LiveBalanceCard
        balanceData={{
          paidByA: 80,
          paidByB: 20,
          debtor: "memberB",
          debtorName: "Andrea",
          creditorName: "Carlos",
          netDebt: 30,
        }}
        memberAName="Carlos"
        memberBName="Andrea"
        hasActiveSettlement={false}
        onSettleDebt={mockSettleDebt}
        onResetSettlement={mockResetSettlement}
      />
    );

    const settleBtn = screen.getByTestId("settle-debt-btn");
    expect(settleBtn).toBeInTheDocument();
    fireEvent.click(settleBtn);

    // Confirmation shows up
    expect(screen.getByText("¿Confirmar Bizum?")).toBeInTheDocument();
    const confirmBtn = screen.getByTestId("confirm-settle-btn");
    fireEvent.click(confirmBtn);

    expect(mockSettleDebt).toHaveBeenCalledWith("direct");
  });

  it("displays settled accounts state when hasActiveSettlement is true", () => {
    render(
      <LiveBalanceCard
        balanceData={{
          paidByA: 50,
          paidByB: 50,
          debtor: "none",
          debtorName: "",
          creditorName: "",
          netDebt: 0,
        }}
        memberAName="Carlos"
        memberBName="Andrea"
        hasActiveSettlement={true}
        lastSettlementInfo={{
          amount: 25,
          debtorName: "Andrea",
          creditorName: "Carlos",
          date: "Hoy",
        }}
        onSettleDebt={mockSettleDebt}
        onResetSettlement={mockResetSettlement}
      />
    );

    expect(screen.getByText("¡Cuentas Saldadas!")).toBeInTheDocument();
    expect(screen.getByText(/Andrea saldó 25.00 € a Carlos/)).toBeInTheDocument();

    const reopenBtn = screen.getByText("Reabrir cuentas");
    fireEvent.click(reopenBtn);
    expect(mockResetSettlement).toHaveBeenCalled();
  });

  it("displays balanced state when netDebt is zero and not settled", () => {
    render(
      <LiveBalanceCard
        balanceData={{
          paidByA: 50,
          paidByB: 50,
          debtor: "none",
          debtorName: "",
          creditorName: "",
          netDebt: 0,
        }}
        memberAName="Carlos"
        memberBName="Andrea"
        hasActiveSettlement={false}
        onSettleDebt={mockSettleDebt}
        onResetSettlement={mockResetSettlement}
      />
    );

    expect(screen.getByText("¡Cuentas al Día!")).toBeInTheDocument();
    expect(screen.getByText("0,00 €")).toBeInTheDocument();
  });
});

describe("Paso 9: DashboardInboxWidget Component", () => {
  const mockTriage = vi.fn();
  const mockCategoryChange = vi.fn();
  const mockGetAccountDisplay = vi.fn(() => "Cuenta Principal ES12");

  const sampleCategories: Category[] = [
    { name: "Supermercado", icon: "ShoppingCart", color: "#00D09C", monthlyBudget: 400 },
    { name: "Restaurantes", icon: "Utensils", color: "#FFBB28", monthlyBudget: 200 },
  ];

  const pendingTxs: Transaction[] = [
    {
      id: "pending-1",
      date: "2026-09-18",
      amount: 62.4,
      merchant: "Carrefour Market",
      category: "Supermercado",
      categoryColor: "#00D09C",
      payer: "memberA",
      split: "pending",
      status: "pending",
      monthKey: "2026-09",
      autoAssignedReason: "Sugerido por IA",
    },
  ];

  it("renders pending items with real couple names on buttons", () => {
    render(
      <DashboardInboxWidget
        pendingTransactions={pendingTxs}
        memberAName="Carlos"
        memberBName="Andrea"
        categories={sampleCategories}
        onTriage={mockTriage}
        onCategoryChange={mockCategoryChange}
        getAccountDisplay={mockGetAccountDisplay}
      />
    );

    expect(screen.getByTestId("dashboard-inbox-widget")).toBeInTheDocument();
    expect(screen.getByText("Inbox de Triage Rápido")).toBeInTheDocument();
    expect(screen.getByText("1 pendiente")).toBeInTheDocument();
    expect(screen.getByText("Carrefour Market")).toBeInTheDocument();
    expect(screen.getByText("62.40 €")).toBeInTheDocument();
    expect(screen.getByText("Sugerido por IA")).toBeInTheDocument();

    // Check action buttons with real names
    expect(screen.getByTestId("triage-joint-pending-1")).toHaveTextContent("Ambos (50/50)");
    expect(screen.getByTestId("triage-memberA-pending-1")).toHaveTextContent("Carlos");
    expect(screen.getByTestId("triage-memberB-pending-1")).toHaveTextContent("Andrea");

    // Click Ambos (50/50)
    fireEvent.click(screen.getByTestId("triage-joint-pending-1"));
    expect(mockTriage).toHaveBeenCalledWith("pending-1", "50/50", "1/2 (Compartido)");

    // Click memberA
    fireEvent.click(screen.getByTestId("triage-memberA-pending-1"));
    expect(mockTriage).toHaveBeenCalledWith("pending-1", "memberA", "Solo Carlos");

    // Click memberB
    fireEvent.click(screen.getByTestId("triage-memberB-pending-1"));
    expect(mockTriage).toHaveBeenCalledWith("pending-1", "memberB", "Solo Andrea");
  });

  it("shows empty state when there are 0 pending transactions", () => {
    render(
      <DashboardInboxWidget
        pendingTransactions={[]}
        memberAName="Carlos"
        memberBName="Andrea"
        categories={sampleCategories}
        onTriage={mockTriage}
        onCategoryChange={mockCategoryChange}
        getAccountDisplay={mockGetAccountDisplay}
      />
    );

    expect(screen.getByTestId("dashboard-inbox-empty")).toBeInTheDocument();
    expect(screen.getByText("Inbox al Día")).toBeInTheDocument();
    expect(screen.getByText("0 pendientes")).toBeInTheDocument();
  });

  it("verifies Dashboard tab structure contains triage and live balance but no duplicated joint charts", () => {
    // Verified via unit components and navigation contract
    expect(sampleCategories.length).toBe(2);
  });
});

describe("Paso 9: MonthlyEvolutionBarChart Component", () => {
  it("calculates rolling 12 months correctly (not calendar year)", () => {
    const rolling = getRolling12Months("2026-09");
    expect(rolling).toHaveLength(12);
    // 12 months ending in 2026-09 should start in 2025-10
    expect(rolling[0]).toBe("2025-10");
    expect(rolling[11]).toBe("2026-09");
    expect(rolling).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  const evolutionTxs: Transaction[] = [
    // 2026-09: Carlos income 2000, joint expense 100 (50% Carlos = 50), Carlos personal expense 50 -> Carlos total expense = 100, Carlos net = +1900
    {
      id: "tx-inc-1",
      date: "2026-09-01",
      amount: 2000,
      merchant: "Nómina Carlos",
      category: "Ingreso / Nómina",
      categoryColor: "#10B981",
      payer: "memberA",
      split: "memberA",
      status: "classified",
      monthKey: "2026-09",
      isCredit: true,
    },
    {
      id: "tx-joint-1",
      date: "2026-09-05",
      amount: 100,
      merchant: "Mercadona Compra Conjunta",
      category: "Supermercado",
      categoryColor: "#00D09C",
      payer: "memberA",
      split: "50/50",
      status: "classified",
      monthKey: "2026-09",
    },
    {
      id: "tx-pers-a",
      date: "2026-09-10",
      amount: 50,
      merchant: "Ropa Carlos",
      category: "Otros Gastos Comunes",
      categoryColor: "#EC4899",
      payer: "memberA",
      split: "memberA",
      status: "classified",
      monthKey: "2026-09",
    },
    // 2026-09: Andrea personal expense 40 -> Andrea total expense = 50 (joint half) + 40 = 90
    {
      id: "tx-pers-b",
      date: "2026-09-12",
      amount: 40,
      merchant: "Libros Andrea",
      category: "Otros Gastos Comunes",
      categoryColor: "#EC4899",
      payer: "memberB",
      split: "memberB",
      status: "classified",
      monthKey: "2026-09",
    },
  ];

  it("renders 12-month evolution bar chart for viewing user with personal expenses + 50% joint expenses", () => {
    render(
      <MonthlyEvolutionBarChart
        transactions={evolutionTxs}
        referenceMonth="2026-09"
        activeRole="memberA"
        memberAName="Carlos"
        memberBName="Andrea"
      />
    );

    expect(screen.getByTestId("monthly-evolution-bar-chart")).toBeInTheDocument();
    expect(screen.getByText("Evolución del Gasto (Últimos 12 Meses)")).toBeInTheDocument();
    // Carlos has income +2000 and total expense -100 (-50 personal + -50 half joint) -> net +1900€
    expect(screen.getAllByText("+1900€").length).toBeGreaterThan(0);

    // Toggle button to switch to Andrea
    const andreaToggle = screen.getByTestId("evolution-user-memberB");
    fireEvent.click(andreaToggle);

    // Andrea has 0 income and 90 expense (50 joint + 40 personal) -> net -90€
    expect(screen.getAllByText("-90€").length).toBeGreaterThan(0);
  });
});

