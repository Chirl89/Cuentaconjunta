import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncModal, { SUPPORTED_BANKS } from "../src/components/SyncModal";
import { TransactionsProvider } from "../src/context/TransactionsContext";
import { UserNamesProvider } from "../src/context/UserNamesContext";
import { AuthProvider } from "../src/context/AuthContext";

function renderSyncModal(isOpen = true, onClose = vi.fn()) {
  return render(
    <UserNamesProvider>
      <TransactionsProvider>
        <SyncModal isOpen={isOpen} onClose={onClose} />
      </TransactionsProvider>
    </UserNamesProvider>
  );
}

describe("Paso 12: SyncModal Simplificado con Selector de Banco, Descargar/Cargar y Miniguía", () => {
  it("renders bank selector with Bankinter, BBVA, and Revolut", () => {
    renderSyncModal(true);

    expect(screen.getByText("Sincronizar Extracto")).toBeDefined();
    expect(screen.getByText("Seleccionar banco:")).toBeDefined();

    // 3 banks in selector
    expect(screen.getByRole("button", { name: /Bankinter/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /BBVA/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Revolut/i })).toBeDefined();
  });

  it("defaults to Bankinter and shows Bankinter download link and steps", () => {
    renderSyncModal(true);

    const downloadBtn = screen.getByRole("link", { name: /Descargar extracto/i });
    expect(downloadBtn).toBeDefined();
    expect(downloadBtn.getAttribute("href")).toBe(
      "https://bancaonline.bankinter.com/tarjetas/secure/tarjetas_ficha.xhtml?INDEX_CTA=5"
    );

    expect(screen.getByText(/Cómo descargar el extracto en Bankinter:/i)).toBeDefined();
    expect(
      screen.getByText(/Accede a la sección Tarjetas en el menú y selecciona tu tarjeta/i)
    ).toBeDefined();
  });

  it("switches to BBVA when clicking BBVA selector", () => {
    renderSyncModal(true);

    const bbvaSelector = screen.getByRole("button", { name: /BBVA/i });
    fireEvent.click(bbvaSelector);

    const downloadBtn = screen.getByRole("link", { name: /Descargar extracto/i });
    expect(downloadBtn.getAttribute("href")).toBe("https://www.bbva.es/personas.html");

    expect(screen.getByText(/Cómo descargar el extracto en BBVA:/i)).toBeDefined();
    expect(
      screen.getByText(/Entra en tu Tarjeta y accede al apartado de Movimientos o Extractos/i)
    ).toBeDefined();
  });

  it("switches to Revolut when clicking Revolut selector", () => {
    renderSyncModal(true);

    const revolutSelector = screen.getByRole("button", { name: /Revolut/i });
    fireEvent.click(revolutSelector);

    const downloadBtn = screen.getByRole("link", { name: /Descargar extracto/i });
    expect(downloadBtn.getAttribute("href")).toBe("https://app.revolut.com/");

    expect(screen.getByText(/Cómo descargar el extracto en Revolut:/i)).toBeDefined();
    expect(
      screen.getByText(/En tu cuenta o sección Tarjetas, pulsa en Extractos/i)
    ).toBeDefined();
  });

  it("renders 'Cargar extracto en app' action button and triggers file upload", async () => {
    renderSyncModal(true);

    const uploadBtn = screen.getByRole("button", { name: /Cargar extracto en app/i });
    expect(uploadBtn).toBeDefined();

    // Trigger file change with a sample CSV
    const file = new File(
      [
        "Fecha;Concepto;Importe;Divisa\n18/09/2026;MERCADONA COMPRA;-30,00;EUR\n17/09/2026;GASOLINERA CEPSA;-45,50;EUR",
      ],
      "extracto_bankinter.csv",
      { type: "text/csv" }
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { files: [file] } });

    // Await message
    const msg = await screen.findByText(/compras de Bankinter incorporadas con éxito/i);
    expect(msg).toBeDefined();
  });

  it("does not render when isOpen is false", () => {
    renderSyncModal(false);

    expect(screen.queryByText("Sincronizar Extracto")).toBeNull();
  });
});

