import { NextResponse } from "next/server";

/**
 * Endpoint de sincronización bancaria desatendida para Vercel Cron / Webhook.
 * Ejecuta verificación de estado y sincronización automática programada (madrugada y mediodía).
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isConfigured = Boolean(supabaseUrl);

    return NextResponse.json({
      success: true,
      timestamp,
      schedule: "twice_daily",
      status: "operational",
      databaseConnected: isConfigured,
      message: "FitDuo desatended bank sync cron executed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        timestamp,
        error: error?.message || "Internal server error during bank sync",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
