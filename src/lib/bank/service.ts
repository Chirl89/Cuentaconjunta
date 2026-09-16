/**
 * Bank Service Module
 * Handles Open Banking institutions catalog, requisition link generation,
 * account discovery, and persistence validation.
 * Compatible with Next.js static export (GitHub Pages) and client-side execution.
 */

import { gocardless, Institution, DiscoveredAccount } from "./gocardless";
import { BankAccount } from "@/context/TransactionsContext";
import { supabase } from "@/lib/supabase/client";

export interface SaveAccountInput {
  id: string;
  bankName: string;
  accountName: string;
  ibanMask: string;
  ownership: "USER_A" | "USER_B" | "JOINT";
  balance: number;
  institutionId?: string;
  requisitionId?: string;
}

/**
 * Get available bank institutions
 */
export async function getBankInstitutions(country = "ES"): Promise<{
  success: boolean;
  institutions: Institution[];
  hasLiveCredentials: boolean;
  mode: "live" | "sandbox";
}> {
  const institutions = await gocardless.getInstitutions(country);
  const hasLive = gocardless.hasLiveCredentials();
  return {
    success: true,
    institutions,
    hasLiveCredentials: hasLive,
    mode: hasLive ? "live" : "sandbox",
  };
}

/**
 * Create Open Banking auth link (requisition)
 */
export async function createBankAuthLink(params: {
  institutionId: string;
  redirectUrl?: string;
}): Promise<{
  success: boolean;
  requisitionId?: string;
  authUrl?: string;
  status?: string;
  isMock?: boolean;
  error?: string;
}> {
  const { institutionId, redirectUrl } = params;

  if (!institutionId) {
    return {
      success: false,
      error: "El identificador de la institución (institutionId) es requerido",
    };
  }

  let finalRedirect = redirectUrl;
  if (!finalRedirect && typeof window !== "undefined") {
    const basePath = window.location.pathname.startsWith("/Cuentaconjunta") ? "/Cuentaconjunta" : "";
    finalRedirect = `${window.location.origin}${basePath}/`;
  }

  try {
    const requisition = await gocardless.createAuthLink({
      institutionId,
      redirectUrl: finalRedirect || "http://localhost:3000/",
    });

    return {
      success: true,
      requisitionId: requisition.id,
      authUrl: requisition.link,
      status: requisition.status,
      isMock: requisition.isMock || false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error al generar enlace de autorización bancaria PSD2",
    };
  }
}

/**
 * Retrieve discovered accounts from a requisition
 */
export async function getAccountsFromBankRequisition(requisitionId: string): Promise<{
  success: boolean;
  requisitionId?: string;
  status?: string;
  accounts?: DiscoveredAccount[];
  isMock?: boolean;
  error?: string;
}> {
  if (!requisitionId) {
    return {
      success: false,
      error: "requisition_id es requerido",
    };
  }

  try {
    const result = await gocardless.getAccountsFromRequisition(requisitionId);
    return {
      success: true,
      requisitionId: result.requisitionId,
      status: result.status,
      accounts: result.accounts,
      isMock: result.isMock,
    };
  } catch (err: any) {
    return {
      success: false,
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
