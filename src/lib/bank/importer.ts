/**
 * Spanish Bank Statement Importer (Bankinter, Santander, BBVA, CaixaBank, ING, etc.)
 * Parses CSV/Excel/Text exports to extract 100% REAL transactions and accounts.
 */

export interface ParsedBankMovement {
  id: string;
  date: string; // ISO YYYY-MM-DD or readable
  monthKey: string; // YYYY-MM
  rawDate: string;
  concept: string;
  amount: number; // positive or negative
  balance?: number;
}

export interface BankStatementParseResult {
  success: boolean;
  bankName: string;
  accountIban?: string;
  totalMovements: number;
  totalExpenses: number;
  movements: ParsedBankMovement[];
  error?: string;
}

export function parseSpanishBankStatement(
  fileContent: string,
  detectedBank = "Bankinter"
): BankStatementParseResult {
  if (!fileContent || !fileContent.trim()) {
    return {
      success: false,
      bankName: detectedBank,
      totalMovements: 0,
      totalExpenses: 0,
      movements: [],
      error: "El archivo o contenido del extracto está vacío.",
    };
  }

  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const movements: ParsedBankMovement[] = [];
  let detectedIban: string | undefined;

  // Search for IBAN in headers if present
  for (const line of lines.slice(0, 15)) {
    const ibanMatch = line.match(/ES\d{2}[A-Z0-9\s-]{16,28}/i);
    if (ibanMatch) {
      detectedIban = ibanMatch[0].replace(/[\s-]/g, "");
      break;
    }
  }

  // Iterate over lines to extract movements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect delimiter: semicolon (typical in Spanish Excel/Bankinter), tab, or comma
    const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, "").trim());

    if (parts.length < 3) continue;

    // Check if first or second column is a date (DD/MM/YYYY or YYYY-MM-DD)
    const dateCol = parts[0].match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
      ? parts[0]
      : parts[1]?.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
      ? parts[1]
      : null;

    if (!dateCol) continue;

    const dateMatch = dateCol.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!dateMatch) continue;

    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    let year = dateMatch[3];
    if (year.length === 2) year = `20${year}`;

    const isoDate = `${year}-${month}-${day}`;
    const monthKey = `${year}-${month}`;

    // Find concept: usually the first non-date column with letters
    let concept = "";
    let amountVal: number | null = null;
    let balanceVal: number | undefined;

    for (let c = 0; c < parts.length; c++) {
      const part = parts[c];
      if (part === dateCol || part.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)) {
        continue;
      }

      // Check if it's an amount (e.g. -45,30 or 1.200,50 or -45.30)
      let parsedNum: number | null = null;
      const trimmed = part.trim();
      if (/^-?\s*[\d.,]+\s*€?$/.test(trimmed) && trimmed.length < 16) {
        let clean = trimmed.replace(/€|\s/g, "");
        if (clean.includes(",") && clean.includes(".")) {
          clean = clean.replace(/\./g, "").replace(",", ".");
        } else if (clean.includes(",")) {
          clean = clean.replace(",", ".");
        }
        const val = parseFloat(clean);
        if (!isNaN(val)) {
          parsedNum = val;
        }
      }

      if (parsedNum !== null) {
        if (amountVal === null) {
          amountVal = parsedNum;
        } else if (balanceVal === undefined) {
          balanceVal = parsedNum;
        }
      } else if (!concept && part.length > 2 && /[A-Za-z]/.test(part)) {
        concept = part;
      }
    }

    if (amountVal !== null && concept) {
      movements.push({
        id: `stmt_${Date.now()}_${i}`,
        date: `${day}/${month}/${year}`,
        monthKey,
        rawDate: isoDate,
        concept,
        amount: amountVal,
        balance: balanceVal,
      });
    }
  }

  if (movements.length === 0) {
    return {
      success: false,
      bankName: detectedBank,
      totalMovements: 0,
      totalExpenses: 0,
      movements: [],
      error: "No se pudieron extraer movimientos válidos del archivo. Asegúrate de que incluya fecha, concepto e importe.",
    };
  }

  const totalExpenses = movements
    .filter((m) => m.amount < 0)
    .reduce((sum, m) => sum + Math.abs(m.amount), 0);

  return {
    success: true,
    bankName: detectedBank,
    accountIban: detectedIban,
    totalMovements: movements.length,
    totalExpenses,
    movements,
  };
}
