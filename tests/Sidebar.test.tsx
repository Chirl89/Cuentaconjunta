import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { TransactionsProvider } from "@/context/TransactionsContext";
import versionData from "../version.json";

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
  it("renders brand and 3 distinct graph tabs without 'estilo fintonic'", () => {
    render(
      <TestWrapper>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </TestWrapper>
    );

    expect(screen.getAllByText(/Cuenta Conjunta/i).length).toBeGreaterThan(0);
    // User requested that 'estilo fintonic' disappears
    expect(screen.queryByText(/estilo fintonic/i)).not.toBeInTheDocument();

    expect(screen.getByText(/Gastos Conjuntos/i)).toBeInTheDocument();
    expect(screen.getByText(/Movimientos/i)).toBeInTheDocument();
  });

  it("displays couple names in read-only mode with NO edit inputs in sidebar", () => {
    render(
      <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Andrea" }}>
        <TransactionsProvider>
          <NavigationProvider>
            <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
          </NavigationProvider>
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getAllByText("Carlos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Andrea").length).toBeGreaterThan(0);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/editar/i)).not.toBeInTheDocument();
  });

  it("changes active tab when clicking navigation buttons including 3 graph views", () => {
    render(
      <TestWrapper>
        <SidebarWithNavigationTester />
      </TestWrapper>
    );

    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("resumen_conjunta");

    fireEvent.click(screen.getByText(/Gastos de Persona A/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("resumen_carlos");

    fireEvent.click(screen.getByText(/Gastos de Persona B/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("resumen_andrea");

    fireEvent.click(screen.getByText(/Movimientos/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("movimientos");

    fireEvent.click(screen.getByText(/Balances & Deuda/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("balances");
  });

  it("displays the VersionBadge with the current Paso", () => {
    render(
      <TestWrapper>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </TestWrapper>
    );

    expect(screen.getByTestId("version-badge")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Paso ${versionData.conversation || 5}`, "i"))).toBeInTheDocument();
  });
});
