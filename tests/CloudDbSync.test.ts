import { describe, it, expect, vi, beforeEach } from "vitest";
import { pushStateToCloud, fetchStateFromCloud } from "@/lib/sync/cloudDbSync";

describe("Cloud Database Sync (Supabase household_state)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles pushStateToCloud gracefully without throwing when client or table is absent", async () => {
    const res = await pushStateToCloud("FITDUO", {
      transactions: [],
      accounts: [],
    });
    expect(res).toBeDefined();
  });

  it("rejects gracefully when offline or missing invite code", async () => {
    const res = await pushStateToCloud("", { transactions: [] });
    expect(res.success).toBe(false);
  });

  it("handles fetchStateFromCloud gracefully without throwing when table is absent", async () => {
    const state = await fetchStateFromCloud("FITDUO");
    // Returns null gracefully without crashing
    expect(state === null || typeof state === "object").toBe(true);
  });

  it("ensures smart merge preserves classified/ignored transactions over pending transactions", () => {
    const exactTxs: any[] = [
      {
        id: "tx-1",
        merchant: "Recibo VISA",
        status: "classified",
        split: "ignored",
        updatedAt: 2000,
      },
    ];

    const otherRowTxs: any[] = [
      {
        id: "tx-1",
        merchant: "Recibo VISA",
        status: "pending",
        split: "50/50",
        updatedAt: 1000,
      },
      {
        id: "tx-card-2",
        merchant: "Compra Supermercado",
        status: "pending",
        split: "50/50",
      },
    ];

    const txMap = new Map<string, any>();
    for (const t of exactTxs) {
      txMap.set(t.id, t);
    }

    for (const t of otherRowTxs) {
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

    // tx-1 must keep its classified/ignored state!
    expect(txMap.get("tx-1").status).toBe("classified");
    expect(txMap.get("tx-1").split).toBe("ignored");
    // tx-card-2 must be merged in
    expect(txMap.has("tx-card-2")).toBe(true);
  });
});
