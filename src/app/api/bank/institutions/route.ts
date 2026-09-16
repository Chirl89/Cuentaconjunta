import { NextResponse } from "next/server";
import { gocardless } from "@/lib/bank/gocardless";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || "ES";

    const institutions = await gocardless.getInstitutions(country);
    const hasLiveCredentials = gocardless.hasLiveCredentials();

    return NextResponse.json({
      success: true,
      country,
      hasLiveCredentials,
      mode: hasLiveCredentials ? "live" : "sandbox",
      institutions,
    });
  } catch (error) {
    console.error("Error fetching bank institutions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron obtener las instituciones bancarias",
      },
      { status: 500 }
    );
  }
}
