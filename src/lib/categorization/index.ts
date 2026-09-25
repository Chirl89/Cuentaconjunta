/**
 * Unified Categorization, Feedback Loop, and Rules Engine Pipeline
 * Integrates:
 * 1. User-defined automated rules (Split, Payer, Category -> status = 'auto_assigned')
 * 2. Feedback loop memory (category_learnings -> overrides AI for category)
 * 3. Lightweight AI classifier (classifyConcept -> suggests initial category)
 * 4. Fallback default
 */

export * from "./classifier";
export * from "./learning";
export * from "./rulesEngine";

import { classifyConcept, isCardBillingStatement } from "./classifier";
import { findLearnedCategory, CategoryLearningItem } from "./learning";
import { evaluateRules, AssignmentRule } from "./rulesEngine";

export interface PipelineResult {
  category: string;
  categoryColor: string;
  status: "pending" | "auto_assigned";
  payer?: "memberA" | "memberB" | "joint";
  split?: "50/50" | "memberA" | "memberB" | "ignored";
  assignedBy: "rule" | "user_learning" | "ai" | "default";
  matchedRuleId?: string;
  matchedRuleName?: string;
  confidence: number;
  rationale: string;
}

export interface CategoryColorLookup {
  name: string;
  color: string;
}

/**
 * Executes the complete categorization and auto-assignment pipeline for a transaction.
 */
export function runCategorizationPipeline(
  tx: {
    merchant: string;
    amount: number;
    accountId?: string | null;
    accountLabel?: string | null;
  },
  rules: AssignmentRule[] = [],
  learnings: CategoryLearningItem[] = [],
  availableCategories: CategoryColorLookup[] = []
): PipelineResult {
  const resolveColor = (catName: string): string => {
    const found = availableCategories.find(
      (c) => c.name.toLowerCase().trim() === catName.toLowerCase().trim()
    );
    return found ? found.color : "#64748B";
  };

  // 1. Evaluate User Automated Rules (highest authority for splits & assignment)
  const ruleResult = evaluateRules(rules, tx);

  // Special built-in rule: Bank account debit for credit card statement (e.g. "Recibo VISA CLASICA")
  // Automatically marked as ignored ("No contabilizado") to prevent double counting
  if (!ruleResult && isCardBillingStatement(tx.merchant)) {
    return {
      category: "Liquidación / Neteo",
      categoryColor: resolveColor("Liquidación / Neteo"),
      status: "auto_assigned",
      payer: "joint",
      split: "ignored",
      assignedBy: "rule",
      confidence: 1.0,
      rationale: "Recibo/cargo mensual de tarjeta en cuenta corriente. Ignorado por defecto (No contabilizado) para evitar duplicidad.",
    };
  }

  // 2. Resolve Category:
  // Priority A: Rule explicitly defined a category
  if (ruleResult && ruleResult.categoryName) {
    return {
      category: ruleResult.categoryName,
      categoryColor: resolveColor(ruleResult.categoryName),
      status: "pending",
      payer: undefined,
      split: undefined,
      assignedBy: "rule",
      matchedRuleId: ruleResult.matchedRule.id,
      matchedRuleName: ruleResult.matchedRule.name,
      confidence: 1.0,
      rationale: ruleResult.reason,
    };
  }

  // Priority B: Feedback loop (User has previously classified/corrected this merchant)
  const learned = findLearnedCategory(tx.merchant, learnings);
  if (learned) {
    const category = learned.categoryName;
    return {
      category,
      categoryColor: resolveColor(category),
      status: "pending",
      payer: undefined,
      split: undefined,
      assignedBy: "user_learning",
      matchedRuleId: ruleResult?.matchedRule.id,
      matchedRuleName: ruleResult?.matchedRule.name,
      confidence: 0.99,
      rationale: `Aprendido por corrección previa del usuario (${learned.matchedPattern})`,
    };
  }

  // Priority C: Lightweight AI Heuristic Classifier
  const aiResult = classifyConcept(tx.merchant);
  const category = aiResult.category;

  if (ruleResult) {
    return {
      category,
      categoryColor: resolveColor(category),
      status: "pending",
      payer: undefined,
      split: undefined,
      assignedBy: "rule",
      matchedRuleId: ruleResult.matchedRule.id,
      matchedRuleName: ruleResult.matchedRule.name,
      confidence: aiResult.confidence,
      rationale: `${ruleResult.reason}. Categoría sugerida por IA (${aiResult.rationale})`,
    };
  }

  return {
    category,
    categoryColor: resolveColor(category),
    status: "pending",
    assignedBy: aiResult.confidence >= 0.5 ? "ai" : "default",
    confidence: aiResult.confidence,
    rationale: aiResult.rationale,
  };
}
