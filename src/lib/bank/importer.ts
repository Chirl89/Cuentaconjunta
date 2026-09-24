import * as XLSX from "xlsx";

export interface ParsedBankMovement {
  id: string;
  date: string; // ISO YYYY-MM-DD or readable
  monthKey: string; // YYYY-MM
  rawDate: string;
  concept: string;
  amount: number; // positive or negative
  balance?: number;
  isCredit?: boolean;
  rawConcept?: string;
}

export function buildDeterministicMovementId(
  prefix: string,
  rawDate: string,
  amount: number,
  concept: string,
  occurrence: number = 0
): string {
  const cleanConcept =
    concept
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "mov";
  const absAmount = Math.abs(amount).toFixed(2).replace(".", "_");
  return `${prefix}_${rawDate}_${absAmount}_${cleanConcept}_${occurrence}`;
}

export interface CardStatementParseResult {
  success: boolean;
  cardName: string;
  cardNumber: string;
  totalMovements: number;
  totalExpenses: number;
  movements: ParsedBankMovement[];
  error?: string;
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
  const occurrenceMap = new Map<string, number>();
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
      const absAmount = Math.abs(amountVal).toFixed(2);
      const cleanConceptKey = concept.toLowerCase().trim();
      const occKey = `${isoDate}_${absAmount}_${cleanConceptKey}`;
      const occ = occurrenceMap.get(occKey) || 0;
      occurrenceMap.set(occKey, occ + 1);

      movements.push({
        id: buildDeterministicMovementId("stmt", isoDate, amountVal, concept, occ),
        date: `${day}/${month}/${year}`,
        monthKey,
        rawDate: isoDate,
        concept,
        rawConcept: concept,
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

export function parseBankinterExcel(
  fileBuffer: ArrayBuffer | Uint8Array
): CardStatementParseResult {
  try {
    const wb = XLSX.read(fileBuffer, { type: "array" });
    const sheetName = wb.SheetNames[0] || "Movimientos";
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      return {
        success: false,
        cardName: "Tarjeta Bankinter",
        cardNumber: "",
        totalMovements: 0,
        totalExpenses: 0,
        movements: [],
        error: "No se encontró ninguna hoja de cálculo en el archivo.",
      };
    }

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let cardName = "Visa Clásica";
    let cardNumber = "";
    if (rows[0] && rows[0][0]) {
      const m = String(rows[0][0]).match(/([^(]+)\s*\(([^)]+)\)/);
      if (m) {
        let rawName = m[1].replace(/Número de tarjeta:\s*/i, "").trim();
        if (/visa clasi/i.test(rawName)) rawName = "Visa Clásica";
        cardName = rawName;
        cardNumber = m[2].replace(/^\.+/, "*").trim();
      }
    }

    const movements: ParsedBankMovement[] = [];
    const occurrenceMap = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 4) continue;
      const dateCell = r[0];
      const conceptCell = r[1];
      const amountCell = r[3];

      if (dateCell === undefined || conceptCell === undefined || amountCell === undefined) continue;
      if (String(dateCell).toLowerCase().includes("fecha")) continue;

      const numAmount = typeof amountCell === "number" ? amountCell : parseFloat(String(amountCell).replace(",", "."));
      if (isNaN(numAmount)) continue;

      let day = "", month = "", year = "";
      if (typeof dateCell === "number") {
        const formatted = XLSX.SSF.format("dd/mm/yyyy", dateCell);
        const parts = formatted.split("/");
        day = parts[0];
        month = parts[1];
        year = parts[2];
      } else {
        const parts = String(dateCell).trim().split(/[/-]/);
        if (parts.length === 3) {
          day = parts[0].padStart(2, "0");
          month = parts[1].padStart(2, "0");
          year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        }
      }

      if (day && month && year) {
        const isoDate = `${year}-${month}-${day}`;
        const monthKey = `${year}-${month}`;
        const conceptStr = String(conceptCell).trim();
        const isCredit = numAmount > 0 || conceptStr.toUpperCase().includes("ANUL");
        const absVal = Math.abs(numAmount);

        const occKey = `${isoDate}_${absVal.toFixed(2)}_${conceptStr.toLowerCase().trim()}`;
        const occ = occurrenceMap.get(occKey) || 0;
        occurrenceMap.set(occKey, occ + 1);

        movements.push({
          id: buildDeterministicMovementId("card", isoDate, absVal, conceptStr, occ),
          date: `${day}/${month}/${year}`,
          monthKey,
          rawDate: isoDate,
          concept: conceptStr,
          rawConcept: conceptStr,
          amount: absVal,
          isCredit,
        });
      }
    }

    if (movements.length === 0) {
      return {
        success: false,
        cardName,
        cardNumber,
        totalMovements: 0,
        totalExpenses: 0,
        movements: [],
        error: "No se encontraron movimientos válidos en el archivo Excel.",
      };
    }

    const totalExpenses = movements
      .filter((m) => !m.isCredit)
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      success: true,
      cardName,
      cardNumber,
      totalMovements: movements.length,
      totalExpenses,
      movements,
    };
  } catch (err: any) {
    return {
      success: false,
      cardName: "Tarjeta Bankinter",
      cardNumber: "",
      totalMovements: 0,
      totalExpenses: 0,
      movements: [],
      error: `Error al procesar el archivo Excel: ${err.message}`,
    };
  }
}

