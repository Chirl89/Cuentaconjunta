/**
 * Bank Service Module
 * Handles Open Banking PSD2 operations via Enable Banking (default) and GoCardless.
 * Compatible with Next.js static export (GitHub Pages) and client-side execution.
 */

import { enableBanking, ASPSP, EnableBankingAccount } from "./enablebanking";
import { gocardless, Institution, DiscoveredAccount } from "./gocardless";
import { BankAccount } from "@/context/TransactionsContext";
import { supabase } from "@/lib/supabase/client";

export type BankProvider = "enablebanking" | "gocardless";

export interface UnifiedBankInstitution {
  id: string;
  name: string;
  bic?: string;
  logo: string;
  isMock?: boolean;
  provider: BankProvider;
}

export interface SaveAccountInput {
  id: string;
  bankName: string;
  accountName: string;
  ibanMask: string;
  ownership: "USER_A" | "USER_B" | "JOINT";
  balance: number;
  institutionId?: string;
  requisitionId?: string;
  provider?: BankProvider;
}

/**
 * Get available bank institutions (Default: Enable Banking PSD2)
 */
export async function getBankInstitutions(
  country = "ES",
  provider: BankProvider = "enablebanking"
): Promise<{
  success: boolean;
  provider: BankProvider;
  institutions: UnifiedBankInstitution[];
  hasLiveCredentials: boolean;
  mode: "live" | "sandbox";
}> {
  if (provider === "enablebanking") {
    const aspsps = await enableBanking.getASPSPs(country);
    const hasLive = enableBanking.hasLiveCredentials();

    const unified: UnifiedBankInstitution[] = aspsps.map((a) => ({
      id: a.name,
      name: a.title,
      bic: a.bic,
      logo: a.logo,
      isMock: a.isMock,
      provider: "enablebanking",
    }));

    return {
      success: true,
      provider: "enablebanking",
      institutions: unified,
      hasLiveCredentials: hasLive,
      mode: hasLive ? "live" : "sandbox",
    };
  }

  // GoCardless fallback
  const gcInstitutions = await gocardless.getInstitutions(country);
  const hasLive = gocardless.hasLiveCredentials();
  return {
    success: true,
    provider: "gocardless",
    institutions: gcInstitutions.map((i) => ({
      id: i.id,
      name: i.name,
      bic: i.bic,
      logo: i.logo,
      isMock: i.isMock,
      provider: "gocardless",
    })),
    hasLiveCredentials: hasLive,
    mode: hasLive ? "live" : "sandbox",
  };
}

/**
 * Create Open Banking auth link (Default: Enable Banking)
 */
export async function createBankAuthLink(params: {
  institutionId: string;
  provider?: BankProvider;
  redirectUrl?: string;
}): Promise<{
  success: boolean;
  provider: BankProvider;
  requisitionId?: string;
  authUrl?: string;
  status?: string;
  isMock?: boolean;
  error?: string;
}> {
  const { institutionId, provider = "enablebanking", redirectUrl } = params;

  if (!institutionId) {
    return {
      success: false,
      provider,
      error: "El identificador de la institución (institutionId) es requerido",
    };
  }

  let finalRedirect = redirectUrl;
  if (!finalRedirect && typeof window !== "undefined") {
    const basePath = window.location.pathname.startsWith("/Cuentaconjunta") ? "/Cuentaconjunta" : "";
    finalRedirect = `${window.location.origin}${basePath}/`;
  }

  try {
    if (provider === "enablebanking") {
      const session = await enableBanking.startAuthorization({
        aspspName: institutionId,
        redirectUrl: finalRedirect || "http://localhost:3000/",
      });

      return {
        success: true,
        provider: "enablebanking",
        requisitionId: session.sessionId,
        authUrl: session.url,
        status: "AUTHORIZED_READY",
        isMock: session.isMock,
      };
    }

    const requisition = await gocardless.createAuthLink({
      institutionId,
      redirectUrl: finalRedirect || "http://localhost:3000/",
    });

    return {
      success: true,
      provider: "gocardless",
      requisitionId: requisition.id,
      authUrl: requisition.link,
      status: requisition.status,
      isMock: requisition.isMock || false,
    };
  } catch (err: any) {
    return {
      success: false,
      provider,
      error: err?.message || "Error al generar enlace de autorización bancaria PSD2",
    };
  }
}

