import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionBadge } from "@/components/VersionBadge";
import versionData from "../version.json";

describe("VersionBadge Component", () => {
  it("renders the current version from version.json", () => {
    render(<VersionBadge />);
    const badge = screen.getByTestId("version-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain(`v${versionData.version}`);
  });

  it("displays step details when showDetails is true", () => {
    render(<VersionBadge showDetails={true} />);
    const badge = screen.getByTestId("version-badge");
    expect(badge.textContent).toContain(`Paso ${versionData.conversation || 4}`);
  });
});
