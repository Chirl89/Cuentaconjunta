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
});
