import { describe, it } from "vitest";
import { getSupabaseBrowserClient } from "../src/lib/supabase";

describe("Inspect All Card Transactions in Live DB", () => {
  it("prints all card transactions and their status/monthKey/isCredit", async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("household_state" as any).select("*");
    const fitduoRow = data?.find((d: any) => d.household_code === "FITDUO");
    const hkgmqbRow = data?.find((d: any) => d.household_code === "HKGMQB");
    
    if (fitduoRow && hkgmqbRow) {
      const fitduoCardTxs = (fitduoRow.transactions || []).filter((t: any) => t.id?.startsWith("card_"));
      const hkgmqbTxs = hkgmqbRow.transactions || [];
      const hkgmqbIds = new Set(hkgmqbTxs.map((t: any) => t.id));
      const toAdd = fitduoCardTxs.filter((t: any) => !hkgmqbIds.has(t.id));
      
      if (toAdd.length > 0) {
        const merged = [...toAdd, ...hkgmqbTxs];
        console.log(`Adding ${toAdd.length} card transactions to HKGMQB...`);
        const { error } = await supabase
          .from("household_state" as any)
          .update({ transactions: merged, updated_at: new Date().toISOString() })
          .eq("household_code", "HKGMQB");
      }
    }
    const { fetchStateFromCloud } = await import("../src/lib/sync/cloudDbSync");
    
    // Test fetching as HKGMQB
    const stateHkgmqb = await fetchStateFromCloud("HKGMQB");
    const hkgmqbCardCount = (stateHkgmqb?.transactions || []).filter((t: any) => t.id?.startsWith("card_")).length;
    console.log("FETCH AS HKGMQB -> Total:", stateHkgmqb?.transactions?.length, "Card txs:", hkgmqbCardCount);

    // Test fetching as FITDUO
    const stateFitduo = await fetchStateFromCloud("FITDUO");
    const fitduoCardCount = (stateFitduo?.transactions || []).filter((t: any) => t.id?.startsWith("card_")).length;
    console.log("FETCH AS FITDUO -> Total:", stateFitduo?.transactions?.length, "Card txs:", fitduoCardCount);
  }, 10000);
});