export interface DetectedCardDetails {
  detectedBank: string;
  detectedCardName: string;
  detectedDigits?: string;
  detectedMask?: string;
}

export function detectCardDetails(content: string, defaultBank = "Bankinter"): DetectedCardDetails {
  const lower = content.toLowerCase();

  let detectedBank = defaultBank;
  if (lower.includes("bankinter")) detectedBank = "Bankinter";
  else if (lower.includes("bbva")) detectedBank = "BBVA";
  else if (lower.includes("santander")) detectedBank = "Banco Santander";
  else if (lower.includes("caixa")) detectedBank = "CaixaBank";
  else if (lower.includes("sabadell")) detectedBank = "Banco Sabadell";
  else if (lower.includes("ing")) detectedBank = "ING";
  else if (lower.includes("revolut")) detectedBank = "Revolut";
  else if (lower.includes("openbank")) detectedBank = "Openbank";

  let detectedDigits: string | undefined;
  const digitsMatch =
    content.match(/(?:tarjeta|card|visa|mastercard)?\s*(?:n[úu]m(?:\.|ero)?)?\s*[:.-]?\s*(?:\.{2,}|\*{2,}|\s)+(\d{4})\b/i) ||
    content.match(/\((?:\.{2,}|\*{2,})?(\d{4})\)/) ||
    content.match(/\*{4}\s*(\d{4})/) ||
    content.match(/(?:visa|mastercard)[^\n\r\d]*(\d{4})\b/i);

  if (digitsMatch) {
    detectedDigits = digitsMatch[1];
  }

  let detectedCardName = "Tarjeta VISA";
  if (lower.includes("visa clásica") || lower.includes("visa clasica")) {
    detectedCardName = "Tarjeta VISA Clásica";
  } else if (lower.includes("visa oro")) {
    detectedCardName = "Tarjeta VISA Oro";
  } else if (lower.includes("mastercard")) {
    detectedCardName = "Tarjeta Mastercard";
  } else if (lower.includes("débito") || lower.includes("debito")) {
    detectedCardName = `Tarjeta Débito ${detectedBank}`;
  } else if (lower.includes("crédito") || lower.includes("credito")) {
    detectedCardName = `Tarjeta Crédito ${detectedBank}`;
  } else if (detectedBank) {
    detectedCardName = `Tarjeta VISA ${detectedBank}`;
  }

  const detectedMask = detectedDigits ? `VISA **** ${detectedDigits}` : undefined;

  return {
    detectedBank,
    detectedCardName,
    detectedDigits,
    detectedMask,
  };
}

