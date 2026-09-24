/**
 * Automated Rules Engine for Transactions
 * Allows user-defined rules (matching text, account, amount) to auto-assign splits and categories.
 * Enforces status = 'auto_assigned' and complete reversibility.
 */

import { normalizeConcept } from "./classifier";

export type RuleAssignee = "USER_A" | "USER_B" | "JOINT" | "IGNORED";

export interface AssignmentRule {
  id: string;
  householdId?: string;
  name?: string;
  pattern: string; // text pattern to match in merchant/concept
  accountId?: string | null; // optional account filter
  accountLabel?: string | null; // optional label match
  minAmount?: number | null;
  maxAmount?: number | null;
  assignTo: RuleAssignee;
  splitRatio: number; // 0.5 = 50/50, 1.0 = 100% to assignTo, 0 = 0%
  categoryName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleEvaluationResult {
  matchedRule: AssignmentRule;
  assignTo: RuleAssignee;
  split: "50/50" | "memberA" | "memberB" | "ignored";
  payer: "memberA" | "memberB" | "joint";
  categoryName?: string;
  status: "auto_assigned";
  reason: string;
}

/**
 * Checks if a transaction satisfies a rule's conditions:
 * - Active check
 * - Pattern in merchant / concept (case & accent insensitive)
 * - Account match (if rule specifies accountId or accountLabel)
 * - Amount bounds (if minAmount / maxAmount specified)
 */
export function matchesRule(
  rule: AssignmentRule,
  tx: {
    merchant: string;
    amount: number;
    accountId?: string | null;
    accountLabel?: string | null;
  }
): boolean {
  if (!rule.isActive) return false;

  // 1. Text pattern matching
  if (rule.pattern && rule.pattern.trim()) {
    const normMerchant = normalizeConcept(tx.merchant);
    const normPattern = normalizeConcept(rule.pattern);

    // Support simple regex if enclosed in slashes, e.g. "/pattern/i", otherwise substring match
    if (rule.pattern.startsWith("/") && rule.pattern.lastIndexOf("/") > 0) {
      try {
        const lastSlash = rule.pattern.lastIndexOf("/");
        const regexBody = rule.pattern.slice(1, lastSlash);
        const flags = rule.pattern.slice(lastSlash + 1) || "i";
        const regex = new RegExp(regexBody, flags);
        if (!regex.test(tx.merchant) && !regex.test(normMerchant)) {
          return false;
        }
      } catch {
        if (!normMerchant.includes(normPattern)) return false;
      }
    } else {
      if (!normMerchant.includes(normPattern)) {
        return false;
      }
    }
  }

  // 2. Account ID or Label matching
  if (rule.accountId) {
    if (tx.accountId && tx.accountId !== rule.accountId) {
      return false;
    }
  }
  if (rule.accountLabel && tx.accountLabel) {
    const normAccountLabel = normalizeConcept(tx.accountLabel);
    const normRuleAccount = normalizeConcept(rule.accountLabel);
    if (!normAccountLabel.includes(normRuleAccount)) {
      return false;
    }
  }

  // 3. Amount boundaries
  const absAmount = Math.abs(tx.amount);
  if (rule.minAmount != null && absAmount < rule.minAmount) {
    return false;
  }
  if (rule.maxAmount != null && absAmount > rule.maxAmount) {
    return false;
  }

  return true;
}

/**
 * Converts rule configuration to application split & payer representations.
 */
export function resolveRuleAssignment(
  rule: AssignmentRule,
  currentAccountLabel?: string
): {
  payer: "memberA" | "memberB" | "joint";
  split: "50/50" | "memberA" | "memberB" | "ignored";
} {
  let payer: "memberA" | "memberB" | "joint" = "joint";
  let split: "50/50" | "memberA" | "memberB" | "ignored" = "50/50";

  if (rule.assignTo === "IGNORED" || rule.splitRatio === 0) {
    payer = "joint";
    split = "ignored";
  } else if (rule.assignTo === "JOINT") {
    payer = "joint";
    split = "50/50";
  } else if (rule.assignTo === "USER_A") {
    payer = "memberA";
    split = rule.splitRatio === 0.5 ? "50/50" : "memberA";
  } else if (rule.assignTo === "USER_B") {
    payer = "memberB";
    split = rule.splitRatio === 0.5 ? "50/50" : "memberB";
  }

  // If current account label strongly indicates the payer, respect physical card owner as payer
  if (currentAccountLabel) {
    const normAcc = currentAccountLabel.toLowerCase();
    if (normAcc.includes("santander") || normAcc.includes("user_a") || normAcc.includes("persona a")) {
      payer = "memberA";
    } else if (normAcc.includes("caixabank") || normAcc.includes("user_b") || normAcc.includes("persona b")) {
      payer = "memberB";
    }
  }

  return { payer, split };
}

/**
 * Evaluates a list of rules in order and returns the first matching evaluation.
 */
export function evaluateRules(
  rules: AssignmentRule[],
  tx: {
    merchant: string;
    amount: number;
    accountId?: string | null;
    accountLabel?: string | null;
  }
): RuleEvaluationResult | null {
  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    if (matchesRule(rule, tx)) {
      const { payer, split } = resolveRuleAssignment(rule, tx.accountLabel || undefined);
      return {
        matchedRule: rule,
        assignTo: rule.assignTo,
        split,
        payer,
        categoryName: rule.categoryName || undefined,
        status: "auto_assigned",
        reason: rule.name
          ? `Regla: ${rule.name}`
          : `Regla automática coincidente con "${rule.pattern}"`,
      };
    }
  }

  return null;
}
