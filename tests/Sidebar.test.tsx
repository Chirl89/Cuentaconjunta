import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { TransactionsProvider } from "@/context/TransactionsContext";

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserNamesProvider>
    <TransactionsProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </TransactionsProvider>
  </UserNamesProvider>
);

const SidebarWithNavigationTester = () => {
  const { activeTab } = useNavigation();
  return (
    <div>
      <span data-testid="active-tab-indicator">{activeTab}</span>
      <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
    </div>
  );
};

describe("Sidebar Component", () => {
  it("renders brand and navigation items with Fintonic branding", () => {
    render(
      <TestWrapper>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </TestWrapper>
    );

    expect(screen.getAllByText(/Cuenta Conjunta/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estilo Fintonic/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen Gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/Movimientos/i)).toBeInTheDocument();
  });

  it("displays couple names in read-only mode with NO edit inputs", () => {
    render(
      <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Laura" }}>
        <TransactionsProvider>
          <NavigationProvider>
            <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
          </NavigationProvider>
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Laura")).toBeInTheDocument();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/editar/i)).not.toBeInTheDocument();
  });

  it("changes active tab when clicking navigation buttons including Movimientos", () => {
    render(
      <TestWrapper>
        <SidebarWithNavigationTester />
      </TestWrapper>
    );

    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("resumen");

    fireEvent.click(screen.getByText(/Movimientos/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("movimientos");

    fireEvent.click(screen.getByText(/Balances & Deuda/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("balances");

    fireEvent.click(screen.getByText(/Cuentas Bancarias/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("cuentas");
  });

  it("displays the VersionBadge", () => {
    render(
      <TestWrapper>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </TestWrapper>
    );

    expect(screen.getByTestId("version-badge")).toBeInTheDocument();
  });
});
