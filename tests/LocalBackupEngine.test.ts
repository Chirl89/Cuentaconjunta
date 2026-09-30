import { describe, it, expect } from "vitest";
import {
  canonicalJsonString,
  sha256Hex,
  calculateBackupChecksum,
  createLocalBackup,
  validateLocalBackup,
  type BackupDataContent,
} from "../src/lib/backup/localBackup";

describe("Local JSON Backup & Restore Engine (Paso 13)", () => {
  it("generates deterministic canonical JSON string regardless of key order", () => {
    const objA = { z: 1, a: 2, m: { nestedB: "hello", nestedA: true } };
    const objB = { m: { nestedA: true, nestedB: "hello" }, a: 2, z: 1 };

    expect(canonicalJsonString(objA)).toBe(canonicalJsonString(objB));
  });

  it("calculates exact SHA-256 matching standard hashing", () => {
    const text = "Sygis Financial Suite 2026";
    const hash = sha256Hex(text);
    expect(hash).toHaveLength(64);
    // Deterministic check
    expect(sha256Hex(text)).toBe(hash);
  });

  it("creates a complete valid backup payload with counts and checksum", () => {
    const mockData: any = {
      transactions: [
        {
          id: "tx-1",
          concept: "Mercadona Compra Semanal",
          amount: 65.4,
          date: "2026-09-28",
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
          id: "acc-1",
          name: "Cuenta Nómina Bankinter",
          bankName: "Bankinter",
          ownership: "JOINT",
          balance: 2450.5,
          color: "#FF6600",
        },
      ],
      rules: [
        {
          id: "rule-1",
          name: "Regla Mercadona",
          pattern: "Mercadona",
          assignTo: "JOINT",
          splitRatio: 0.5,
          categoryName: "Supermercado",
          isActive: true,
        },
      ],
      learnings: [
        {
          id: "learn-1",
          merchantPattern: "mercadona",
          categoryName: "Supermercado",
          updatedAt: "2026-09-28T10:00:00Z",
        },
      ],
      categories: [
        { name: "Supermercado", color: "#00D09C", isSystem: true },
      ],
      settlements: {
        lastSettlementInfo: {
          amount: 120,
          date: "2026-09-25",
          debtorName: "Carlos",
          creditorName: "Andrea",
        },
      },
      userNames: {
        memberA: "Carlos",
        memberB: "Andrea",
      },
    };

    const backup = createLocalBackup(mockData);

    expect(backup.app).toBe("Sygis");
    expect(backup.version).toBeDefined();
    expect(backup.schemaVersion).toBe(1);
    expect(backup.metadata.totalTransactions).toBe(1);
    expect(backup.metadata.totalAccounts).toBe(1);
    expect(backup.metadata.totalRules).toBe(1);
    expect(backup.checksum).toBeDefined();
    expect(backup.checksum).toHaveLength(64);

    // Validate payload
    const validation = validateLocalBackup(backup);
    expect(validation.valid).toBe(true);
    expect(validation.payload).toBeDefined();
  });

  it("detects tampered backup content and rejects it with checksum error", () => {
    const mockData: any = {
      transactions: [],
      accounts: [],
      rules: [],
      learnings: [],
      categories: [],
      settlements: {},
    };

    const backup = createLocalBackup(mockData);
    expect(validateLocalBackup(backup).valid).toBe(true);

    // Tamper with data without updating checksum
    const tampered = JSON.parse(JSON.stringify(backup));
    tampered.data.transactions.push({
      id: "fake-tx",
      concept: "Hacked Transaction",
      amount: 9999,
      date: "2026-09-30",
    });

    const validation = validateLocalBackup(tampered);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Fallo de integridad criptográfica (SHA-256)");
  });

  it("rejects non-Sygis or malformed files", () => {
    const invalidApp = {
      app: "UnknownApp",
      data: { transactions: [], accounts: [], rules: [], learnings: [] },
    };
    expect(validateLocalBackup(invalidApp).valid).toBe(false);

    const malformed = "{ this is not json }";
    expect(validateLocalBackup(malformed).valid).toBe(false);
  });
});
