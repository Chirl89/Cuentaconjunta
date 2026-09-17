import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const STATUS_FILE = path.resolve(process.cwd(), "data/card-sync-status.json");

export async function GET() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
      return NextResponse.json(data);
    }
    return NextResponse.json({ status: "IDLE" });
  } catch (err: any) {
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const initialStatus = {
      status: "LAUNCHING",
      timestamp: Date.now(),
      message: "Iniciando pasarela de Bankinter...",
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(initialStatus, null, 2), "utf8");

    const scriptPath = path.resolve(process.cwd(), "scripts/login-and-sync-card.js");

    const child = spawn("node", [scriptPath], {
      detached: true,
      stdio: "ignore",
      cwd: process.cwd(),
      windowsHide: false,
    });

    child.unref();

    return NextResponse.json({
      success: true,
      status: "LAUNCHED",
      message: "Ventana de Bankinter abierta en pantalla.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
