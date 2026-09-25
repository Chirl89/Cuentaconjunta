import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SygisLogo } from "@/components/SygisLogo";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { VersionBadge } from "@/components/VersionBadge";
import { UserNamesProvider } from "@/context/UserNamesContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { TransactionsProvider } from "@/context/TransactionsContext";
import versionData from "../version.json";

describe("Sygis Brand & Visual Identity", () => {
  it("renders SygisLogo with El Eclipse Financiero specifications", () => {
    const { container } = render(<SygisLogo size={48} variant="dark" />);
    
    // Check SVG presence
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("width")).toBe("48");
    expect(svg?.getAttribute("height")).toBe("48");

    // Check color definitions in SVG gradients or stops (#0D1B2A, #00F5D4, #E0E1DD)
    const svgHtml = container.innerHTML;
    expect(svgHtml).toContain("#0D1B2A");
    expect(svgHtml).toContain("#00F5D4");
    expect(svgHtml).toContain("#E0E1DD");

    // Check that at least 3 circles exist for the 3 celestial bodies
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders Sygis branding in Sidebar", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <NavigationProvider>
            <Sidebar isMobileOpen={false} setIsMobileOpen={() => {}} />
          </NavigationProvider>
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getByText("Sygis")).toBeInTheDocument();
    expect(screen.getByText("Finanzas Compartidas")).toBeInTheDocument();
    // Does not say FitDuo
    expect(screen.queryByText(/FitDuo/i)).not.toBeInTheDocument();
  });

  it("renders Sygis branding in Header", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <NavigationProvider>
            <Header onOpenMobileMenu={() => {}} onOpenSyncModal={() => {}} onOpenAddExpenseModal={() => {}} />
          </NavigationProvider>
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getAllByText("Sygis").length).toBeGreaterThan(0);
  });

  it("renders VersionBadge with current version v0.11.10", () => {
    render(<VersionBadge />);
    expect(screen.getByText(`v${versionData.version}`)).toBeInTheDocument();
    expect(versionData.version).toBe("0.11.10");
  });

  it("renders mobile Header with Sync button and without version badge or profile switcher", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <NavigationProvider>
            <Header onOpenMobileMenu={() => {}} onOpenSyncModal={() => {}} />
          </NavigationProvider>
        </TransactionsProvider>
      </UserNamesProvider>
    );

    // Sync button is present
    expect(screen.getByText("Sync")).toBeInTheDocument();

    // VersionBadge is not rendered in mobile Header
    expect(screen.queryByTestId("version-badge")).not.toBeInTheDocument();
  });
});
