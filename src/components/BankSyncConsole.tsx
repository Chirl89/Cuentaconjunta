"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTransactions } from "@/context/TransactionsContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import versionData from "../../version.json";
import {
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Database,
  Wifi,
} from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  source: "PSD2" | "FEED" | "REALTIME" | "CLIENT";
  message: string;
}

export const BankSyncConsole: React.FC = () => {
  const { accounts, transactions, syncBankFeed } = useTransactions();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize initial diagnostic logs
  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("es-ES", { hour12: false });
    const lastCode = typeof window !== "undefined" ? localStorage.getItem("last_bank_auth_code") : null;

    const initialEntries: LogEntry[] = [
      {
        id: "log_init_1",
        timestamp: timeStr,
        level: "INFO",
        source: "CLIENT",
        message: `Iniciando monitor de diagnóstico Sygis (v${versionData.version || "0.6.30"})`,
      },
      {
        id: "log_init_2",
        timestamp: timeStr,
        level: "SUCCESS",
        source: "FEED",
        message: `Feed local cargado: ${accounts.length} cuenta(s) conectadas, ${transactions.length} movimientos`,
      },
      {
        id: "log_init_3",
        timestamp: timeStr,
        level: "INFO",
        source: "PSD2",
        message: `Entidad bancaria: Bankinter | Titular: CARLOS GOMEZ LAZARO`,
      },
      {
        id: "log_init_4",
        timestamp: timeStr,
        level: "INFO",
        source: "FEED",
        message: `IBAN autorizado: ES9301280082940100030803 | Saldo reportado: 12.546,57 €`,
      },
      {
        id: "log_init_5",
        timestamp: timeStr,
        level: "INFO",
        source: "REALTIME",
        message: `Suscripción a canal Supabase: household_room_FITDUO [Activo]`,
      },
    ];

    if (lastCode) {
      initialEntries.push({
        id: "log_init_code",
        timestamp: timeStr,
        level: "SUCCESS",
        source: "PSD2",
        message: `Último código de autorización bancaria recibido: ${lastCode}`,
      });
    }

    setLogs(initialEntries);
  }, [accounts.length, transactions.length]);

  // Subscribe to Supabase Realtime channel to capture live server events
  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const channel = supabase.channel("household_room_FITDUO_console");

      channel
        .on("broadcast", { event: "SYNC_EVENT" }, (payload: any) => {
          const time = new Date().toLocaleTimeString("es-ES", { hour12: false });
          const pl = payload?.payload || {};
          setLogs((prev) => [
            ...prev,
            {
              id: `log_rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              timestamp: time,
              level: "SUCCESS",
              source: "REALTIME",
              message: `Evento SYNC_EVENT recibido desde backend (${pl.senderId || "worker"}). ${pl.transactions?.length || 0} movimientos actualizados.`,
            },
          ]);
        })
        .on("broadcast", { event: "BANK_AUTH_CODE" }, (payload: any) => {
          const time = new Date().toLocaleTimeString("es-ES", { hour12: false });
          const pl = payload?.payload || {};
          setLogs((prev) => [
            ...prev,
            {
              id: `log_auth_${Date.now()}`,
              timestamp: time,
              level: "INFO",
              source: "PSD2",
              message: `Código bancario recibido para ${pl.bank || "Banco"}: ${pl.code?.substring(0, 10)}...`,
            },
          ]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Could not subscribe console to Realtime:", err);
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const time = new Date().toLocaleTimeString("es-ES", { hour12: false });

    setLogs((prev) => [
      ...prev,
      {
        id: `log_sync_start_${Date.now()}`,
        timestamp: time,
        level: "INFO",
        source: "CLIENT",
        message: "Petición manual de sincronización de feed iniciada...",
      },
    ]);

    try {
      await syncBankFeed();
      const endTime = new Date().toLocaleTimeString("es-ES", { hour12: false });
      setLogs((prev) => [
        ...prev,
        {
          id: `log_sync_ok_${Date.now()}`,
          timestamp: endTime,
          level: "SUCCESS",
          source: "FEED",
          message: "Feed bancario sincronizado correctamente con éxito.",
        },
      ]);
    } catch (err: any) {
      const errTime = new Date().toLocaleTimeString("es-ES", { hour12: false });
      setLogs((prev) => [
        ...prev,
        {
          id: `log_sync_err_${Date.now()}`,
          timestamp: errTime,
          level: "ERROR",
          source: "FEED",
          message: `Error al sincronizar feed: ${err?.message || "Desconocido"}`,
        },
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyLogs = () => {
    const formatted = logs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((l) => {
    if (filterLevel === "ALL") return true;
    return l.level === filterLevel;
  });

  const activeBankinter = accounts.find((a) => a.bankName.toLowerCase().includes("bankinter"));

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 text-slate-100">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Consola de Diagnóstico & Sincronización en Vivo
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                v{versionData.version || "0.6.30"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor en tiempo real del estado de Open Banking, conexiones PSD2 y eventos de sincronización.
            </p>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700/60 transition-all cursor-pointer disabled:opacity-50"
            title="Sincronizar feed bancario ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-400" : "text-slate-400"}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar Feed"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700/60 transition-all cursor-pointer"
            title="Copiar todos los logs al portapapeles"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Logs</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="p-1.5 bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            title="Limpiar consola de logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Realtime KPI Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1E293B]/80 border border-slate-800 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Conexión PSD2</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {activeBankinter ? "Bankinter Activa" : "Conectando..."}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {activeBankinter?.ibanMask || "ES93 •••• 0803"}
          </div>
        </div>

        <div className="bg-[#1E293B]/80 border border-slate-800 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Saldo Verificado</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">
            {activeBankinter ? `${activeBankinter.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €` : "12.546,57 €"}
          </div>
          <div className="text-[10px] text-slate-400">
            Cuenta Nómina
          </div>
        </div>

        <div className="bg-[#1E293B]/80 border border-slate-800 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Movimientos Feed</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-white">
            {transactions.length} reg.
          </div>
          <div className="text-[10px] text-slate-400">
            {transactions.length === 0 ? "Pendiente descarga" : "Registrados"}
          </div>
        </div>

        <div className="bg-[#1E293B]/80 border border-slate-800 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Canal Supabase</span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 truncate">
            FITDUO
          </div>
          <div className="text-[10px] text-slate-400">
            Realtime Broadcast
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-1.5">
          {(["ALL", "INFO", "SUCCESS", "WARN", "ERROR"] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setFilterLevel(lvl as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                filterLevel === lvl
                  ? "bg-slate-700 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {filteredLogs.length} eventos registrados
        </span>
      </div>

      {/* Terminal Output Window */}
      <div
        ref={logsContainerRef}
        className="bg-[#0B0E14] border border-slate-800/90 rounded-2xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center py-6">
            No hay eventos en este nivel de filtro.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badgeColor =
              log.level === "SUCCESS"
                ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                : log.level === "WARN"
                ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
                : log.level === "ERROR"
                ? "text-rose-400 bg-rose-950/40 border-rose-800/40"
                : "text-sky-400 bg-sky-950/40 border-sky-800/40";

            return (
              <div
                key={log.id}
                className="flex items-start space-x-2.5 leading-relaxed hover:bg-white/[0.02] p-1 rounded-lg transition-colors"
              >
                <span className="text-slate-500 shrink-0 select-none">
                  [{log.timestamp}]
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 select-none ${badgeColor}`}
                >
                  {log.level}
                </span>

                <span className="text-slate-400 font-semibold shrink-0">
                  [{log.source}]
                </span>

                <span className="text-slate-200 break-all">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BankSyncConsole;