/**
 * Retrieve discovered accounts from a session or requisition
 */
export async function getAccountsFromBankRequisition(
  sessionIdOrReqId: string,
  provider?: BankProvider
): Promise<{
  success: boolean;
  provider: BankProvider;
  requisitionId?: string;
  status?: string;
  accounts?: Array<{
    id: string;
    name: string;
    ibanMask: string;
    currency: string;
    balance: number;
    bankName: string;
    institutionId: string;
    ownerName?: string;
  }>;
  isMock?: boolean;
  error?: string;
}> {
  if (!sessionIdOrReqId) {
    return {
      success: false,
      provider: provider || "enablebanking",
      error: "El identificador de sesión bancaria es requerido",
    };
  }

  const isEb = sessionIdOrReqId.startsWith("eb_") || provider === "enablebanking";
  const activeProvider: BankProvider = isEb ? "enablebanking" : "gocardless";

  try {
    if (activeProvider === "enablebanking") {
      const result = await enableBanking.getAccountsFromSession(sessionIdOrReqId);
      return {
        success: true,
        provider: "enablebanking",
        requisitionId: result.sessionId,
        status: "ACTIVE",
        accounts: result.accounts.map((a) => ({
          ...a,
          institutionId: a.aspspName,
        })),
        isMock: result.isMock,
      };
    }

    const result = await gocardless.getAccountsFromRequisition(sessionIdOrReqId);
    return {
      success: true,
      provider: "gocardless",
      requisitionId: result.requisitionId,
      status: result.status,
      accounts: result.accounts,
      isMock: result.isMock,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: activeProvider,
      error: err?.message || "Error al recuperar cuentas del banco",
    };
  }
}

/**
 * Validate and save discovered bank accounts with their assigned ownership
 */
export async function saveDiscoveredAccounts(params: {
  accounts: SaveAccountInput[];
  requisitionId?: string;
  householdId?: string;
}): Promise<{
  success: boolean;
  savedCount?: number;
  savedToSupabase?: boolean;
  accounts?: BankAccount[];
  error?: string;
}> {
  const { accounts } = params;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    return {
      success: false,
      error: "La lista de cuentas no puede estar vacía",
    };
  }

  // Validate ownership on every account
  for (const acc of accounts) {
    if (!["USER_A", "USER_B", "JOINT"].includes(acc.ownership)) {
      return {
        success: false,
        error: `Titularidad inválida para la cuenta ${acc.accountName}. Debe ser USER_A, USER_B o JOINT.`,
      };
    }
  }

  // Optionally attempt insertion into Supabase if configured
  let savedToSupabase = false;
  if (supabase) {
    try {
      const rowsToInsert = accounts.map((acc) => ({
        name: `${acc.bankName} ${acc.accountName}`,
        iban_mask: acc.ibanMask,
        ownership: acc.ownership,
        balance: acc.balance,
        currency: "EUR",
        gocardless_account_id: acc.id,
        user_id:
          acc.ownership === "USER_B"
            ? "00000000-0000-0000-0000-000000000002"
            : "00000000-0000-0000-0000-000000000001",
      }));

      const { error } = await (supabase as any).from("accounts").insert(rowsToInsert);
      if (!error) {
        savedToSupabase = true;
      }
    } catch (err) {
      console.warn("Supabase insertion skipped or failed:", err);
    }
  }

  const bankAccounts: BankAccount[] = accounts.map((acc) => ({
    id: acc.id,
    bankName: acc.bankName,
    accountName: acc.accountName,
    ibanMask: acc.ibanMask,
    ownership: acc.ownership,
    balance: acc.balance,
    institutionId: acc.institutionId || "",
    connectedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  }));

  return {
    success: true,
    savedCount: accounts.length,
    savedToSupabase,
    accounts: bankAccounts,
  };
}
