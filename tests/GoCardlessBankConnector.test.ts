import { describe, it, expect } from "vitest";
import { GoCardlessClient, SPANISH_INSTITUTIONS, gocardless } from "../src/lib/bank/gocardless";
import {
  getBankInstitutions,
  createBankAuthLink,
  getAccountsFromBankRequisition,
  saveDiscoveredAccounts,
} from "../src/lib/bank/service";

describe("Paso 5: Conector Open Banking (GoCardless PSD2 - Conexión Bancaria y Titularidad)", () => {
  describe("1. GoCardlessClient Service & Sandbox Provider", () => {
    it("initializes client and detects live credentials correctly", () => {
      const mockClient = new GoCardlessClient("test-secret-id", "test-secret-key");
      expect(mockClient.hasLiveCredentials()).toBe(true);

      const unconfiguredClient = new GoCardlessClient(
        "your-gocardless-secret-id",
        "your-gocardless-secret-key"
      );
      expect(unconfiguredClient.hasLiveCredentials()).toBe(false);
    });

    it("returns curated Spanish banking institutions with logos and bic", async () => {
      const client = new GoCardlessClient();
      const institutions = await client.getInstitutions("ES");

      expect(institutions.length).toBeGreaterThanOrEqual(8);
      const names = institutions.map((i) => i.name);
      expect(names).toContain("BBVA");
      expect(names).toContain("Banco Santander");
      expect(names).toContain("CaixaBank / Imagin");
      expect(names).toContain("Revolut (IBAN ES)");
      expect(names).toContain("ING");
    });

    it("creates a requisition auth link in sandbox/mock mode without live keys", async () => {
      const client = new GoCardlessClient();
      const res = await client.createAuthLink({
        institutionId: "SANTANDER_BSANESMM",
        redirectUrl: "http://localhost:3000/",
      });

      expect(res.id).toBeDefined();
      expect(res.link).toContain("/bank/mock-auth");
      expect(res.link).toContain("requisition_id=");
      expect(res.isMock).toBe(true);
      expect(res.status).toBe("CR");
    });

    it("retrieves discovered accounts and balances from a requisition", async () => {
      const client = new GoCardlessClient();
      const auth = await client.createAuthLink({
        institutionId: "BBVA_BBVAESMM",
        redirectUrl: "http://localhost:3000/",
      });

      const discovered = await client.getAccountsFromRequisition(auth.id);

      expect(discovered.requisitionId).toBe(auth.id);
      expect(discovered.accounts.length).toBeGreaterThan(0);
      expect(discovered.accounts[0].balance).toBeGreaterThan(0);
      expect(discovered.accounts[0].ibanMask).toMatch(/^ES\d{2}/);
    });
  });

  describe("2. Bank Service Operations (Static Export & Client Ready)", () => {
    it("getBankInstitutions returns institutions list and mode", async () => {
      const data = await getBankInstitutions("ES");

      expect(data.success).toBe(true);
      expect(Array.isArray(data.institutions)).toBe(true);
      expect(data.institutions.length).toBeGreaterThan(0);
    });

    it("createBankAuthLink validates parameters and generates requisition", async () => {
      // Missing institutionId
      const badRes = await createBankAuthLink({ institutionId: "" });
      expect(badRes.success).toBe(false);
      expect(badRes.error).toBeDefined();

      // Valid call
      const res = await createBankAuthLink({ institutionId: "CAIXABANK_CAIXESBB" });
      expect(res.success).toBe(true);
      expect(res.requisitionId).toBeDefined();
      expect(res.authUrl).toBeDefined();
    });

    it("getAccountsFromBankRequisition returns accounts list", async () => {
      const auth = await gocardless.createAuthLink({
        institutionId: "REVOLUT_REVUES21",
        redirectUrl: "http://localhost:3000/",
      });

      const data = await getAccountsFromBankRequisition(auth.id);

      expect(data.success).toBe(true);
      expect(data.accounts).toBeDefined();
      expect(data.accounts!.length).toBeGreaterThan(0);
      expect(data.accounts![0].ibanMask).toBeDefined();
    });

    it("saveDiscoveredAccounts validates and returns accounts with ownership", async () => {
      // Invalid ownership
      const invalidRes = await saveDiscoveredAccounts({
        accounts: [
          {
            id: "acc-test-1",
            bankName: "BBVA",
            accountName: "Cuenta Nómina",
            ibanMask: "ES12 •••• 1234",
            ownership: "INVALID_OWNER" as any,
            balance: 1500,
          },
        ],
      });
      expect(invalidRes.success).toBe(false);

      // Valid ownerships (USER_A, USER_B, JOINT)
      const validRes = await saveDiscoveredAccounts({
        accounts: [
          {
            id: "acc-test-a",
            bankName: "BBVA",
            accountName: "Cuenta Personal Carlos",
            ibanMask: "ES12 •••• 1234",
            ownership: "USER_A",
            balance: 1500,
          },
          {
            id: "acc-test-joint",
            bankName: "Santander",
            accountName: "Cuenta Hogar",
            ibanMask: "ES44 •••• 5678",
            ownership: "JOINT",
            balance: 3200,
          },
        ],
      });

      expect(validRes.success).toBe(true);
      expect(validRes.savedCount).toBe(2);
      expect(validRes.accounts![0].status).toBe("active");
      expect(validRes.accounts![0].expiresAt).toBeDefined();
      expect(validRes.accounts![0].ownership).toBe("USER_A");
      expect(validRes.accounts![1].ownership).toBe("JOINT");
    });
  });
});
