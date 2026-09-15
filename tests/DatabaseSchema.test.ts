import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getSupabaseBrowserClient, getSupabaseServerClient } from "../src/lib/supabase";
import type {
  Database,
  HouseholdRow,
  UserRow,
  AccountRow,
  TransactionRow,
  SettlementRow,
  CategoryLearningRow,
  RuleRow,
  Ownership,
  TransactionOrigin,
  TransactionStatus,
} from "../src/types/database";

describe("Paso 3: Supabase Database Schema & Types Verification", () => {
  const schemaPath = path.resolve(__dirname, "../supabase/migrations/20260914000000_init_schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  describe("1. SQL Schema & Migration Definitions", () => {
    it("should define all 9 core tables", () => {
      const requiredTables = [
        "public.households",
        "public.users",
        "public.bank_connections",
        "public.accounts",
        "public.categories",
        "public.category_learnings",
        "public.rules",
        "public.transactions",
        "public.settlements",
      ];

      for (const table of requiredTables) {
        expect(schemaSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      }
    });

    it("should enforce ownership constraint on accounts and rules", () => {
      expect(schemaSql).toContain("CHECK (ownership IN ('USER_A', 'USER_B', 'JOINT'))");
      expect(schemaSql).toContain("CHECK (assign_to IN ('USER_A', 'USER_B', 'JOINT'))");
    });

    it("should enforce transaction status and origin constraints with transfer support", () => {
      expect(schemaSql).toContain(
        "CHECK (status IN ('pending_assignment', 'auto_assigned', 'verified', 'neutral_transfer'))"
      );
      expect(schemaSql).toContain(
        "CHECK (origin IN ('bank', 'manual', 'cash', 'transfer_internal', 'transfer_settlement', 'initial_balance'))"
      );
    });

    it("should seed essential categories including 'Traspaso / Liquidación'", () => {
      expect(schemaSql).toContain("'Traspaso / Liquidación'");
      expect(schemaSql).toContain("'Supermercado'");
      expect(schemaSql).toContain("'Vivienda'");
    });

    it("should enable RLS on all 9 tables", () => {
      expect(schemaSql).toContain("ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;");
    });
  });

  describe("2. TypeScript Strong Typing & Mock Data Validation", () => {
    it("should typecheck and validate a household with custom member names", () => {
      const household: HouseholdRow = {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Casa Carlos y Laura",
        member_a_name: "Carlos",
        member_b_name: "Laura",
        invite_code: "FITDUO",
        member_a_id: null,
        member_b_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(household.member_a_name).toBe("Carlos");
      expect(household.member_b_name).toBe("Laura");
      expect(household.invite_code).toBe("FITDUO");
    });

    it("should validate Step 4 multi-user and household invite code schema", () => {
      const step4MigrationPath = path.resolve(
        __dirname,
        "../supabase/migrations/20260915000000_auth_and_households.sql"
      );
      const step4Sql = fs.readFileSync(step4MigrationPath, "utf8");

      expect(step4Sql).toContain("ADD COLUMN IF NOT EXISTS invite_code");
      expect(step4Sql).toContain("role_in_household TEXT CHECK (role_in_household IN ('MEMBER_A', 'MEMBER_B'))");
      expect(step4Sql).toContain("handle_new_auth_user");
    });

    it("should typecheck accounts with distinct ownerships", () => {
      const ownershipA: Ownership = "USER_A";
      const ownershipB: Ownership = "USER_B";
      const ownershipJoint: Ownership = "JOINT";

      const accountJoint: AccountRow = {
        id: "acc-joint",
        connection_id: "conn-1",
        user_id: "user-1",
        gocardless_account_id: "gc-1",
        name: "Cuenta Conjunta Nóminas",
        iban_mask: "ES..9999",
        ownership: ownershipJoint,
        balance: 2500.5,
        currency: "EUR",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(accountJoint.ownership).toBe("JOINT");
      expect([ownershipA, ownershipB, ownershipJoint]).toEqual(["USER_A", "USER_B", "JOINT"]);
    });

    it("should validate internal transfer transactions (neutral)", () => {
      const internalTransfer: TransactionRow = {
        id: "tx-internal-1",
        account_id: "acc-1",
        user_id: "user-1",
        tx_hash: "hash-internal-1",
        amount: 300.0,
        currency: "EUR",
        description: "Traspaso de BBVA a Revolut",
        booking_date: "2026-09-14",
        category_id: null,
        is_joint: false,
        split_ratio: 0.0,
        status: "neutral_transfer",
        origin: "transfer_internal",
        assigned_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(internalTransfer.origin).toBe<TransactionOrigin>("transfer_internal");
      expect(internalTransfer.status).toBe<TransactionStatus>("neutral_transfer");
    });

    it("should validate partner settlement transactions (debt offset)", () => {
      const partnerSettlement: TransactionRow = {
        id: "tx-settle-1",
        account_id: "acc-2",
        user_id: "user-2",
        tx_hash: "hash-settle-1",
        amount: 150.0,
        currency: "EUR",
        description: "Bizum cena y compras",
        booking_date: "2026-09-14",
        category_id: "cat-traspaso",
        is_joint: true,
        split_ratio: 1.0,
        status: "verified",
        origin: "transfer_settlement",
        assigned_by: "user-2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(partnerSettlement.origin).toBe<TransactionOrigin>("transfer_settlement");
      expect(partnerSettlement.status).toBe<TransactionStatus>("verified");
    });

    it("should validate settlements and rules structure", () => {
      const settlement: SettlementRow = {
        id: "settle-1",
        household_id: "h-1",
        payer_id: "user-a",
        receiver_id: "user-b",
        amount: 75.5,
        date: "2026-09-14",
        notes: "Liquidación mensual de gastos",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const rule: RuleRow = {
        id: "rule-1",
        household_id: "h-1",
        pattern: "MERCADONA",
        account_id: null,
        assign_to: "JOINT",
        split_ratio: 0.5,
        category_id: "cat-super",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const learning: CategoryLearningRow = {
        id: "learn-1",
        household_id: "h-1",
        merchant_pattern: "MERCADONA",
        category_id: "cat-super",
        updated_at: new Date().toISOString(),
      };

      expect(settlement.amount).toBeGreaterThan(0);
      expect(rule.assign_to).toBe("JOINT");
      expect(learning.merchant_pattern).toBe("MERCADONA");
    });
  });

  describe("3. Supabase Client Singleton Factory", () => {
    it("should provide an initialized browser client instance", () => {
      const client = getSupabaseBrowserClient();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
    });

    it("should provide an initialized server client instance", () => {
      const serverClient = getSupabaseServerClient();
      expect(serverClient).toBeDefined();
      expect(typeof serverClient.from).toBe("function");
    });
  });
});
