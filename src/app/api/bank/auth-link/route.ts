import { NextResponse } from "next/server";
import { gocardless } from "@/lib/bank/gocardless";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institutionId, redirectUrl } = body;

    if (!institutionId) {
      return NextResponse.json(
        { success: false, error: "El identificador de la institución (institutionId) es requerido" },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const defaultRedirect = `${origin}/api/bank/callback`;
    const finalRedirect = redirectUrl || defaultRedirect;

    const requisition = await gocardless.createAuthLink({
      institutionId,
      redirectUrl: finalRedirect,
    });

    return NextResponse.json({
      success: true,
      requisitionId: requisition.id,
      authUrl: requisition.link,
      status: requisition.status,
      isMock: requisition.isMock || false,
    });
  } catch (error) {
    console.error("Error creating bank auth link:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar enlace de autorización bancaria PSD2",
      },
      { status: 500 }
    );
  }
}
