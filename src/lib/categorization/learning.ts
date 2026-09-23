/**
 * Category Learning & Feedback Loop Engine
 * Remembers user categorization overrides and prioritizes them over AI suggestions.
 */

import { normalizeConcept } from "./classifier";

export interface CategoryLearningItem {
  id: string;
  householdId?: string;
  merchantPattern: string; // normalized merchant pattern
  rawMerchant?: string;    // original sample
  categoryName: string;
  updatedAt: string;
}

/**
 * Normalizes a merchant string to extract a clean pattern.
 * Strips out banking boilerplate (e.g. "compra en", "tpv", terminal codes, card asterisks, dates).
 */
export function extractMerchantPattern(rawMerchant: string): string {
  if (!rawMerchant) return "";

  let cleaned = rawMerchant.toLowerCase().trim();

  // Remove common banking prefixes
  cleaned = cleaned.replace(/^(compra\s+en|pago\s+en|recibo\s+de|adeudo\s+de|transferencia\s+de|traspaso\s+de|abono\s+de)\s+/i, "");
  cleaned = cleaned.replace(/^(pago\s+con\s+tarjeta|operacion\s+tarjeta)\s+/i, "");

  // Remove card mask fragments like *1234, •••• 1234, **** 1234
  cleaned = cleaned.replace(/[\*•]{2,}\s*\d{3,4}/g, "");

  // Remove TPV/terminal markers: "tpv 12345", "term 999", "aut 123456"
  cleaned = cleaned.replace(/\b(tpv|terminal|term|aut|autorizacion|ref|operacion)\s*[:#]?\s*[0-9a-z]+/gi, "");

  // Remove dates or timestamps embedded in descriptions like "14/09/2026", "14-09", "11:42"
  cleaned = cleaned.replace(/\b\d{1,2}[\/\.-]\d{1,2}([\/\.-]\d{2,4})?\b/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, "");

  // Remove trailing or leading numeric IDs (e.g., store codes like "0482", "nº 12")
  cleaned = cleaned.replace(/\b(n[ºo]|num|numero)?\s*\d{4,}\b/gi, "");

  // Strip company suffixes: S.A., S.L., S.L.U., S.A.U., INC, LTD
  cleaned = cleaned.replace(/\b(s\.?a\.?u?|s\.?l\.?u?|inc|ltd)\b/gi, "");

  // Normalize accents and punctuation
  const normalized = normalizeConcept(cleaned);

  // Return trimmed pattern (or original normalized if cleaned becomes too short)
  return normalized.length >= 2 ? normalized : normalizeConcept(rawMerchant);
}

/**
 * Checks whether two merchant strings refer to the same merchant or share the same literal.
 * Used for real-time auto-assignment and bulk propagation.
 */
export function isMerchantMatch(rawA: string, rawB: string): boolean {
  if (!rawA || !rawB) return false;

  const trimA = rawA.trim().toLowerCase();
  const trimB = rawB.trim().toLowerCase();
  if (trimA === trimB) return true;

  const normA = normalizeConcept(rawA);
  const normB = normalizeConcept(rawB);
  if (normA && normA === normB) return true;

  const patA = extractMerchantPattern(rawA);
  const patB = extractMerchantPattern(rawB);
  if (patA && patB && patA === patB) return true;

  // Word boundary or prefix matching for patterns >= 3 characters
  if (patA && patA.length >= 3 && normB) {
    const escapedA = patA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escapedA}(\\s|$)`, "i").test(normB)) return true;
  }
  if (patB && patB.length >= 3 && normA) {
    const escapedB = patB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escapedB}(\\s|$)`, "i").test(normA)) return true;
  }

  return false;
}

/**
 * Finds a learned category for a given merchant from the feedback loop repository.
 * Evaluates:
 * 1. Exact match of normalized merchant pattern.
 * 2. Prefix / containment match if pattern has >= 3 chars.
 */
export function findLearnedCategory(
  merchant: string,
  learnings: CategoryLearningItem[]
): { categoryName: string; matchedPattern: string; updatedAt: string } | null {
  if (!merchant || !learnings || learnings.length === 0) return null;

  const currentPattern = extractMerchantPattern(merchant);
  if (!currentPattern) return null;

  // 1. Exact pattern match (highest specificity)
  const exact = learnings.find(
    (l) => l.merchantPattern.toLowerCase().trim() === currentPattern
  );
  if (exact) {
    return {
      categoryName: exact.categoryName,
      matchedPattern: exact.merchantPattern,
      updatedAt: exact.updatedAt,
    };
  }

  // 2. Substring / whole-word match (e.g. learning "mercadona" matches "mercadona gran via")
  // Sort learnings by pattern length descending to favor more specific matches
  const sorted = [...learnings].sort(
    (a, b) => b.merchantPattern.length - a.merchantPattern.length
  );

  for (const item of sorted) {
    const itemPat = item.merchantPattern.toLowerCase().trim();
    if (itemPat.length < 3) continue;

    const regex = new RegExp(`\\b${itemPat}\\b`, "i");
    if (regex.test(currentPattern) || currentPattern.startsWith(itemPat)) {
      return {
        categoryName: item.categoryName,
        matchedPattern: item.merchantPattern,
        updatedAt: item.updatedAt,
      };
    }
  }

  return null;
}

/**
 * Records or updates a category learning in the repository.
 * Returns the updated array of learnings.
 */
export function recordLearning(
  rawMerchant: string,
  categoryName: string,
  existingLearnings: CategoryLearningItem[],
  householdId?: string
): { updatedLearnings: CategoryLearningItem[]; entry: CategoryLearningItem } {
  const pattern = extractMerchantPattern(rawMerchant);
  const now = new Date().toISOString();

  const existingIdx = existingLearnings.findIndex(
    (l) => l.merchantPattern.toLowerCase().trim() === pattern
  );

  let entry: CategoryLearningItem;
  let updatedLearnings: CategoryLearningItem[];

  if (existingIdx >= 0) {
    entry = {
      ...existingLearnings[existingIdx],
      categoryName,
      rawMerchant,
      updatedAt: now,
      householdId: householdId || existingLearnings[existingIdx].householdId,
    };
    updatedLearnings = [
      ...existingLearnings.slice(0, existingIdx),
      entry,
      ...existingLearnings.slice(existingIdx + 1),
    ];
  } else {
    entry = {
      id: `learn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      householdId,
      merchantPattern: pattern,
      rawMerchant,
      categoryName,
      updatedAt: now,
    };
    updatedLearnings = [entry, ...existingLearnings];
  }

  return { updatedLearnings, entry };
}
