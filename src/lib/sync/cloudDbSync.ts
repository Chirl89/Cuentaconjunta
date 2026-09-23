import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Transaction, BankAccount, CategoryInfo } from "@/context/TransactionsContext";

export interface CloudHouseholdState {
  household_code: string;
  transactions: Transaction[];
  accounts: BankAccount[];
  settlements: Record<string, any>;
  categories?: CategoryInfo[];
  rules?: any[];
  category_learnings?: any[];
  updated_at?: string;
}

/**
 * Pushes household financial state to Supabase PostgreSQL table 'household_state'.
 * This ensures persistence across different physical devices (PC, iPhone, iPad)
 * regardless of whether both devices are online at the same time.
 */
export async function pushStateToCloud(
  inviteCode: string,
  state: {
    transactions?: Transaction[];
    accounts?: BankAccount[];
    settlements?: Record<string, any>;
    categories?: CategoryInfo[];
    rules?: any[];
    category_learnings?: any[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined" || !inviteCode) {
    return { success: false, error: "Offline or missing invite code" };
  }

  if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))) {
    return { success: true };
  }

  const cleanCode = inviteCode.trim().toUpperCase();

  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { success: false, error: "No Supabase client" };

    const payload: Partial<CloudHouseholdState> = {
      household_code: cleanCode,
      updated_at: new Date().toISOString(),
    };

    if (state.transactions !== undefined) payload.transactions = state.transactions;
    if (state.accounts !== undefined) payload.accounts = state.accounts;
    if (state.settlements !== undefined) payload.settlements = state.settlements;
    if (state.categories !== undefined) payload.categories = state.categories;
    if (state.rules !== undefined) payload.rules = state.rules;
    if (state.category_learnings !== undefined) payload.category_learnings = state.category_learnings;

    // We push to the active code and mirror to both FITDUO and HKGMQB so all devices stay permanently synchronized
    const codesToUpdate = Array.from(new Set([cleanCode, "FITDUO", "HKGMQB"]));

    await Promise.all(
      codesToUpdate.map(async (code) => {
        try {
          const { error } = await (supabase as any)
            .from("household_state")
            .upsert({ ...payload, household_code: code }, { onConflict: "household_code" });

          if (error) {
            console.warn(`Supabase household_state upsert warning (${code}):`, error.message);
          }
        } catch (upsertErr: any) {
          console.warn(`Exception during cloud sync upsert for ${code}:`, upsertErr?.message);
        }
      })
    );

    return { success: true };
  } catch (err: any) {
    console.warn("Exception during cloud sync upsert:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetches the latest household state from Supabase database.
 * Merges across household records so card movements uploaded under any code (e.g. FITDUO vs custom)
 * are always available on all devices, while preserving classified and non-accounted states.
 */
export async function fetchStateFromCloud(inviteCode: string): Promise<CloudHouseholdState | null> {
  if (typeof window === "undefined" || !inviteCode) return null;

  if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))) {
    return null;
  }

  const cleanCode = inviteCode.trim().toUpperCase();

  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    const { data: allRows, error } = await (supabase as any)
      .from("household_state")
      .select("*");

    if (error || !allRows || allRows.length === 0) {
      return null;
    }

    // 1. Find the row matching current household code (or fallback to latest)
    const exactRow = allRows.find((r: any) => r.household_code === cleanCode) || allRows[0];

    // 2. Aggregate all transactions starting from exactRow
    const txMap = new Map<string, Transaction>();

    if (exactRow && Array.isArray(exactRow.transactions)) {
      for (const t of exactRow.transactions) {
        txMap.set(t.id, t);
      }
    }

    // Incorporate any missing transactions from other rows (e.g. card imports done under another code),
    // but never let a remote pending transaction overwrite an already classified/ignored transaction.
    for (const r of allRows) {
      if (r.household_code === exactRow.household_code) continue;
      if (Array.isArray(r.transactions)) {
        for (const t of r.transactions) {
          if (!txMap.has(t.id)) {
            txMap.set(t.id, t);
          } else {
            const current = txMap.get(t.id)!;
            if (current.status === "pending" && t.status === "classified") {
              txMap.set(t.id, t);
            } else if ((t.updatedAt || 0) > (current.updatedAt || 0) && t.status === "classified") {
              txMap.set(t.id, t);
            }
          }
        }
      }
    }

    const mergedTransactions = Array.from(txMap.values());

    const resultState: CloudHouseholdState = {
      household_code: cleanCode,
      transactions: mergedTransactions,
      accounts: exactRow?.accounts || allRows[0]?.accounts || [],
      settlements: exactRow?.settlements || allRows[0]?.settlements || {},
      categories: exactRow?.categories || allRows[0]?.categories,
      rules: exactRow?.rules || allRows[0]?.rules || [],
      category_learnings: exactRow?.category_learnings || allRows[0]?.category_learnings || [],
      updated_at: exactRow?.updated_at || allRows[0]?.updated_at,
    };

    return resultState;
  } catch (err: any) {
    console.warn("Error fetching cloud state:", err?.message);
    return null;
  }
}

/**
 * Subscribes to PostgreSQL database changes on household_state via Supabase Realtime.
 */
export function subscribeHouseholdDbChanges(
  inviteCode: string,
  onRemoteUpdate: (state: CloudHouseholdState) => void
) {
  if (typeof window === "undefined" || !inviteCode) return () => {};

  const cleanCode = inviteCode.trim().toUpperCase();
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`db_changes_household_${cleanCode}_${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "household_state",
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          if (
            row.household_code === cleanCode ||
            row.household_code === "FITDUO" ||
            row.household_code === "HKGMQB"
          ) {
            onRemoteUpdate(row as CloudHouseholdState);
          }
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
  };
}
