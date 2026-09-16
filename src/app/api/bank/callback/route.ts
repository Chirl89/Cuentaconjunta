import { NextResponse } from "next/server";
import { gocardless } from "@/lib/bank/gocardless";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requisitionId =
      searchParams.get("requisition_id") ||
      searchParams.get("ref") ||
      searchParams.get("id");

    if (!requisitionId) {
      return NextResponse.json(
        { success: false, error: "requisition_id o ref es requerido" },
        { status: 400 }
      );
    }

    const result = await gocardless.getAccountsFromRequisition(requisitionId);

    const acceptHeader = request.headers.get("accept") || "";
    const format = searchParams.get("format");

    // If client requested JSON
    if (format === "json" || acceptHeader.includes("application/json")) {
      return NextResponse.json({
        success: true,
        requisitionId: result.requisitionId,
        status: result.status,
        accounts: result.accounts,
        isMock: result.isMock,
      });
    }

    // If redirected via browser navigation from bank OAuth
    const origin = new URL(request.url).origin;
    const redirectUrl = new URL("/", origin);
    redirectUrl.searchParams.set("bank_auth_success", "true");
    redirectUrl.searchParams.set("requisition_id", requisitionId);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error in bank callback handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar el callback bancario",
      },
      { status: 500 }
    );
  }
}
