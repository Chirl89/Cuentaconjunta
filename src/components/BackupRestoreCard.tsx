"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Layers,
  Database,
  ShieldCheck,
  FileJson,
  X,
} from "lucide-react";
import { useTransactions } from "@/context/TransactionsContext";
import {
  validateLocalBackup,
  triggerBackupDownload,
  LocalBackupPayload,
} from "@/lib/backup/localBackup";

interface BackupRestoreCardProps {
  onNotify?: (message: string) => void;
}

export function BackupRestoreCard({ onNotify }: BackupRestoreCardProps) {
  const {
    transactions,
    accounts,
    rules,
    learnings,
    categories,
    exportLocalBackup,
    importLocalBackup,
  } = useTransactions();

  const [isExporting, setIsExporting] = useState(false);
  const [selectedFilePayload, setSelectedFilePayload] = useState<LocalBackupPayload | null>(null);
  const [fileValidationMessage, setFileValidationMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exportar copia de seguridad en JSON
  const handleExportBackup = () => {
    try {
      setIsExporting(true);
      const payload = exportLocalBackup();
      const filename = triggerBackupDownload(payload);
      setLastExportedFile(filename);
      const msg = `✓ Copia de seguridad exportada con éxito (${payload.metadata.totalTransactions} movimientos, ${payload.metadata.totalRules} reglas).`;
      if (onNotify) onNotify(msg);
    } catch (err: any) {
      console.error("Error al exportar copia de seguridad:", err);
      if (onNotify) onNotify("Error al exportar la copia de seguridad.");
    } finally {
      setIsExporting(false);
    }
  };

  // Manejar selección de archivo para restaurar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setFileValidationMessage(null);
    setSelectedFilePayload(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = validateLocalBackup(text);

        if (!result.valid || !result.payload) {
          setValidationError(result.error || "El archivo seleccionado no es una copia de seguridad válida.");
          return;
        }

        setSelectedFilePayload(result.payload);
        setFileValidationMessage(
          `Copia verificada correctamente (${result.payload.metadata.totalTransactions} movimientos, ` +
          `${result.payload.metadata.totalAccounts} cuentas, ${result.payload.metadata.totalRules} reglas).`
        );
      } catch (err: any) {
        setValidationError(`Error al procesar el archivo: ${err?.message || "Archivo dañado"}`);
      }
    };
    reader.onerror = () => {
      setValidationError("Error al leer el archivo desde el dispositivo.");
    };
    reader.readAsText(file);
  };

  // Confirmar y aplicar la restauración
  const handleConfirmRestore = () => {
    if (!selectedFilePayload) return;

    try {
      setIsRestoring(true);
      const res = importLocalBackup(selectedFilePayload, restoreMode);
      if (res.success) {
        if (onNotify) onNotify(res.message);
        setSelectedFilePayload(null);
        setFileValidationMessage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setValidationError(res.message);
      }
    } catch (err: any) {
      console.error("Error al restaurar:", err);
      setValidationError("Ocurrió un error inesperado al restaurar los datos.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelFile = () => {
    setSelectedFilePayload(null);
    setValidationError(null);
    setFileValidationMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
            <HardDrive className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Copia de Seguridad y Restauración Local (JSON)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                SHA-256 Verificado
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Exporta una copia completa estructurada para resguardo en tu dispositivo o restaura una copia previa en caso de migración o contingencia.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto shrink-0 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>Capa 2 • Respaldo Local</span>
        </span>
      </div>

      {/* Grid de 2 columnas: Exportar vs Restaurar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PANEL 1: EXPORTAR COPIA DE SEGURIDAD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Descargar Copia de Seguridad
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600">
                Formato .json
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Genera un archivo con todos tus movimientos, cuentas y tarjetas conectadas, reglas aprendidas por IA, liquidaciones de deuda y categorías personalizadas.
            </p>

            {/* Métricas a exportar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-2 rounded-xl border border-slate-200/70 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Movimientos</span>
                <span className="text-xs font-black text-slate-900">{transactions.length}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/70 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Cuentas</span>
                <span className="text-xs font-black text-slate-900">{accounts.length}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/70 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Reglas</span>
                <span className="text-xs font-black text-slate-900">{rules.length}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/70 text-center shadow-xs">
                <span className="text-[10px] text-slate-400 block font-medium">Memoria IA</span>
                <span className="text-xs font-black text-slate-900">{learnings.length}</span>
              </div>
            </div>

            {lastExportedFile && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Última copia generada: <strong>{lastExportedFile}</strong></span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>Descargar Copia de Seguridad JSON</span>
          </button>
        </div>

        {/* PANEL 2: RESTAURAR COPIA DE SEGURIDAD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/20 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Restaurar Copia de Seguridad
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">
                Validación Automática
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Selecciona un archivo JSON exportado previamente para restablecer los datos de tu cuenta en este dispositivo.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="backup-file-input"
            />

            {/* Error de validación */}
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">No se pudo cargar la copia:</span>
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-rose-500 hover:text-rose-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Archivo válido cargado y listo para confirmar */}
            {selectedFilePayload && (
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Copia válida • {selectedFilePayload.metadata.exportedAt ? new Date(selectedFilePayload.metadata.exportedAt).toLocaleDateString() : ""}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelFile}
                    className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <p>
                    <strong>Versión:</strong> {selectedFilePayload.version} • <strong>Movimientos:</strong> {selectedFilePayload.metadata.totalTransactions} • <strong>Reglas:</strong> {selectedFilePayload.metadata.totalRules}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 truncate">
                    SHA-256: {selectedFilePayload.checksum}
                  </p>
                </div>

                {/* Selector de modo de restauración */}
                <div className="pt-1 border-t border-slate-100 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Modo de Restauración:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode("replace")}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        restoreMode === "replace"
                          ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-[11px]">Reemplazar Todo</span>
                      <span className="text-[9px] text-slate-400 font-normal">Restauración limpia</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode("merge")}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        restoreMode === "merge"
                          ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-[11px]">Fusionar (Merge)</span>
                      <span className="text-[9px] text-slate-400 font-normal">Sin duplicados</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!selectedFilePayload ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Seleccionar Archivo JSON de Respaldo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileCheck className="w-4 h-4 text-white" />
              )}
              <span>Confirmar y Restaurar {restoreMode === "replace" ? "Limpia" : "Fusionada"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
