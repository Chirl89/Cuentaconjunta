import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export interface SaveAccountPayload {
  id: string;
  bankName: string;
  accountName: string;
  ibanMask: string;
  ownership: "USER_A" | "USER_B" | "JOINT";
  balance: number;
  institutionId?: string;
  requisitionId?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accounts, requisitionId, householdId } = body as {
      accounts: SaveAccountPayload[];
      requisitionId?: string;
      householdId?: string;
    };

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { success: false, error: "La lista de cuentas no puede estar vacía" },
        { status: 400 }
      );
    }

    // Validate ownership on every account
    for (const acc of accounts) {
      if (!["USER_A", "USER_B", "JOINT"].includes(acc.ownership)) {
        return NextResponse.json(
          {
            success: false,
            error: `Titularidad inválida para la cuenta ${acc.accountName}. Debe ser USER_A, USER_B o JOINT.`,
          },
          { status: 400 }
        );
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

    return NextResponse.json({
      success: true,
      savedCount: accounts.length,
      savedToSupabase,
      accounts: accounts.map((acc) => ({
        ...acc,
        connectedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days PSD2
        status: "active",
      })),
    });
  } catch (error) {
    console.error("Error saving bank accounts:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al guardar cuentas bancarias" },
      { status: 500 }
    );
  }
}
