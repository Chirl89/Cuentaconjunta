"use client";

import React, { useState } from "react";
import { useTransactions } from "@/context/TransactionsContext";
import { parseSpanishBankStatement, ParsedBankMovement } from "@/lib/bank/importer";
import {
  RefreshCw,
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ShieldCheck,
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
  const [activeSubTab, setActiveSubTab] = useState<"account" | "card">("account");

  if (!isOpen) return null;

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
        id: `card_${Date.now()}_${m.id}`,
        concept: m.concept,
        amount: m.amount,
        date: m.date,
        monthKey: m.monthKey,
        bankName: "Bankinter",
        accountLabel: "Tarjeta Bankinter (VISA)",
        ownership: "USER_A" as const,
      }))
    );

    setCardSuccessMsg(`¡${parsedCardMovements.length} compras de la tarjeta importadas con éxito!`);
    setCardExtractText("");
    setParsedCardMovements([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        handleCardTextChange(text);
      }
    };
    reader.readAsText(file);
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
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-indigo-950">
                    Compras y Movimientos de Tarjeta VISA
                  </span>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Bankinter únicamente expone cuentas corrientes en la API abierta europea PSD2. 
                  Para incorporar tus compras diarias de la VISA Clásica sin bloqueos anti-bot, 
                  carga el extracto descargado desde la App de Bankinter:
                </p>
              </div>

              {/* Upload file or paste text */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar archivo (Excel/CSV de Bankinter)</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    O pega el texto/tabla de movimientos aquí:
                  </span>
                  <textarea
                    rows={3}
                    value={cardExtractText}
                    onChange={(e) => handleCardTextChange(e.target.value)}
                    placeholder="Fecha;Concepto;Importe&#10;15/09/2026;Mercadona;-45,30&#10;12/09/2026;Restaurante;-32,00"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {cardError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{cardError}</span>
                </div>
              )}

              {cardSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{cardSuccessMsg}</span>
                </div>
              )}

              {/* Parsed movements preview */}
              {parsedCardMovements.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{parsedCardMovements.length} compras detectadas:</span>
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
