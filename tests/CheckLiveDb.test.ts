import { describe, it } from "vitest";
import { getSupabaseBrowserClient } from "../src/lib/supabase";

describe("Inspect All Card Transactions in Live DB", () => {
  it("prints all card transactions and their status/monthKey/isCredit", async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("household_state" as any).select("*");
    console.log("HOUSEHOLD CODE IN DB:", data?.[0]?.household_code);
    const txs: any[] = data?.[0]?.transactions || [];
    const cardTxs = txs.filter((t) => t.id?.startsWith("card_"));
    console.log("TOTAL CARD TXS:", cardTxs.length);
    console.log("CARD TXS SUMMARY:", cardTxs.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      amount: t.amount,
      monthKey: t.monthKey,
      status: t.status,
      isCredit: t.isCredit,
    })));
  }, 10000);
});
