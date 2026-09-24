import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IncomeExpenseBars from "../src/components/IncomeExpenseBars";
import CategoryPieTooltip from "../src/components/CategoryPieTooltip";
import { NavigationProvider, useNavigation } from "../src/context/NavigationContext";

describe("IncomeExpenseBars Component", () => {
  it("renders two horizontal bars with values inside", () => {
    render(
      <IncomeExpenseBars
        totalIncome={2500}
        totalExpenses={1200}
        incomeLabel="Total Ingresos"
        expenseLabel="Total Gastos"
        title="Diferencia de Ingresos vs Gastos"
      />
    );

    // Verify title and difference
    expect(screen.getByText("Diferencia de Ingresos vs Gastos")).toBeInTheDocument();
    expect(screen.getByTestId("difference-badge")).toHaveTextContent("Diferencia: +1300.00 €");
    expect(screen.getByText(/52% ahorro/)).toBeInTheDocument();

    // Verify values appear inside the bars
    const incomeBar = screen.getByTestId("bar-income");
    const expenseBar = screen.getByTestId("bar-expense");

    expect(incomeBar).toHaveTextContent("Total Ingresos: 2500.00 €");
    expect(expenseBar).toHaveTextContent("Total Gastos: 1200.00 €");

    // Income is larger, so income bar width is 100%
    expect(incomeBar.style.width).toBe("100%");
    // Expense is 1200 / 2500 = 48%
    expect(expenseBar.style.width).toBe("48%");
  });

  it("scales correctly when expenses exceed income (deficit)", () => {
    render(
      <IncomeExpenseBars
        totalIncome={1000}
        totalExpenses={2000}
        incomeLabel="Total Ingresos"
        expenseLabel="Total Gastos"
      />
    );

    expect(screen.getByTestId("difference-badge")).toHaveTextContent("Diferencia: -1000.00 €");

    const incomeBar = screen.getByTestId("bar-income");
    const expenseBar = screen.getByTestId("bar-expense");

    expect(incomeBar).toHaveTextContent("Total Ingresos: 1000.00 €");
    expect(expenseBar).toHaveTextContent("Total Gastos: 2000.00 €");

    // Expenses is larger, so expense bar width is 100%
    expect(expenseBar.style.width).toBe("100%");
    // Income is 1000 / 2000 = 50%
    expect(incomeBar.style.width).toBe("50%");
  });

  it("handles zero values cleanly", () => {
    render(
      <IncomeExpenseBars
        totalIncome={0}
        totalExpenses={0}
        incomeLabel="Total Ingresos"
        expenseLabel="Total Gastos"
      />
    );

    expect(screen.getByText("Total Ingresos: 0,00 €")).toBeInTheDocument();
    expect(screen.getByText("Total Gastos: 0,00 €")).toBeInTheDocument();
  });
});

describe("CategoryPieTooltip Component", () => {
  it("renders category name and amount formatted when active", () => {
    render(
      <CategoryPieTooltip
        active={true}
        payload={[
          {
            name: "Supermercado",
            value: 145.8,
            payload: {
              name: "Supermercado",
              value: 145.8,
              color: "#00D09C",
            },
          },
        ]}
      />
    );

    const tooltip = screen.getByTestId("category-pie-tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(screen.getByText("Supermercado:")).toBeInTheDocument();
    expect(screen.getByText("145.80 €")).toBeInTheDocument();
  });

  it("returns null when inactive", () => {
    const { container } = render(
      <CategoryPieTooltip active={false} payload={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("NavigationContext with resumen_mensual", () => {
  it("allows selecting resumen_mensual tab", () => {
    const TestConsumer = () => {
      const { activeTab, setActiveTab } = useNavigation();
      return (
        <div>
          <span data-testid="current-tab">{activeTab}</span>
          <button onClick={() => setActiveTab("resumen_mensual")}>Go Resumen</button>
        </div>
      );
    };

    render(
      <NavigationProvider>
        <TestConsumer />
      </NavigationProvider>
    );

    const btn = screen.getByText("Go Resumen");
    fireEvent.click(btn);
    expect(screen.getByTestId("current-tab")).toHaveTextContent("resumen_mensual");
  });
});
