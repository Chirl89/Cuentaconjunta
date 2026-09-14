import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { UserNamesProvider, useUserNames } from "@/context/UserNamesContext";

const TestComponent = () => {
  const { memberAName, memberBName, setMemberAName, setMemberBName, resetNames } = useUserNames();

  return (
    <div>
      <span data-testid="name-a">{memberAName}</span>
      <span data-testid="name-b">{memberBName}</span>
      <button onClick={() => setMemberAName("Carlos")} data-testid="btn-set-a">
        Set A
      </button>
      <button onClick={() => setMemberBName("Laura")} data-testid="btn-set-b">
        Set B
      </button>
      <button onClick={() => resetNames()} data-testid="btn-reset">
        Reset
      </button>
    </div>
  );
};

describe("UserNamesContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default names 'Persona A' and 'Persona B'", () => {
    render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    expect(screen.getByTestId("name-a").textContent).toBe("Persona A");
    expect(screen.getByTestId("name-b").textContent).toBe("Persona B");
  });

  it("updates names reactively when setMemberAName and setMemberBName are called", () => {
    render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    fireEvent.click(screen.getByTestId("btn-set-a"));
    expect(screen.getByTestId("name-a").textContent).toBe("Carlos");

    fireEvent.click(screen.getByTestId("btn-set-b"));
    expect(screen.getByTestId("name-b").textContent).toBe("Laura");
  });

  it("persists names to localStorage and restores them", () => {
    const { unmount } = render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    fireEvent.click(screen.getByTestId("btn-set-a"));
    fireEvent.click(screen.getByTestId("btn-set-b"));

    const stored = JSON.parse(localStorage.getItem("fitduo_user_names") || "{}");
    expect(stored.memberA).toBe("Carlos");
    expect(stored.memberB).toBe("Laura");

    unmount();

    // Render again in new provider, should hydrate from localStorage
    render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    expect(screen.getByTestId("name-a").textContent).toBe("Carlos");
    expect(screen.getByTestId("name-b").textContent).toBe("Laura");
  });

  it("synchronizes names across windows via BroadcastChannel", async () => {
    render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    // Simulate message from another tab/window
    const bc = new BroadcastChannel("fitduo_names_sync");
    act(() => {
      bc.postMessage({ memberA: "Alex", memberB: "Sam" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("name-a").textContent).toBe("Alex");
      expect(screen.getByTestId("name-b").textContent).toBe("Sam");
    });
    bc.close();
  });

  it("resets to defaults when resetNames is called", () => {
    render(
      <UserNamesProvider>
        <TestComponent />
      </UserNamesProvider>
    );

    fireEvent.click(screen.getByTestId("btn-set-a"));
    fireEvent.click(screen.getByTestId("btn-set-b"));
    expect(screen.getByTestId("name-a").textContent).toBe("Carlos");

    fireEvent.click(screen.getByTestId("btn-reset"));
    expect(screen.getByTestId("name-a").textContent).toBe("Persona A");
    expect(screen.getByTestId("name-b").textContent).toBe("Persona B");
  });
});
