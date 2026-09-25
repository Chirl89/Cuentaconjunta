"use client";

import React, { useState, useRef } from "react";
import { useTransactions } from "@/context/TransactionsContext";
import { parseUniversalBankExtract } from "@/lib/bank/importer";
import {
  RefreshCw,
  X,
  CreditCard,
  ExternalLink,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";

export type SupportedBankId = "bankinter" | "bbva" | "revolut";

export interface BankConfig {
  id: SupportedBankId;
  name: string;
  downloadUrl: string;
  brandColor: string;
  activeBorder: string;
  activeBg: string;
  badgeBg: string;
  badgeText: string;
  steps: string[];
}

export const SUPPORTED_BANKS: BankConfig[] = [
  {
    id: "bankinter",
    name: "Bankinter",
    downloadUrl:
      "https://bancaonline.bankinter.com/tarjetas/secure/tarjetas_ficha.xhtml?INDEX_CTA=5",
    brandColor: "#FA6400",
    activeBorder: "border-[#FA6400]",
    activeBg: "bg-orange-50/70",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    steps: [
      "Inicia sesión en Bankinter con tu usuario y contraseña.",
      "Accede a la sección Tarjetas en el menú y selecciona tu tarjeta.",
      "Pulsa en el botón Descargar Excel para obtener el fichero de movimientos (.xls / .xlsx).",
    ],
  },
  {
    id: "bbva",
    name: "BBVA",
    downloadUrl: "https://www.bbva.es/personas.html",
    brandColor: "#004481",
    activeBorder: "border-[#004481]",
    activeBg: "bg-blue-50/70",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    steps: [
      "Inicia sesión en la web o app móvil de BBVA con tus claves.",
      "Entra en tu Tarjeta y accede al apartado de Movimientos o Extractos.",
      "Pulsa en Descargar / Exportar y selecciona formato Excel (.xlsx) o CSV.",
    ],
  },
  {
    id: "revolut",
    name: "Revolut",
    downloadUrl: "https://app.revolut.com/",
    brandColor: "#191C1F",
    activeBorder: "border-slate-900",
    activeBg: "bg-slate-100/70",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-800",
    steps: [
      "Inicia sesión en Revolut Web (app.revolut.com) o abre tu app móvil.",
      "En tu cuenta o sección Tarjetas, pulsa en Extractos (o en el icono de los tres puntos ···).",
      "Selecciona el periodo deseado y pulsa Descargar en formato Excel o CSV.",
    ],
  },
];

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBankConnect?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const { importBankMovements, accounts, transactions, deleteMovementsByBank } = useTransactions();
  const [selectedBankId, setSelectedBankId] = useState<SupportedBankId>("bankinter");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentBank =
    SUPPORTED_BANKS.find((b) => b.id === selectedBankId) || SUPPORTED_BANKS[0];

  const bankMovementsCount = transactions.filter((t) => {
    const acc = (t.accountLabel || "").toLowerCase();
    const id = (t.id || "").toLowerCase();
    const bId = (t.bankMovementId || "").toLowerCase();
    return (
      acc.includes(currentBank.id) ||
      id.includes(currentBank.id) ||
      bId.includes(currentBank.id) ||
      acc.includes(currentBank.name.toLowerCase())
    );
  }).length;

  const handleBankSelect = (bankId: SupportedBankId) => {
    setSelectedBankId(bankId);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Active user role assignment: Carlos (USER_A) or Andrea (USER_B)
    const activeRole =
      typeof window !== "undefined"
        ? window.localStorage.getItem("fitduo_active_role")
        : null;
    const currentOwnership: "USER_A" | "USER_B" =
      activeRole === "memberB" ? "USER_B" : "USER_A";

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const buffer = ev.target?.result;
          if (buffer instanceof ArrayBuffer) {
            const result = parseUniversalBankExtract(buffer, currentBank.name);
            if (result.success && result.movements.length > 0) {
              const importRes = importBankMovements(
                result.movements.map((m) => ({
                  id: m.id,
                  concept: m.concept,
                  amount: m.amount,
                  date: m.date,
                  monthKey: m.monthKey,
                  bankName: currentBank.name,
                  accountLabel: result.cardName || `Tarjeta ${currentBank.name}`,
                  ownership: currentOwnership,
                  rawConcept: m.rawConcept || m.concept,
                  isCredit: m.isCredit,
                }))
              );

              if (importRes.added > 0) {
                setSuccessMessage(
                  `¡${importRes.added} compras de ${currentBank.name} incorporadas con éxito!${
                    importRes.duplicates > 0
                      ? ` (${importRes.duplicates} repetidas se omitieron)`
                      : ""
                  }`
                );
              } else {
                setSuccessMessage(
                  `Todos los movimientos del extracto (${importRes.duplicates}) ya estaban incorporados en la app.`
                );
              }
            } else {
              setErrorMessage(
                result.error ||
                  `No se detectaron movimientos válidos en el extracto de ${currentBank.name}.`
              );
            }
          }
        } catch (err: any) {
          setErrorMessage(`Error al procesar el archivo: ${err.message}`);
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result;
          if (typeof text === "string") {
            const result = parseUniversalBankExtract(text, currentBank.name);
            if (result.success && result.movements.length > 0) {
              const importRes = importBankMovements(
                result.movements.map((m) => ({
                  id: m.id,
                  concept: m.concept,
                  amount: m.amount,
                  date: m.date,
                  monthKey: m.monthKey,
                  bankName: currentBank.name,
                  accountLabel: result.cardName || `Tarjeta ${currentBank.name}`,
                  ownership: currentOwnership,
                  rawConcept: m.rawConcept || m.concept,
                  isCredit: m.isCredit,
                }))
              );

              if (importRes.added > 0) {
                setSuccessMessage(
                  `¡${importRes.added} compras de ${currentBank.name} incorporadas con éxito!${
                    importRes.duplicates > 0
                      ? ` (${importRes.duplicates} repetidas se omitieron)`
                      : ""
                  }`
                );
              } else {
                setSuccessMessage(
                  `Todos los movimientos del extracto (${importRes.duplicates}) ya estaban incorporados en la app.`
                );
              }
            } else {
              setErrorMessage(
                result.error ||
                  `No se detectaron movimientos válidos en el archivo de ${currentBank.name}.`
              );
            }
          }
        } catch (err: any) {
          setErrorMessage(`Error al leer el archivo: ${err.message}`);
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#00A37A] flex items-center justify-center shadow-xs">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Sincronizar Extracto
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Selector de Banco */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Seleccionar banco:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_BANKS.map((b) => {
                const isSelected = b.id === selectedBankId;
                const hasLoadedCard = accounts.some(
                  (acc) =>
                    acc.bankName.toLowerCase().includes(b.id) ||
                    acc.accountName.toLowerCase().includes(b.id)
                );

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBankSelect(b.id)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-98 ${
                      isSelected
                        ? `${b.activeBorder} ${b.activeBg} ring-2 ring-offset-1 ring-slate-400/20 shadow-xs font-extrabold text-slate-900`
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CreditCard
                        className="w-4 h-4 shrink-0"
                        style={{ color: b.brandColor }}
                      />
                      <span className="text-xs leading-none">{b.name}</span>
                    </div>
                    {hasLoadedCard && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        Cargada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información y botón para borrar movimientos previos del banco */}
          {bankMovementsCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-slate-700 font-medium truncate">
                  <strong className="text-slate-900 font-bold">{bankMovementsCount}</strong> {bankMovementsCount === 1 ? "movimiento registrado" : "movimientos registrados"} de {currentBank.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const deleted = deleteMovementsByBank(currentBank.id);
                  setSuccessMessage(`Se han borrado los ${deleted} movimientos de ${currentBank.name}. Ya puedes volver a cargar el extracto.`);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-100/70 font-bold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 text-xs active:scale-95"
                title={`Eliminar todos los movimientos de ${currentBank.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar movimientos</span>
              </button>
            </div>
          )}

          {/* 2. Botones de Acción: Descargar Extracto y Cargar Extracto en App */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href={currentBank.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-3 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-600" />
              <span>Descargar extracto</span>
            </a>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-3 rounded-2xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{isProcessing ? "Cargando..." : "Cargar extracto en app"}</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xls,.xlsx,.csv,.txt"
            className="hidden"
          />

          {/* Feedback messages */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 3. Miniguía por pasos de cómo descargar el extracto según el banco */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-850">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Cómo descargar el extracto en {currentBank.name}:</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1.5 pl-4 list-decimal leading-relaxed">
              {currentBank.steps.map((step, idx) => (
                <li key={idx} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
