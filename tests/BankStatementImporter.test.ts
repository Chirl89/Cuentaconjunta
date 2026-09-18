import { describe, it, expect } from "vitest";
import { parseSpanishBankStatement, parseBankinterExcel } from "../src/lib/bank/importer";

describe("Spanish Bank Statement Importer (Bankinter, Santander, BBVA, etc.)", () => {
  it("returns error for empty statement content", () => {
    const res = parseSpanishBankStatement("");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("parses typical Bankinter semicolon-delimited CSV statement with real movements", () => {
    const bankinterCsv = `
IBAN: ES91 0128 0000 1234 5678 9012
Cuenta: Cuenta Nómina Bankinter
Fecha operación;Fecha valor;Concepto;Importe;Saldo
15/09/2026;15/09/2026;MERCADONA MADRID;-48,50;2.340,10
12/09/2026;12/09/2026;RECIBO IBERDROLA ELECTRICIDAD;-82,30;2.388,60
05/09/2026;05/09/2026;RESTAURANTE EL CORTE INGLES;-35,00;2.470,90
01/09/2026;01/09/2026;TRANSFERENCIA NOMINA EMPRESA;2.100,00;2.505,90
`;

    const res = parseSpanishBankStatement(bankinterCsv, "Bankinter");

    expect(res.success).toBe(true);
    expect(res.bankName).toBe("Bankinter");
    expect(res.accountIban).toBe("ES9101280000123456789012");
    expect(res.totalMovements).toBe(4);
    expect(res.movements[0].concept).toBe("MERCADONA MADRID");
    expect(res.movements[0].amount).toBe(-48.5);
    expect(res.movements[0].monthKey).toBe("2026-09");
    expect(res.totalExpenses).toBeCloseTo(165.8, 1);
  });

  it("parses comma or tab delimited bank statement with dates and amounts", () => {
    const rawData = `
Fecha,Concepto,Importe
10/09/2026,Gasolinera Repsol,-55.00
08/09/2026,Farmacia Central,-12.40
`;
    const res = parseSpanishBankStatement(rawData, "Banco Santander");

    expect(res.success).toBe(true);
    expect(res.totalMovements).toBe(2);
    expect(res.movements[0].concept).toBe("Gasolinera Repsol");
    expect(res.movements[0].amount).toBe(-55.0);
    expect(res.movements[1].amount).toBe(-12.4);
  });

  it("parses real Bankinter Visa Excel (movimientos.xls) extracting 35 card purchases and card details", () => {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.resolve(__dirname, "../movimientos.xls");
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const res = parseBankinterExcel(fileBuffer);

      expect(res.success).toBe(true);
      expect(res.cardNumber).toBe("....2153");
      expect(res.cardName).toContain("Visa");
      expect(res.totalMovements).toBe(35);
      expect(res.movements.length).toBe(35);

      // Check specific purchase details
      const repsol = res.movements.find((m) => m.concept.includes("REPSOL WAYLET"));
      expect(repsol).toBeDefined();
      expect(repsol?.amount).toBe(55.37);
      expect(repsol?.date).toBe("29/08/2026");

      const justEat = res.movements.find((m) => m.concept.toLowerCase().includes("justeat"));
      expect(justEat).toBeDefined();
      expect(justEat?.amount).toBe(22.71);
      expect(justEat?.date).toBe("11/09/2026");
    }
  });
});
