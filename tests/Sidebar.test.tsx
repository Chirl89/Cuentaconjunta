import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { UserNamesProvider } from "@/context/UserNamesContext";

describe("Sidebar Component", () => {
  it("renders brand and navigation items with Fintonic branding", () => {
    render(
      <UserNamesProvider>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </UserNamesProvider>
    );

    expect(screen.getAllByText(/Cuenta Conjunta/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Fintonic Edition/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen Gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/Inbox de Triage/i)).toBeInTheDocument();
  });

  it("displays couple names in read-only mode with NO edit inputs", () => {
    render(
      <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Laura" }}>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </UserNamesProvider>
    );

    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Laura")).toBeInTheDocument();

    // Verify there are NO edit input fields or edit buttons
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/editar/i)).not.toBeInTheDocument();
  });

  it("displays the VersionBadge", () => {
    render(
      <UserNamesProvider>
        <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
      </UserNamesProvider>
    );

    expect(screen.getByTestId("version-badge")).toBeInTheDocument();
  });
});
