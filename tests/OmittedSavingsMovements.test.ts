import { describe, it, expect } from "vitest";
import { isOmittedInternalMovement } from "@/lib/categorization/classifier";
import { parseUniversalBankExtract } from "@/lib/bank/importer";
import { shouldPurgeMovement } from "@/context/TransactionsContext";
import { runCategorizationPipeline } from "@/lib/categorization";

describe("Omit internal non-real movements (SavingsAccount migration & Instant Access Savings)", () => {
  it("identifies SavingsAccount migration and Instant Access Savings transfers as omitted", () => {
    expect(isOmittedInternalMovement("SavingsAccount migration [INTERNAL] -> [DEUTSCHE]")).toBe(true);
    expect(isOmittedInternalMovement("SavingsAccount migration")).toBe(true);
    expect(isOmittedInternalMovement("From Instant Access Savings")).toBe(true);
    expect(isOmittedInternalMovement("To Instant Access Savings")).toBe(true);

    // Normal movements should NOT be omitted
    expect(isOmittedInternalMovement("Mercadona")).toBe(false);
    expect(isOmittedInternalMovement("Compra Zara")).toBe(false);
    expect(isOmittedInternalMovement("Interest earned - Instant Access Savings")).toBe(false);
  });

  it("omits internal savings movements when parsing Revolut CSV extracts", () => {
    const revolutCsv = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
TRANSFER,Current,2026-08-08 10:00:00,2026-08-08 10:00:00,From Instant Access Savings,2000.00,0.00,EUR,COMPLETED,2500.00
TRANSFER,Current,2026-08-10 12:00:00,2026-08-10 12:00:00,To Instant Access Savings,-300.00,0.00,EUR,COMPLETED,2200.00
TRANSFER,Current,2026-08-12 14:00:00,2026-08-12 14:00:00,SavingsAccount migration [INTERNAL] -> [DEUTSCHE],-1500.00,0.00,EUR,COMPLETED,700.00
CARD_PAYMENT,Current,2026-08-15 15:30:00,2026-08-15 15:30:00,Mercadona Supermercado,-45.50,0.00,EUR,COMPLETED,654.50
CARD_PAYMENT,Current,2026-08-16 18:20:00,2026-08-16 18:20:00,Restaurante Italiano,-32.00,0.00,EUR,COMPLETED,622.50`;

    const parsed = parseUniversalBankExtract(revolutCsv, "Revolut");
    expect(parsed.success).toBe(true);

    // Only real purchase movements should be in movements!
    expect(parsed.movements.length).toBe(2);
    expect(parsed.movements.map((m) => m.concept)).toEqual([
      "Mercadona Supermercado",
      "Restaurante Italiano",
    ]);

    // Omitted movements must not appear in movements
    const concepts = parsed.movements.map((m) => m.concept);
    expect(concepts.some((c) => c.includes("Savings"))).toBe(false);
  });

  it("shouldPurgeMovement returns true for savings transfer transactions", () => {
    expect(shouldPurgeMovement({ merchant: "From Instant Access Savings" })).toBe(true);
    expect(shouldPurgeMovement({ merchant: "To Instant Access Savings" })).toBe(true);
    expect(shouldPurgeMovement({ rawConcept: "SavingsAccount migration" })).toBe(true);
    expect(shouldPurgeMovement({ merchant: "Mercadona" })).toBe(false);
  });

  it("marks omitted movements as ignored in categorization pipeline if evaluated", () => {
    const res = runCategorizationPipeline({
      merchant: "From Instant Access Savings",
      amount: 2000,
    });

    expect(res.split).toBe("ignored");
  });
});
