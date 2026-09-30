import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { TransactionsProvider, useTransactions } from "../src/context/TransactionsContext";
import { UserNamesProvider } from "../src/context/UserNamesContext";
import { BackupRestoreCard } from "../src/components/BackupRestoreCard";
import { BankConnectionStatusCard } from "../src/components/BankConnectionStatusCard";
import { createLocalBackup, canonicalJsonString, sha256Hex } from "../src/lib/backup/localBackup";

// Mock Supabase
vi.mock("../src/lib/supabase", () => ({
  getSupabaseBrowserClient: () => null,
}));

vi.mock("../src/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => null,
}));

describe("Paso 13: Copia de Seguridad y Restauración Local JSON en Ajustes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("TransactionsContext exposes exportLocalBackup and importLocalBackup", () => {
    let contextValues: any = null;

    function TestConsumer() {
      contextValues = useTransactions();
      return <div>Ready</div>;
    }

    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestConsumer />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(contextValues.exportLocalBackup).toBeDefined();
    expect(contextValues.importLocalBackup).toBeDefined();

    // Export test
    const backup = contextValues.exportLocalBackup();
    expect(backup.app).toBe("Sygis");
    expect(backup.schemaVersion).toBe(1);
    expect(backup.checksum).toBeDefined();
    expect(backup.data.transactions).toBeDefined();
    expect(backup.data.rules).toBeDefined();
    expect(backup.data.accounts).toBeDefined();
  });

  it("importLocalBackup in 'replace' mode replaces data and persists to localStorage", async () => {
    let contextValues: any = null;

    function TestConsumer() {
      contextValues = useTransactions();
      return (
        <div>
          <span data-testid="tx-count">{contextValues.transactions.length}</span>
          <span data-testid="rules-count">{contextValues.rules.length}</span>
        </div>
      );
    }

    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestConsumer />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const mockBackup = createLocalBackup({
      transactions: [
        {
          id: "custom-tx-1",
          concept: "Test Movement Backup",
          amount: 50.0,
          date: "2026-09-25",
          split: "50/50",
          payer: "memberA",
          category: "Supermercado",
          categoryColor: "#00D09C",
          status: "confirmed",
          monthKey: "2026-09",
        },
      ],
      accounts: [
        {
          id: "custom-acc-1",
          name: "Cuenta Ahorro",
          bankName: "Bankinter",
          ownership: "JOINT",
          balance: 5000,
        },
      ],
      rules: [
        {
          id: "custom-rule-1",
          name: "Regla Test",
          pattern: "TestPattern",
          assignTo: "JOINT",
          splitRatio: 0.5,
          categoryName: "Supermercado",
          isActive: true,
        },
      ],
      learnings: [],
      categories: [{ name: "Supermercado", color: "#00D09C" }],
      settlements: {},
      userNames: { memberA: "Carlos", memberB: "Andrea" },
    });

    let res: any;
    act(() => {
      res = contextValues.importLocalBackup(mockBackup, "replace");
    });
    expect(res.success).toBe(true);
    expect(res.importedTransactions).toBe(1);

    await waitFor(() => {
      expect(screen.getByTestId("tx-count").textContent).toBe("1");
      expect(screen.getByTestId("rules-count").textContent).toBe("1");
    });

    // Verify localStorage
    const savedTx = JSON.parse(localStorage.getItem("cuentaconjunta_transactions_v2") || "[]");
    expect(savedTx.length).toBe(1);
    expect(savedTx[0].concept).toBe("Test Movement Backup");
  });

  it("importLocalBackup in 'merge' mode preserves existing movements without duplicates", async () => {
    let contextValues: any = null;

    function TestConsumer() {
      contextValues = useTransactions();
      return (
        <div>
          <span data-testid="tx-count">{contextValues.transactions.length}</span>
        </div>
      );
    }

    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <TestConsumer />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    const initialCount = contextValues.transactions.length;

    // Create a backup with 1 duplicate and 1 brand new transaction
    const existingTx = contextValues.transactions[0];
    const newTx = {
      id: "brand-new-unique-tx",
      concept: "New Unique Movement",
      amount: 19.99,
      date: "2026-09-29",
      split: "50/50" as const,
      payer: "memberA" as const,
      category: "Restaurantes & Ocio",
      categoryColor: "#F59E0B",
      status: "confirmed" as const,
      monthKey: "2026-09",
    };

    const mockBackup = createLocalBackup({
      transactions: existingTx ? [existingTx, newTx] : [newTx],
      accounts: contextValues.accounts,
      rules: contextValues.rules,
      learnings: contextValues.learnings,
      categories: contextValues.categories,
      settlements: {},
      userNames: { memberA: "Carlos", memberB: "Andrea" },
    });

    let res: any;
    act(() => {
      res = contextValues.importLocalBackup(mockBackup, "merge");
    });
    expect(res.success).toBe(true);

    // Initial count + 1 new transaction (duplicate was not added again)
    await waitFor(() => {
      expect(screen.getByTestId("tx-count").textContent).toBe(String(initialCount + 1));
    });
  });

  it("renders BackupRestoreCard with metrics and download action", async () => {
    const onNotify = vi.fn();

    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <BackupRestoreCard onNotify={onNotify} />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getByText("Copia de Seguridad y Restauración Local (JSON)")).toBeDefined();
    expect(screen.getByText("Descargar Copia de Seguridad JSON")).toBeDefined();
    expect(screen.getByText("Seleccionar Archivo JSON de Respaldo")).toBeDefined();
    expect(screen.getByText("SHA-256 Verificado")).toBeDefined();

    // Trigger export
    const downloadBtn = screen.getByText("Descargar Copia de Seguridad JSON");
    act(() => {
      fireEvent.click(downloadBtn);
    });

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith(expect.stringContaining("Copia de seguridad exportada con éxito"));
    });
  });

  it("renders BankConnectionStatusCard with PSD2 days remaining and quick sync button", () => {
    render(
      <UserNamesProvider>
        <TransactionsProvider>
          <BankConnectionStatusCard />
        </TransactionsProvider>
      </UserNamesProvider>
    );

    expect(screen.getByText("Estado de Conexión Bancaria & Credenciales PSD2")).toBeDefined();
    expect(screen.getByText("84 días de 90")).toBeDefined();
    expect(screen.getByText("Catch-Up Gap Sync")).toBeDefined();
    expect(screen.getByText("Reconciliar Ahora")).toBeDefined();
  });
});
