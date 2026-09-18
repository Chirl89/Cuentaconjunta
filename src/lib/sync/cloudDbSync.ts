import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Transaction, BankAccount, CategoryInfo } from "@/context/TransactionsContext";

export interface CloudHouseholdState {
  household_code: string;
  transactions: Transaction[];
  accounts: BankAccount[];
  settlements: Record<string, any>;
  categories?: CategoryInfo[];
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
  }
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined" || !inviteCode) {
    return { success: false, error: "Offline or missing invite code" };
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

    const { error } = await (supabase as any)
      .from("household_state")
      .upsert(payload, { onConflict: "household_code" });

    if (error) {
      console.warn("Supabase household_state upsert warning:", error.message);
      return { success: false, error: error.message };
    }

    // Mirror to FITDUO standard row if current code is custom, so both stay permanently synced
    if (cleanCode !== "FITDUO") {
      try {
        await (supabase as any)
          .from("household_state")
          .upsert({ ...payload, household_code: "FITDUO" }, { onConflict: "household_code" });
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    console.warn("Exception during cloud sync upsert:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetches the latest household state from Supabase database.
 * Merges across household records so card movements uploaded under any code (e.g. FITDUO vs custom)
 * are always available on all devices.
 */
export async function fetchStateFromCloud(inviteCode: string): Promise<CloudHouseholdState | null> {
  if (typeof window === "undefined" || !inviteCode) return null;

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
    const exactRow = allRows.find((r: any) => r.household_code === cleanCode);

    // 2. Aggregate all transactions (ensuring card movements from any row are never missed)
    const txMap = new Map<string, Transaction>();

    if (exactRow && Array.isArray(exactRow.transactions)) {
      for (const t of exactRow.transactions) {
        txMap.set(t.id, t);
      }
    }

    for (const r of allRows) {
      if (Array.isArray(r.transactions)) {
        for (const t of r.transactions) {
          if (!txMap.has(t.id) || t.id.startsWith("card_")) {
            txMap.set(t.id, t);
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
      updated_at: exactRow?.updated_at || allRows[0]?.updated_at,
    };

    // If current row had missing card items, update it back to Supabase
    if (!exactRow || (exactRow.transactions?.length || 0) < mergedTransactions.length) {
      (supabase as any)
        .from("household_state")
        .upsert(
          {
            household_code: cleanCode,
            transactions: mergedTransactions,
            accounts: resultState.accounts,
            settlements: resultState.settlements,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "household_code" }
        )
        .then(() => {})
        .catch(() => {});
    }

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
    .channel(`db_changes_household_${cleanCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "household_state",
      },
      (payload) => {
        if (payload.new) {
          onRemoteUpdate(payload.new as CloudHouseholdState);
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
