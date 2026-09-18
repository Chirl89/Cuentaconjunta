"use client";

import React, { useState, useRef } from "react";
import { useTransactions } from "@/context/TransactionsContext";
import { parseSpanishBankStatement, parseBankinterExcel, ParsedBankMovement } from "@/lib/bank/importer";
import {
  RefreshCw,
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ShieldCheck,
  ExternalLink,
  Clipboard,
  Smartphone,
  Laptop,
  FileSpreadsheet,
} from "lucide-react";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBankConnect: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onOpenBankConnect,
}) => {
  const { syncBankFeed, importBankMovements, accounts } = useTransactions();
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [bankSyncMessage, setBankSyncMessage] = useState<string | null>(null);
  const [cardExtractText, setCardExtractText] = useState("");
  const [parsedCardMovements, setParsedCardMovements] = useState<ParsedBankMovement[]>([]);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccessMsg, setCardSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"account" | "card">("card");
  const [isLaunchingBrowser, setIsLaunchingBrowser] = useState(false);
  const [browserSyncStatus, setBrowserSyncStatus] = useState<string | null>(null);
  const [detectedCardInfo, setDetectedCardInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      setCardError(null);
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setCardError("Tu navegador no permite acceso directo al portapapeles. Pega el texto directamente en el recuadro.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setCardError("El portapapeles está vacío. Copia los movimientos en Bankinter y vuelve a pulsar este botón.");
        return;
      }
      handleCardTextChange(text);
    } catch (err: any) {
      setCardError("No se pudo leer el portapapeles: concede permisos a Safari o pega el texto en el área inferior.");
    }
  };

  const handleLaunchBankinterBrowser = async () => {
    setIsLaunchingBrowser(true);
    setBrowserSyncStatus("Iniciando pasarela oficial de Bankinter...");
    try {
      // Detect static web deployments (GitHub Pages) where Next.js Node API routes do not run
      const isStaticHosting = typeof window !== "undefined" && (window.location.hostname.includes("github.io") || window.location.protocol === "file:");
      if (isStaticHosting) {
        setIsLaunchingBrowser(false);
        setBrowserSyncStatus("ℹ️ En la Web móvil (GitHub Pages) no hay servidor local ejecutándose. Para extraer movimientos en tu móvil, pulsa 'Abrir Web de Bankinter' abajo, copia los movimientos y pulsa 'Pegar del Portapapeles'.");
        return;
      }

      const res = await fetch("/api/sync/launch-card-sync", { method: "POST" });
      if (!res.ok) {
        setIsLaunchingBrowser(false);
        setBrowserSyncStatus(`Aviso: Servidor devolvió estado ${res.status}. Esta función requiere el servidor local en PC.`);
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setIsLaunchingBrowser(false);
        setBrowserSyncStatus("Aviso: El servidor no devolvió una respuesta JSON válida.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setBrowserSyncStatus("Ventana de Bankinter abierta en tu pantalla. Introduce tus claves en Bankinter.");
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch("/api/sync/launch-card-sync");
            if (!statusRes.ok) return;
            const ct = statusRes.headers.get("content-type") || "";
            if (!ct.includes("application/json")) return;
            const statusData = await statusRes.json();
            if (statusData.status === "WAITING_USER_LOGIN") {
              setBrowserSyncStatus("Introduce tu usuario y contraseña en la ventana de Bankinter...");
            } else if (statusData.status === "EXTRACTING") {
              setBrowserSyncStatus("¡Sesión iniciada con éxito! Extrayendo compras de la tarjeta...");
            } else if (statusData.status === "COMPLETED") {
              clearInterval(pollInterval);
              setIsLaunchingBrowser(false);
              setBrowserSyncStatus("✅ ¡Sincronización completada! Compras de la tarjeta incorporadas.");
              await syncBankFeed();
            } else if (statusData.status === "ERROR") {
              clearInterval(pollInterval);
              setIsLaunchingBrowser(false);
              setBrowserSyncStatus("⚠️ " + (statusData.error || "Se detuvo la sincronización."));
            }
          } catch {
            // ignore poll error
          }
        }, 2000);
      } else {
        setIsLaunchingBrowser(false);
        setBrowserSyncStatus("Error: " + (data.error || "No se pudo abrir la ventana."));
      }
    } catch (err: any) {
      setIsLaunchingBrowser(false);
      setBrowserSyncStatus("Aviso de sincronización: " + (err.message || "Error al contactar con el servicio."));
    }
  };

  const bankinterAccount = accounts.find(
    (a) => a.bankName.toLowerCase().includes("bankinter") || a.id.includes("bankinter")
  );

  const handleSyncBank = async () => {
    setIsSyncingBank(true);
    setBankSyncMessage(null);
    try {
      await syncBankFeed();
      setBankSyncMessage("¡Cuenta sincronizada con éxito! Todos los movimientos están al día.");
    } catch {
      setBankSyncMessage("Error al sincronizar con el banco. Inténtalo de nuevo.");
    } finally {
      setIsSyncingBank(false);
    }
  };

  const handleCardTextChange = (text: string) => {
    setCardExtractText(text);
    setCardError(null);
    setCardSuccessMsg(null);

    if (text.trim().length > 10) {
      const result = parseSpanishBankStatement(text, "Bankinter");
      if (result.success && result.movements.length > 0) {
        setParsedCardMovements(result.movements);
      } else {
        setParsedCardMovements([]);
        if (result.error) setCardError(result.error);
      }
    } else {
      setParsedCardMovements([]);
    }
  };

  const handleImportCardMovements = () => {
    if (parsedCardMovements.length === 0) return;

    importBankMovements(
      parsedCardMovements.map((m) => ({
        id: m.id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        concept: m.concept,
        amount: m.amount,
        date: m.date,
        monthKey: m.monthKey,
        bankName: "Bankinter",
        accountLabel: detectedCardInfo || "Tarjeta Bankinter (VISA)",
        ownership: "USER_A" as const,
      }))
    );

    setCardSuccessMsg(`¡${parsedCardMovements.length} compras de la tarjeta incorporadas y sincronizadas con la nube!`);
    setCardExtractText("");
    setParsedCardMovements([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isExcel = fileNameLower.endsWith(".xls") || fileNameLower.endsWith(".xlsx");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buffer = ev.target?.result;
        if (buffer instanceof ArrayBuffer) {
          const result = parseBankinterExcel(buffer);
          if (result.success && result.movements.length > 0) {
            setParsedCardMovements(result.movements);
            setDetectedCardInfo(`${result.cardName} (${result.cardNumber || "VISA"})`);
            setCardError(null);
            setCardSuccessMsg(`¡${result.totalMovements} compras extraídas de ${file.name}!`);
          } else {
            setParsedCardMovements([]);
            setCardError(result.error || "No se pudieron extraer movimientos del archivo Excel.");
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          handleCardTextChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#00A37A] flex items-center justify-center shadow-xs">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Sincronizar Movimientos
              </h2>
              <p className="text-xs text-slate-500">
                Actualiza tu cuenta corriente y tus compras de tarjeta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Cuenta vs Tarjeta */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/80 p-1.5 gap-1.5 mx-6 mt-4 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab("account")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === "account"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cuenta Nómina</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("card")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === "card"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tarjeta VISA Clásica</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: CUENTA CORRIENTE */}
          {activeSubTab === "account" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-900">
                      Conexión Oficial Bankinter (PSD2)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Autorizada para <strong>Carlos</strong> hasta el{" "}
                  <strong>16 de diciembre de 2026</strong> (90 días). Sincroniza al
                  instante sin necesidad de introducir códigos SMS.
                </p>
                {bankinterAccount && (
                  <div className="pt-2 flex items-center justify-between text-xs text-emerald-900 font-bold border-t border-emerald-200/60">
                    <span>Saldo reportado:</span>
                    <span>{bankinterAccount.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</span>
                  </div>
                )}
              </div>

              {bankSyncMessage && (
                <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bankSyncMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncBank}
                disabled={isSyncingBank}
                className="w-full py-3.5 rounded-2xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingBank ? "animate-spin" : ""}`} />
                <span>
                  {isSyncingBank ? "Sincronizando con Bankinter..." : "Sincronizar Cuenta Nómina Ahora"}
                </span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBankConnect();
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  ¿Caducaron los 90 días? Renovar autorización bancaria con SMS
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TARJETA VISA */}
          {activeSubTab === "card" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-indigo-950">
                      Sincronización Directa de Tarjeta VISA
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                    100% Automático
                  </span>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Bankinter no expone tarjetas de crédito en su pasarela PSD2 (solo cuentas con IBAN). 
                  Para tener tus compras sin guardar contraseñas en código, elige tu método:
                </p>
              </div>

              {/* Action Buttons: Mobile Excel Upload, Direct Link & Desktop Runner */}
              <div className="space-y-3">
                {/* 1. Bankinter Direct Flow (Descargar Excel en 1 clic y cargar) */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sincronización con Excel Oficial Bankinter:</span>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="https://bancaonline.bankinter.com/tarjetas/secure/tarjetas_ficha.xhtml?INDEX_CTA=5"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>1. Abrir Tarjeta Bankinter</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span>2. Cargar Excel</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xls,.xlsx,.csv"
                    className="hidden"
                  />

                  <p className="text-[11px] text-indigo-800/80 leading-tight">
                    En Bankinter pulsa <strong>Descargar Excel</strong> en tu tarjeta. Luego pulsa <strong>Cargar Excel</strong> y selecciona el archivo (<em>movimientos.xls</em>). Se extraerán todas las compras al instante sin manualidad.
                  </p>
                </div>

                {/* 2. Desktop Auto Runner */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Laptop className="w-3.5 h-3.5 text-slate-600" />
                      <span>Desde PC (Servidor Local):</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">Automatizado</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchBankinterBrowser}
                    disabled={isLaunchingBrowser}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {isLaunchingBrowser ? "Ventana Abierta en Pantalla..." : "Abrir Ventana Chrome en PC"}
                    </span>
                  </button>
                </div>

                {browserSyncStatus && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                      browserSyncStatus.includes("✅")
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : browserSyncStatus.includes("⚠️") || browserSyncStatus.includes("Error")
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-indigo-50 border-indigo-200 text-indigo-950"
                    }`}
                  >
                    {isLaunchingBrowser ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    ) : browserSyncStatus.includes("✅") ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="leading-snug">{browserSyncStatus}</span>
                  </div>
                )}

                {cardError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cardError}</span>
                  </div>
                )}

                {cardSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{cardSuccessMsg}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seguridad y Privacidad Estricta:</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tus credenciales nunca se guardan en variables ni en repositorios; te autenticas siempre directamente en el entorno oficial de Bankinter.
                  </p>
                </div>
              </div>

              {/* Parsed movements preview */}
              {parsedCardMovements.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div>
                      <span>{parsedCardMovements.length} compras detectadas:</span>
                      {detectedCardInfo && (
                        <span className="block text-[10px] text-indigo-600 font-semibold">{detectedCardInfo}</span>
                      )}
                    </div>
                    <span className="text-indigo-600 font-extrabold">Listo para añadir</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {parsedCardMovements.slice(0, 6).map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 block truncate text-[11px]">
                            {m.concept}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {m.date}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs shrink-0">
                          {m.amount.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                    {parsedCardMovements.length > 6 && (
                      <div className="text-center text-[10px] text-slate-400 py-1 font-semibold">
                        + {parsedCardMovements.length - 6} compras más...
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportCardMovements}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Incorporar {parsedCardMovements.length} Compras a Cuenta Conjunta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
