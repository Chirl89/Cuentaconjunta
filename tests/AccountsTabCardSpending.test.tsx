import { describe, it, expect } from "vitest";

describe("Accounts Tab & Monthly Card Spending Logic", () => {
  it("calculates monthly card spending and discounts refunds/credits properly", () => {
    const mockTransactions = [
      {
        id: "card_2026-09-15_45_1",
        merchant: "Mercadona",
        amount: 45.0,
        monthKey: "2026-09",
        isCredit: false,
        accountLabel: "Tarjeta Bankinter (VISA)",
      },
      {
        id: "card_2026-09-14_25.5_2",
        merchant: "Gasolinera Repsol",
        amount: 25.5,
        monthKey: "2026-09",
        isCredit: false,
        accountLabel: "Tarjeta Bankinter (VISA)",
      },
      {
        id: "card_2026-09-10_5_3",
        merchant: "Amazon Reembolso",
        amount: 5.0,
        monthKey: "2026-09",
        isCredit: true, // Devolución/abono
        accountLabel: "Tarjeta Bankinter (VISA)",
      },
      {
        id: "card_2026-08-20_80_4",
        merchant: "Compra Agosto",
        amount: 80.0,
        monthKey: "2026-08",
        isCredit: false,
        accountLabel: "Tarjeta Bankinter (VISA)",
      },
      {
        id: "stmt_checking_1",
        merchant: "Nómina Empresa",
        amount: 2500.0,
        monthKey: "2026-09",
        isCredit: false,
        accountLabel: "Cuenta Corriente Bankinter",
      },
    ];

    const selectedMonth = "2026-09";

    // Filtering logic matching page.tsx
    const cardTxsInMonth = mockTransactions.filter((t) => {
      const isCard =
        t.id.startsWith("card_") ||
        (t.accountLabel &&
          (t.accountLabel.toLowerCase().includes("tarjeta") ||
            t.accountLabel.toLowerCase().includes("visa")));
      return isCard && t.monthKey === selectedMonth;
    });

    expect(cardTxsInMonth).toHaveLength(3);

    const cardSpentThisMonth = cardTxsInMonth.reduce(
      (sum, t) => sum + (t.isCredit ? -t.amount : t.amount),
      0
    );
    // 45.0 + 25.5 - 5.0 = 65.5
    expect(cardSpentThisMonth).toBe(65.5);

    const cardPurchasesCount = cardTxsInMonth.filter((t) => !t.isCredit).length;
    expect(cardPurchasesCount).toBe(2);
  });
});
