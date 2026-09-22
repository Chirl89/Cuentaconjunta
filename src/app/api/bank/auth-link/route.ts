import { NextRequest, NextResponse } from "next/server";
import { importPKCS8, SignJWT } from "jose";
import {
  DEFAULT_ENABLEBANKING_APP_ID,
  DEFAULT_ENABLEBANKING_PRIVATE_KEY,
} from "@/lib/bank/credentials";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bankName = body.bankName || "Bankinter";
    const country = body.country || "ES";
    const redirectUrl = body.redirectUrl || "https://chirl89.github.io/Cuentaconjunta/";

    const appId = process.env.ENABLEBANKING_APP_ID || DEFAULT_ENABLEBANKING_APP_ID;
    const rawKey = process.env.ENABLEBANKING_PRIVATE_KEY || DEFAULT_ENABLEBANKING_PRIVATE_KEY;

    if (!appId || !rawKey) {
      return NextResponse.json(
        { success: false, error: "Credenciales de Enable Banking no configuradas" },
        { status: 500 }
      );
    }

    let cleanPem = rawKey.replace(/\\n/g, "\n").trim();
    if (!cleanPem.includes("-----BEGIN")) {
      cleanPem = `-----BEGIN PRIVATE KEY-----\n${cleanPem}\n-----END PRIVATE KEY-----`;
    }

    const key = await importPKCS8(cleanPem, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: appId })
      .sign(key);

    const validUntil = new Date(Date.now() + 90 * 86400000).toISOString();
    const state = `${bankName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

    const res = await fetch("https://api.enablebanking.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        access: {
          valid_until: validUntil,
        },
        aspsp: {
          name: bankName,
          country,
        },
        psu_type: "personal",
        state,
        redirect_url: redirectUrl,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: `Enable Banking error ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      url: data.url,
      sessionId: data.authorization_id || data.session_id || state,
      expiresAt: validUntil,
      bankName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error interno al generar enlace bancario" },
      { status: 500 }
    );
  }
}
