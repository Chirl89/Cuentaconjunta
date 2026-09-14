import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";

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
      <UserNamesProvider>
        <NavigationProvider>
          <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
        </NavigationProvider>
      </UserNamesProvider>
    );

    expect(screen.getAllByText(/Cuenta Conjunta/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estilo Fintonic/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen Gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/Inbox de Triage/i)).toBeInTheDocument();
  });

  it("displays couple names in read-only mode with NO edit inputs", () => {
    render(
      <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Laura" }}>
        <NavigationProvider>
          <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
        </NavigationProvider>
      </UserNamesProvider>
    );

    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Laura")).toBeInTheDocument();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/editar/i)).not.toBeInTheDocument();
  });

  it("changes active tab when clicking navigation buttons", () => {
    render(
      <UserNamesProvider>
        <NavigationProvider>
          <SidebarWithNavigationTester />
        </NavigationProvider>
      </UserNamesProvider>
    );

    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("resumen");

    fireEvent.click(screen.getByText(/Inbox de Triage/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("inbox");

    fireEvent.click(screen.getByText(/Balances & Deuda/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("balances");

    fireEvent.click(screen.getByText(/Cuentas Bancarias/i));
    expect(screen.getByTestId("active-tab-indicator").textContent).toBe("cuentas");
  });

  it("displays the VersionBadge", () => {
    render(
      <UserNamesProvider>
        <NavigationProvider>
          <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
        </NavigationProvider>
      </UserNamesProvider>
    );

    expect(screen.getByTestId("version-badge")).toBeInTheDocument();
  });
});
