"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { BankAccount } from "@/context/TransactionsContext";
import {
  Landmark,
  X,
  Search,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  CreditCard,
  Users,
  User,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
} from "lucide-react";

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsConnected: (accounts: BankAccount[]) => void;
  initialRequisitionId?: string | null;
}

interface BankInstitution {
  id: string;
  name: string;
  bic?: string;
  logo: string;
  isMock?: boolean;
}

interface DiscoveredAccountItem {
  id: string;
  name: string;
  ibanMask: string;
  currency: string;
  balance: number;
  bankName: string;
  institutionId: string;
  ownership: "USER_A" | "USER_B" | "JOINT";
}

export default function ConnectBankModal({
  isOpen,
  onClose,
  onAccountsConnected,
  initialRequisitionId,
}: ConnectBankModalProps) {
  const { memberAName, memberBName } = useUserNames();

  const [step, setStep] = useState<"SELECT_BANK" | "AUTHORIZING" | "ASSIGN_OWNERSHIP" | "SUCCESS">(
    "SELECT_BANK"
  );
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankInstitution | null>(null);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(false);

  // Authorization & Discovery state
  const [requisitionId, setRequisitionId] = useState<string | null>(initialRequisitionId || null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccountItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load institutions when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsLoadingInstitutions(true);
      fetch("/api/bank/institutions?country=ES")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
            setHasLiveCredentials(!!data.hasLiveCredentials);
          }
        })
        .catch((err) => {
          console.warn("Error loading institutions:", err);
        })
        .finally(() => {
          setIsLoadingInstitutions(false);
        });

      // If opened with an existing requisition from callback
      if (initialRequisitionId) {
        setRequisitionId(initialRequisitionId);
        loadAccountsFromRequisition(initialRequisitionId);
      }
    } else {
      // Reset state when closed
      setStep("SELECT_BANK");
      setSelectedBank(null);
      setSearchTerm("");
      setDiscoveredAccounts([]);
      setErrorMessage(null);
    }
  }, [isOpen, initialRequisitionId]);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm.trim()) return institutions;
    const term = searchTerm.toLowerCase();
    return institutions.filter((inst) => inst.name.toLowerCase().includes(term));
  }, [institutions, searchTerm]);

  // Step 1 -> Initiate Auth
  const handleSelectBank = async (bank: BankInstitution) => {
    setSelectedBank(bank);
    setIsProcessingAuth(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/bank/auth-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: bank.id,
          redirectUrl: `${window.location.origin}/api/bank/callback`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "No se pudo generar el enlace bancario");
      }

      setRequisitionId(data.requisitionId);
      setAuthUrl(data.authUrl);
      setStep("AUTHORIZING");

      // If mock flow, we can provide immediate simulation or button
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la entidad");
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Step 2 -> Load accounts from requisition
  const loadAccountsFromRequisition = async (reqId: string) => {
    setIsProcessingAuth(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bank/callback?requisition_id=${reqId}&format=json`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al recuperar cuentas del banco");
      }

      const rawAccounts = data.accounts || [];
      const formatted: DiscoveredAccountItem[] = rawAccounts.map(
        (acc: any, index: number): DiscoveredAccountItem => ({
          id: acc.id || `acc_${Date.now()}_${index}`,
          name: acc.name || "Cuenta Bancaria",
          ibanMask: acc.ibanMask || "ES00 •••• 0000",
          currency: acc.currency || "EUR",
          balance: acc.balance || 0,
          bankName: selectedBank?.name || acc.bankName || "Banco",
          institutionId: selectedBank?.id || acc.institutionId || "",
          // First account defaults to JOINT, second to USER_A or USER_B
          ownership: index === 0 ? "JOINT" : index === 1 ? "USER_A" : "USER_B",
        })
      );

      setDiscoveredAccounts(formatted);
      setStep("ASSIGN_OWNERSHIP");
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudieron obtener las cuentas");
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const handleUpdateOwnership = (
    index: number,
    ownership: "USER_A" | "USER_B" | "JOINT"
  ) => {
    setDiscoveredAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, ownership } : acc))
    );
  };

  // Step 3 -> Save accounts and finish
  const handleSaveAccounts = async () => {
    if (discoveredAccounts.length === 0) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/bank/save-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitionId,
          accounts: discoveredAccounts.map((acc) => ({
            id: acc.id,
            bankName: acc.bankName,
            accountName: acc.name,
            ibanMask: acc.ibanMask,
            ownership: acc.ownership,
            balance: acc.balance,
            institutionId: acc.institutionId,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error al guardar cuentas");
      }

      // Convert to context format
      const newBankAccounts: BankAccount[] = discoveredAccounts.map((acc) => ({
        id: acc.id,
        bankName: acc.bankName,
        accountName: acc.name,
        ibanMask: acc.ibanMask,
        ownership: acc.ownership,
        balance: acc.balance,
        institutionId: acc.institutionId,
        connectedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      }));

      onAccountsConnected(newBankAccounts);
      setStep("SUCCESS");
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar la asignación");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00D09C] flex items-center justify-center shadow-md shadow-[#00D09C]/20">
              <Landmark className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Conectar Banco (PSD2 Oficial)
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {step === "SELECT_BANK" && "Paso 1: Selecciona tu entidad bancaria"}
                {step === "AUTHORIZING" && "Paso 2: Autorización segura Open Banking"}
                {step === "ASSIGN_OWNERSHIP" && "Paso 3: Asigna titularidad a cada cuenta"}
                {step === "SUCCESS" && "¡Cuentas vinculadas con éxito!"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: SELECT BANK                                       */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && (
            <div className="space-y-4">
              {/* Informative Banner regarding GoCardless setup */}
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  hasLiveCredentials
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-blue-50/80 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {hasLiveCredentials ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Conexión Real GoCardless PSD2 Activa</span>
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-blue-600" />
                      <span>Modo Sandbox & Simulación Bancaria Listo</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">
                  {hasLiveCredentials
                    ? "Conectado a la API oficial de GoCardless Bank Account Data. Puedes enlazar bancos reales de España y Europa."
                    : "Puedes probar todo el flujo de conexión y asignación de titularidad de inmediato con cualquiera de los bancos españoles. Para conectar tus bancos reales de verdad, solo necesitas añadir tus claves gratuitas de GoCardless en .env.local (GOCARDLESS_SECRET_ID y GOCARDLESS_SECRET_KEY)."}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar banco (ej. Santander, BBVA, CaixaBank, Revolut...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              {/* Bank Grid */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Bancos Disponibles ({filteredInstitutions.length})
                </div>

                {isLoadingInstitutions ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00D09C]" />
                    <span>Cargando entidades bancarias...</span>
                  </div>
                ) : filteredInstitutions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No se encontró ningún banco con el término "{searchTerm}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {filteredInstitutions.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleSelectBank(bank)}
                        disabled={isProcessingAuth}
                        className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-[#00D09C] hover:bg-slate-50/80 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-[#E6FAF4] transition-colors">
                            <Building2 className="w-4 h-4 text-slate-600 group-hover:text-[#00A37A]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 block truncate group-hover:text-[#00A37A] transition-colors">
                              {bank.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              PSD2 Oficial
                            </span>
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00D09C] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: AUTHORIZING                                       */}
          {/* ========================================================= */}
          {step === "AUTHORIZING" && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#E6FAF4] text-[#00A37A] flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Conectando con {selectedBank?.name || "tu Banco"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Se abrirá la pasarela segura PSD2 para autorizar el acceso de lectura a tus movimientos.
                </p>
              </div>

              {authUrl && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-sm mx-auto space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Entidad:</span>
                    <span className="font-semibold text-slate-900">{selectedBank?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Permisos:</span>
                    <span className="font-semibold text-emerald-600">Solo lectura (90 días)</span>
                  </div>

                  <a
                    href={authUrl}
                    target="_self"
                    className="w-full py-3 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer block text-center"
                  >
                    <span>Ir a Autorizar en {selectedBank?.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {requisitionId && (
                    <button
                      type="button"
                      onClick={() => loadAccountsFromRequisition(requisitionId)}
                      disabled={isProcessingAuth}
                      className="w-full py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isProcessingAuth ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00D09C]" />
                          <span>Comprobando autorización...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00D09C]" />
                          <span>Ya he autorizado, descubrir cuentas</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ASSIGN OWNERSHIP (CORE REQUIREMENT)               */}
          {/* ========================================================= */}
          {step === "ASSIGN_OWNERSHIP" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#E6FAF4] border border-[#00D09C]/30 text-xs text-[#008761] flex items-center gap-2.5 font-medium">
                <Sparkles className="w-4 h-4 text-[#00D09C] shrink-0" />
                <span>
                  ¡Se han descubierto <strong>{discoveredAccounts.length} cuentas/tarjetas</strong> en{" "}
                  {selectedBank?.name || "el banco"}! Asigna la titularidad de cada una:
                </span>
              </div>

              <div className="space-y-3">
                {discoveredAccounts.map((acc, index) => {
                  return (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/70">
                            {acc.name.toLowerCase().includes("tarjeta") ? (
                              <CreditCard className="w-4 h-4 text-slate-600" />
                            ) : (
                              <Landmark className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">
                              {acc.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {acc.ibanMask}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-xs text-slate-900 block">
                            {acc.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">Saldo actual</span>
                        </div>
                      </div>

                      {/* Ownership Selector with dynamic reactive names */}
                      <div className="pt-1 border-t border-slate-100">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Titular de esta cuenta:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Option JOINT */}
                          <button
                            type="button"
                            onClick={() => handleUpdateOwnership(index, "JOINT")}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              acc.ownership === "JOINT"
                                ? "bg-[#00D09C] text-white shadow-sm shadow-[#00D09C]/30 scale-[1.02]"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Ambos (Conjunta)</span>
                          </button>

                          {/* Option USER A */}
                          <button
                            type="button"
                            onClick={() => handleUpdateOwnership(index, "USER_A")}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              acc.ownership === "USER_A"
                                ? "bg-red-500 text-white shadow-sm shadow-red-500/30 scale-[1.02]"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{memberAName}</span>
                          </button>

                          {/* Option USER B */}
                          <button
                            type="button"
                            onClick={() => handleUpdateOwnership(index, "USER_B")}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              acc.ownership === "USER_B"
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-[1.02]"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{memberBName}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep("SELECT_BANK")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2 rounded-xl"
                >
                  Volver a bancos
                </button>

                <button
                  type="button"
                  onClick={handleSaveAccounts}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando cuentas...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar y Vincular Cuentas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SUCCESS                                           */}
          {/* ========================================================= */}
          {step === "SUCCESS" && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  ¡Cuentas vinculadas con éxito!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  La titularidad ha sido guardada. Las cuentas ya están disponibles para el cálculo de balances y sincronización.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
