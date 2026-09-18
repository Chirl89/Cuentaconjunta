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

    return { success: true };
  } catch (err: any) {
    console.warn("Exception during cloud sync upsert:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetches the latest household state from Supabase database.
 * Used on mount, on focus/visibility change, and after bank sync.
 */
export async function fetchStateFromCloud(inviteCode: string): Promise<CloudHouseholdState | null> {
  if (typeof window === "undefined" || !inviteCode) return null;

  const cleanCode = inviteCode.trim().toUpperCase();

  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from("household_state")
      .select("*")
      .eq("household_code", cleanCode)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as CloudHouseholdState;
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
        filter: `household_code=eq.${cleanCode}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).household_code === cleanCode) {
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
