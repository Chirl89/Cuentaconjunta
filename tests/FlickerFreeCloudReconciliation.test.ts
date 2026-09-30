import { describe, it, expect } from "vitest";
import {
  sanitizeTransactions,
  areTransactionsEqual,
  areAccountsEqual,
  areRulesEqual,
  areLearningsEqual,
  Transaction,
  BankAccount,
  AssignmentRule,
  CategoryLearningItem,
} from "../src/context/TransactionsContext";

describe("Paso 12.12: Flicker-Free Cloud Synchronization & Equality Bailout", () => {
  it("sanitizeTransactions purges omitted savings movements and ghost movements from raw storage", () => {
    const rawTxs = [
      {
        id: "tx-real-1",
        amount: 25.5,
        date: "2026-09-15",
        merchant: "MERCADONA",
        status: "classified",
        payer: "memberA",
        split: "50/50",
        category: "Supermercado",
      },
      {
        id: "tx-savings-1",
        amount: 100,
        date: "2026-09-16",
        merchant: "SavingsAccount migration",
        rawConcept: "SavingsAccount migration",
        status: "classified",
        payer: "memberB",
        split: "memberB",
      },
      {
        id: "tx-savings-2",
        amount: 50,
        date: "2026-09-17",
        merchant: "From Instant Access Savings",
        rawConcept: "From Instant Access Savings",
        status: "pending",
      },
      {
        id: "tx-ghost-visa",
        amount: 45,
        date: "2026-07-10",
        accountLabel: "Bankinter Visa Clasica",
        merchant: "Restaurante",
        status: "classified",
      },
    ];

    const sanitized = sanitizeTransactions(rawTxs);
    expect(sanitized.length).toBe(1);
    expect(sanitized[0].id).toBe("tx-real-1");
    expect(sanitized.some((t) => t.id === "tx-savings-1")).toBe(false);
    expect(sanitized.some((t) => t.id === "tx-savings-2")).toBe(false);
    expect(sanitized.some((t) => t.id === "tx-ghost-visa")).toBe(false);
  });

  it("areTransactionsEqual correctly identifies identical transaction lists for React render bailout", () => {
    const txA: Transaction[] = [
      {
        id: "1",
        date: "2026-09-10",
        amount: 50,
        merchant: "IKEA",
        status: "classified",
        payer: "memberA",
        split: "50/50",
        category: "Hogar",
        updatedAt: 1000,
      },
      {
        id: "2",
        date: "2026-09-11",
        amount: 30,
        merchant: "ZARA",
        status: "pending",
        payer: "memberB",
        split: "50/50",
        category: "Ropa",
        updatedAt: 2000,
      },
    ];

    const txB: Transaction[] = [
      {
        id: "1",
        date: "2026-09-10",
        amount: 50,
        merchant: "IKEA",
        status: "classified",
        payer: "memberA",
        split: "50/50",
        category: "Hogar",
        updatedAt: 1000,
      },
      {
        id: "2",
        date: "2026-09-11",
        amount: 30,
        merchant: "ZARA",
        status: "pending",
        payer: "memberB",
        split: "50/50",
        category: "Ropa",
        updatedAt: 2000,
      },
    ];

    expect(areTransactionsEqual(txA, txB)).toBe(true);

    // Modified status
    const txC: Transaction[] = [{ ...txB[0], status: "pending" }, txB[1]];
    expect(areTransactionsEqual(txA, txC)).toBe(false);

    // Different length
    expect(areTransactionsEqual(txA, [txA[0]])).toBe(false);
  });

  it("areAccountsEqual correctly identifies identical account states", () => {
    const accA: BankAccount[] = [
      {
        id: "acc-1",
        bankName: "Bankinter",
        accountName: "Cuenta Nómina",
        ibanMask: "ES93 •••• 0803",
        ownership: "JOINT",
        balance: 5400,
      },
    ];

    const accB: BankAccount[] = [
      {
        id: "acc-1",
        bankName: "Bankinter",
        accountName: "Cuenta Nómina",
        ibanMask: "ES93 •••• 0803",
        ownership: "JOINT",
        balance: 5400,
      },
    ];

    expect(areAccountsEqual(accA, accB)).toBe(true);

    const accModified: BankAccount[] = [
      {
        ...accB[0],
        balance: 5200,
      },
    ];
    expect(areAccountsEqual(accA, accModified)).toBe(false);
  });

  it("areRulesEqual and areLearningsEqual detect identical rule configurations", () => {
    const rulesA: AssignmentRule[] = [
      {
        id: "r1",
        name: "Mercadona rule",
        pattern: "MERCADONA",
        field: "merchant",
        matchType: "contains",
        payer: "memberA",
        split: "50/50",
        category: "Supermercado",
      },
    ];
    const rulesB: AssignmentRule[] = [
      {
        id: "r1",
        name: "Mercadona rule",
        pattern: "MERCADONA",
        field: "merchant",
        matchType: "contains",
        payer: "memberA",
        split: "50/50",
        category: "Supermercado",
      },
    ];

    expect(areRulesEqual(rulesA, rulesB)).toBe(true);

    const rulesC: AssignmentRule[] = [{ ...rulesB[0], split: "memberA" }];
    expect(areRulesEqual(rulesA, rulesC)).toBe(false);

    const learningsA: CategoryLearningItem[] = [
      {
        id: "l1",
        pattern: "UBER",
        category: "Transporte",
        categoryColor: "#3B82F6",
        count: 5,
        updatedAt: 12345,
      },
    ];
    const learningsB: CategoryLearningItem[] = [
      {
        id: "l1",
        pattern: "UBER",
        category: "Transporte",
        categoryColor: "#3B82F6",
        count: 5,
        updatedAt: 12345,
      },
    ];
    expect(areLearningsEqual(learningsA, learningsB)).toBe(true);
  });
});
