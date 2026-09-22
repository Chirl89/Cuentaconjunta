import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConnectBankModal from "../src/components/ConnectBankModal";
import { UserNamesProvider } from "../src/context/UserNamesContext";
import { AuthProvider } from "../src/context/AuthContext";
import { TransactionsProvider } from "../src/context/TransactionsContext";
import { detectCardDetails } from "../src/lib/bank/importer";

// Helper component to render modal with providers
function renderWithProviders(
  ui: React.ReactElement,
  activeRole: "memberA" | "memberB" = "memberA",
  names = { memberA: "Carlos", memberB: "Andrea" }
) {
  window.localStorage.setItem("fitduo_active_role", activeRole);

  return render(
    <AuthProvider>
      <UserNamesProvider initialNames={names}>
        <TransactionsProvider>
          {ui}
        </TransactionsProvider>
      </UserNamesProvider>
    </AuthProvider>
  );
}

describe("Paso 6: PSD2 para Cuentas Bancarias y Tarjetas con Reconocimiento Inteligente", () => {
  it("detectCardDetails helper detects bank, card name, and last 4 digits accurately", () => {
    const rawBankinter = "Número de tarjeta: VISA CLÁSICA (....3080)\n15/09/2026;Mercadona;-45,00";
    const resBkt = detectCardDetails(rawBankinter);
    expect(resBkt.detectedBank).toBe("Bankinter");
    expect(resBkt.detectedDigits).toBe("3080");
    expect(resBkt.detectedCardName).toBe("Tarjeta VISA Clásica");
    expect(resBkt.detectedMask).toBe("VISA **** 3080");

    const rawBBVA = "Tarjeta Débito BBVA **** 9912\n10/09/2026,Gasolinera,50.0";
    const resBBVA = detectCardDetails(rawBBVA);
    expect(resBBVA.detectedBank).toBe("BBVA");
    expect(resBBVA.detectedDigits).toBe("9912");
  });

  it("renders PSD2 catalog mode for bank accounts by default", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="catalog"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    expect(screen.getByText("Conectar Cuenta Bancaria (PSD2)")).toBeDefined();
    expect(screen.getByText("Cuentas Bancarias (PSD2)")).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar banco/i)).toBeDefined();
  });

  it("recognizes existing card from statement and assigns movements directly to that card", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="card"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    expect(screen.getByText("Tarjetas & Carga de Extracto CSV")).toBeDefined();

    // Paste statement matching existing test card (Santander **** 2104)
    const textarea = screen.getByPlaceholderText(/Tarjeta: VISA CLÁSICA/i);
    fireEvent.change(textarea, {
      target: {
        value: "Tarjeta: Santander (**** 2104)\n15/09/2026;MERCADONA;-45,50\n12/09/2026;REPSOL;-30,00",
      },
    });

    // Verify recognition feedback appears
    expect(screen.getByText(/Reconocida tarjeta existente/i)).toBeDefined();
    expect(screen.getByText(/Vista previa/i)).toBeDefined();

    // Click button to incorporate movements to this card
    const importBtn = screen.getByRole("button", { name: /Incorporar 2 Movimientos a esta Tarjeta/i });
    fireEvent.click(importBtn);

    // Should not create a new card since it was recognized, directly incorporated into existing card
    expect(onAccountsConnected).not.toHaveBeenCalled();
  });

  it("detects new card (first time) and defaults ownership to active user (Carlos)", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="card"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberA"
    );

    // Paste statement for a brand new BBVA card (digits 9876 not in test accounts)
    const textarea = screen.getByPlaceholderText(/Tarjeta: VISA CLÁSICA/i);
    fireEvent.change(textarea, {
      target: {
        value: "Tarjeta BBVA Oro (**** 9876)\n14/09/2026;ZARA MADRID;-89,90\n11/09/2026;RESTAURANTE;-42,00",
      },
    });

    // Recognition message indicates first time detected and assigned to Carlos
    expect(screen.getByText(/Primera vez que se detecta esta tarjeta/i)).toBeDefined();
    expect(screen.getAllByText(/Carlos/i).length).toBeGreaterThanOrEqual(1);

    // Click button to incorporate movements to the new card
    const importBtn = screen.getByRole("button", { name: /Incorporar 2 Movimientos a la Nueva Tarjeta/i });
    fireEvent.click(importBtn);

    // Verify new card account created with USER_A ownership!
    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const newCard = onAccountsConnected.mock.calls[0][0][0];
    expect(newCard.ownership).toBe("USER_A");
    expect(newCard.bankName).toBe("BBVA");
    expect(newCard.ibanMask).toContain("9876");
  });

  it("detects new card and assigns ownership to JOINT when marked as conjunta", () => {
    const onAccountsConnected = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ConnectBankModal
        isOpen={true}
        initialMode="card"
        onClose={onClose}
        onAccountsConnected={onAccountsConnected}
      />,
      "memberB" // Andrea is active
    );

    const textarea = screen.getByPlaceholderText(/Tarjeta: VISA CLÁSICA/i);
    fireEvent.change(textarea, {
      target: {
        value: "Tarjeta Sabadell (**** 5544)\n10/09/2026;ALCAMPO;-60,00",
      },
    });

    // Click Conjunta button
    const jointBtn = screen.getByRole("button", { name: /Conjunta/i });
    fireEvent.click(jointBtn);

    const importBtn = screen.getByRole("button", { name: /Incorporar 1 Movimientos a la Nueva Tarjeta/i });
    fireEvent.click(importBtn);

    expect(onAccountsConnected).toHaveBeenCalledTimes(1);
    const newCard = onAccountsConnected.mock.calls[0][0][0];
    expect(newCard.ownership).toBe("JOINT");
  });
});
