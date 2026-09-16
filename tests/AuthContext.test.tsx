import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CoupleLinkingCard } from "@/components/CoupleLinkingCard";
import { UserNamesProvider } from "@/context/UserNamesContext";

const AuthTester = () => {
  const {
    household,
    activeRole,
    switchActiveRole,
    generateNewInviteCode,
    updateHouseholdNames,
    joinHouseholdByCode,
    isDemoMode,
  } = useAuth();

  return (
    <div>
      <span data-testid="role-indicator">{activeRole}</span>
      <span data-testid="household-name">{household.name}</span>
      <span data-testid="member-a">{household.memberAName}</span>
      <span data-testid="member-b">{household.memberBName}</span>
      <span data-testid="invite-code">{household.inviteCode}</span>
      <span data-testid="demo-mode">{isDemoMode ? "demo" : "cloud"}</span>

      <button onClick={() => switchActiveRole("memberB")} data-testid="btn-role-b">
        Actuar como B
      </button>
      <button onClick={() => switchActiveRole("memberA")} data-testid="btn-role-a">
        Actuar como A
      </button>
      <button onClick={() => generateNewInviteCode()} data-testid="btn-new-code">
        Nuevo Código
      </button>
      <button onClick={() => updateHouseholdNames("David", "Sara")} data-testid="btn-update-names">
        Actualizar Nombres
      </button>
      <button onClick={() => joinHouseholdByCode("JOIN99")} data-testid="btn-join-code">
        Unirse
      </button>
    </div>
  );
};

describe("Paso 4: Multi-User Authentication & Couple Household Linking (Headless / Sin Interfaz de Credenciales)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("1. AuthContext & Active Role State Management", () => {
    it("initializes with memberA as default active role in local/demo mode", async () => {
      render(
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("role-indicator").textContent).toBe("memberA");
      });
      expect(screen.getByTestId("demo-mode").textContent).toBe("demo");
      expect(screen.getByTestId("invite-code").textContent).toBeTruthy();
    });

    it("switches active role between memberA and memberB reactively", async () => {
      render(
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("role-indicator").textContent).toBe("memberA");
      });

      fireEvent.click(screen.getByTestId("btn-role-b"));
      expect(screen.getByTestId("role-indicator").textContent).toBe("memberB");

      fireEvent.click(screen.getByTestId("btn-role-a"));
      expect(screen.getByTestId("role-indicator").textContent).toBe("memberA");
    });

    it("generates a new 6-character invite code for the household", async () => {
      render(
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("invite-code").textContent).toBeTruthy();
      });

      const originalCode = screen.getByTestId("invite-code").textContent;
      fireEvent.click(screen.getByTestId("btn-new-code"));
      const newCode = screen.getByTestId("invite-code").textContent;

      expect(newCode).toHaveLength(6);
      expect(newCode).not.toBe(originalCode);
    });

    it("updates household member names and persists them", async () => {
      render(
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("member-a").textContent).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("btn-update-names"));

      await waitFor(() => {
        expect(screen.getByTestId("member-a").textContent).toBe("David");
        expect(screen.getByTestId("member-b").textContent).toBe("Sara");
      });
    });

    it("joins a household using an invite code", async () => {
      render(
        <AuthProvider>
          <AuthTester />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("invite-code").textContent).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("btn-join-code"));

      await waitFor(() => {
        expect(screen.getByTestId("invite-code").textContent).toBe("JOIN99");
      });
    });
  });

  describe("2. CoupleLinkingCard UI Component (Zero-Friction, Headless Sync)", () => {
    it("renders household status, both partner cards, and invite code without any credentials UI", async () => {
      render(
        <AuthProvider>
          <UserNamesProvider>
            <CoupleLinkingCard onToast={() => {}} />
          </UserNamesProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Código de Invitación del Hogar/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Unirme al Hogar de mi Pareja/i)).toBeInTheDocument();
      expect(screen.getByText(/Perfil Activo en este Dispositivo/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Sincronización en segundo plano activa • Sin necesidad de credenciales/i)
      ).toBeInTheDocument();

      // Ensure no login buttons, password fields or credential inputs exist in the UI
      expect(screen.queryByText(/Acceder con Supabase/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Iniciar Sesión/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/contraseña/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/tu-email/i)).not.toBeInTheDocument();
    });

    it("allows switching active partner profile in 1 click", async () => {
      render(
        <AuthProvider>
          <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Andrea" }}>
            <CoupleLinkingCard onToast={() => {}} />
          </UserNamesProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
        expect(screen.getByText("Andrea")).toBeInTheDocument();
      });

      // Initially Carlos (Member A) is active
      expect(screen.getByText(/Tú \(Activo\)/i)).toBeInTheDocument();

      // Click on Andrea's card to switch
      fireEvent.click(screen.getByText("Andrea"));

      // Now Andrea has the active tag
      await waitFor(() => {
        expect(screen.getByText(/Miembro B \(Acento Azul\)/i)).toBeInTheDocument();
      });
    });
  });
});
