import { describe, it, expect } from "vitest";
import {
  EnableBankingClient,
  SPANISH_ASPSPS,
  enableBanking,
} from "../src/lib/bank/enablebanking";
import {
  getBankInstitutions,
  createBankAuthLink,
  getAccountsFromBankRequisition,
  saveDiscoveredAccounts,
} from "../src/lib/bank/service";

describe("Paso 6: Conector Open Banking (Enable Banking PSD2 - Alternativa Sin Coste y Titularidad)", () => {
  describe("1. EnableBankingClient Service & ASPSPs Catalog", () => {
    it("initializes client and detects transparent built-in credentials correctly", () => {
      const defaultClient = new EnableBankingClient();
      expect(defaultClient.hasLiveCredentials()).toBe(true);
      expect(defaultClient.getApplicationId()).toBe("5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f");

      const unconfiguredClient = new EnableBankingClient(null, null);
      expect(unconfiguredClient.hasLiveCredentials()).toBe(false);
    });

    it("returns curated Spanish ASPSPs (banks) catalog with logos and bic", async () => {
      const client = new EnableBankingClient();
      const aspsps = await client.getASPSPs("ES");

      expect(aspsps.length).toBeGreaterThanOrEqual(10);
      const names = aspsps.map((a) => a.title);
      expect(names).toContain("Banco Santander");
      expect(names).toContain("BBVA");
      expect(names).toContain("CaixaBank / Imagin");
      expect(names).toContain("Revolut (IBAN ES)");
      expect(names).toContain("ING");
      expect(names).toContain("Banco Sabadell");
      expect(names).toContain("Bankinter");
      expect(names).toContain("Openbank");
      expect(names).toContain("Enable Banking Sandbox Bank");
    });

    it("creates an AIS authorization session in sandbox mode without live keys", async () => {
      const client = new EnableBankingClient();
      const session = await client.startAuthorization({
        aspspName: "Santander ES",
        redirectUrl: "http://localhost:3000/",
      });

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^eb_session_/);
      expect(session.url).toContain("/bank/mock-auth");
      expect(session.url).toContain("provider=enablebanking");
      expect(session.url).toContain("session_id=");
      expect(session.isMock).toBe(true);
    });

    it("retrieves discovered accounts and balances from an Enable Banking session", async () => {
      const client = new EnableBankingClient();
      const session = await client.startAuthorization({
        aspspName: "BBVA ES",
        redirectUrl: "http://localhost:3000/",
      });

      const discovered = await client.getAccountsFromSession(session.sessionId);

      expect(discovered.sessionId).toBe(session.sessionId);
      expect(discovered.accounts.length).toBeGreaterThan(0);
      expect(discovered.accounts[0].balance).toBeGreaterThan(0);
      expect(discovered.accounts[0].ibanMask).toMatch(/^ES\d{2}/);
      expect(discovered.accounts[0].bankName).toBe("BBVA");
    });
  });

  describe("2. Unified Bank Service Operations (Enable Banking Default)", () => {
    it("getBankInstitutions defaults to Enable Banking provider", async () => {
      const data = await getBankInstitutions("ES");

      expect(data.success).toBe(true);
      expect(data.provider).toBe("enablebanking");
      expect(Array.isArray(data.institutions)).toBe(true);
      expect(data.institutions.length).toBeGreaterThan(0);
      expect(data.institutions[0].provider).toBe("enablebanking");
    });

    it("createBankAuthLink generates Enable Banking requisition session", async () => {
      const res = await createBankAuthLink({
        institutionId: "CaixaBank ES",
        provider: "enablebanking",
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe("enablebanking");
      expect(res.requisitionId).toMatch(/^eb_session_/);
      expect(res.authUrl).toContain("session_id=");
    });

    it("getAccountsFromBankRequisition automatically recognizes Enable Banking session IDs", async () => {
      const auth = await enableBanking.startAuthorization({
        aspspName: "Revolut ES",
        redirectUrl: "http://localhost:3000/",
      });

      const data = await getAccountsFromBankRequisition(auth.sessionId);

      expect(data.success).toBe(true);
      expect(data.provider).toBe("enablebanking");
      expect(data.accounts).toBeDefined();
      expect(data.accounts!.length).toBeGreaterThan(0);
      expect(data.accounts![0].bankName).toBe("Revolut (IBAN ES)");
    });

    it("persists accounts with assigned ownership (USER_A, USER_B, JOINT)", async () => {
      const validRes = await saveDiscoveredAccounts({
        accounts: [
          {
            id: "eb-acc-1",
            bankName: "Banco Santander",
            accountName: "Cuenta Personal Carlos",
            ibanMask: "ES12 •••• 1111",
            ownership: "USER_A",
            balance: 2100,
          },
          {
            id: "eb-acc-2",
            bankName: "BBVA",
            accountName: "Cuenta Común Pareja",
            ibanMask: "ES34 •••• 2222",
            ownership: "JOINT",
            balance: 4300,
          },
        ],
      });

      expect(validRes.success).toBe(true);
      expect(validRes.savedCount).toBe(2);
      expect(validRes.accounts![0].status).toBe("active");
      expect(validRes.accounts![0].ownership).toBe("USER_A");
      expect(validRes.accounts![1].ownership).toBe("JOINT");
    });
  });
});
