import { describe, it, expect, beforeEach, vi } from "vitest";
import { GoCardlessClient, SPANISH_INSTITUTIONS, gocardless } from "../src/lib/bank/gocardless";
import { GET as getInstitutionsHandler } from "../src/app/api/bank/institutions/route";
import { POST as authLinkHandler } from "../src/app/api/bank/auth-link/route";
import { GET as callbackHandler } from "../src/app/api/bank/callback/route";
import { POST as saveAccountsHandler } from "../src/app/api/bank/save-accounts/route";

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
        redirectUrl: "http://localhost:3000/api/bank/callback",
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
        redirectUrl: "http://localhost:3000/api/bank/callback",
      });

      const discovered = await client.getAccountsFromRequisition(auth.id);

      expect(discovered.requisitionId).toBe(auth.id);
      expect(discovered.accounts.length).toBeGreaterThan(0);
      expect(discovered.accounts[0].balance).toBeGreaterThan(0);
      expect(discovered.accounts[0].ibanMask).toMatch(/^ES\d{2}/);
    });
  });

  describe("2. Backend API Endpoints (/api/bank/*)", () => {
    it("GET /api/bank/institutions returns institutions list and mode", async () => {
      const req = new Request("http://localhost:3000/api/bank/institutions?country=ES");
      const res = await getInstitutionsHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.country).toBe("ES");
      expect(Array.isArray(data.institutions)).toBe(true);
      expect(data.institutions.length).toBeGreaterThan(0);
    });

    it("POST /api/bank/auth-link validates parameters and generates requisition", async () => {
      // Missing institutionId
      const badReq = new Request("http://localhost:3000/api/bank/auth-link", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const badRes = await authLinkHandler(badReq);
      expect(badRes.status).toBe(400);

      // Valid call
      const req = new Request("http://localhost:3000/api/bank/auth-link", {
        method: "POST",
        body: JSON.stringify({ institutionId: "CAIXABANK_CAIXESBB" }),
      });
      const res = await authLinkHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requisitionId).toBeDefined();
      expect(data.authUrl).toBeDefined();
    });

    it("GET /api/bank/callback returns accounts in JSON format", async () => {
      const auth = await gocardless.createAuthLink({
        institutionId: "REVOLUT_REVUES21",
        redirectUrl: "http://localhost:3000/api/bank/callback",
      });

      const req = new Request(
        `http://localhost:3000/api/bank/callback?requisition_id=${auth.id}&format=json`
      );
      const res = await callbackHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accounts.length).toBeGreaterThan(0);
      expect(data.accounts[0].ibanMask).toBeDefined();
    });

    it("POST /api/bank/save-accounts validates and persists accounts with ownership", async () => {
      // Invalid ownership
      const invalidReq = new Request("http://localhost:3000/api/bank/save-accounts", {
        method: "POST",
        body: JSON.stringify({
          accounts: [
            {
              id: "acc-test-1",
              bankName: "BBVA",
              accountName: "Cuenta Nómina",
              ibanMask: "ES12 •••• 1234",
              ownership: "INVALID_OWNER",
              balance: 1500,
            },
          ],
        }),
      });
      const invalidRes = await saveAccountsHandler(invalidReq);
      expect(invalidRes.status).toBe(400);

      // Valid ownerships (USER_A, USER_B, JOINT)
      const validReq = new Request("http://localhost:3000/api/bank/save-accounts", {
        method: "POST",
        body: JSON.stringify({
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
        }),
      });

      const validRes = await saveAccountsHandler(validReq);
      const validData = await validRes.json();

      expect(validRes.status).toBe(200);
      expect(validData.success).toBe(true);
      expect(validData.savedCount).toBe(2);
      expect(validData.accounts[0].status).toBe("active");
      expect(validData.accounts[0].expiresAt).toBeDefined();
    });
  });
});
