"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { BankAccount, useTransactions } from "@/context/TransactionsContext";
import {
  getBankInstitutions,
  createBankAuthLink,
  getAccountsFromBankRequisition,
  saveDiscoveredAccounts,
  getEnableBankingAppId,
  setEnableBankingAppId,
} from "@/lib/bank/service";
import { parseSpanishBankStatement, ParsedBankMovement } from "@/lib/bank/importer";
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
  FileSpreadsheet,
  KeyRound,
  UploadCloud,
  Lock,
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
  const { importBankMovements } = useTransactions();

  const [activeMode, setActiveMode] = useState<"catalog" | "statement" | "config">("catalog");
  const [step, setStep] = useState<"SELECT_BANK" | "AUTHORIZING" | "ASSIGN_OWNERSHIP" | "SUCCESS">(
    "SELECT_BANK"
  );
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankInstitution | null>(null);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(false);

  // App ID config state
  const [appIdInput, setAppIdInput] = useState("");
  const [appIdSavedSuccess, setAppIdSavedSuccess] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  // Statement import state
  const [statementText, setStatementText] = useState("");
  const [statementBankName, setStatementBankName] = useState("Bankinter");
  const [statementOwnership, setStatementOwnership] = useState<"USER_A" | "USER_B" | "JOINT">("JOINT");
  const [parsedMovements, setParsedMovements] = useState<ParsedBankMovement[]>([]);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementAccountIban, setStatementAccountIban] = useState("");
  const [statementBalance, setStatementBalance] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authorization & Discovery state
  const [requisitionId, setRequisitionId] = useState<string | null>(initialRequisitionId || null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccountItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load institutions & App ID when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setShowConnectPrompt(false);
      setIsLoadingInstitutions(true);

      const currentId = getEnableBankingAppId() || "";
      setAppIdInput(currentId);
      setHasLiveCredentials(currentId.length > 5);

      getBankInstitutions("ES")
        .then((data) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
            setHasLiveCredentials(!!data.hasLiveCredentials || currentId.length > 5);
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
      setShowConnectPrompt(false);
      setParsedMovements([]);
      setStatementText("");
    }
  }, [isOpen, initialRequisitionId]);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm.trim()) return institutions;
    const term = searchTerm.toLowerCase();
    return institutions.filter((inst) => inst.name.toLowerCase().includes(term));
  }, [institutions, searchTerm]);

  // Handle saving Enable Banking Application ID
  const handleSaveAppId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appIdInput.trim()) {
      setEnableBankingAppId(null);
      setHasLiveCredentials(false);
      setAppIdSavedSuccess(false);
      return;
    }

    setEnableBankingAppId(appIdInput.trim());
    setHasLiveCredentials(true);
    setAppIdSavedSuccess(true);
    setTimeout(() => {
      setAppIdSavedSuccess(false);
      setActiveMode("catalog");
    }, 1400);
  };

  // Step 1 -> Initiate Auth
  const handleSelectBank = (bank: BankInstitution) => {
    setSelectedBank(bank);
    setErrorMessage(null);

    // If no live credentials configured, prompt the user for options
    if (!hasLiveCredentials && !bank.isMock) {
      setShowConnectPrompt(true);
      return;
    }

    // Launch connection
    executeBankConnection(bank);
  };

  const executeBankConnection = async (bank: BankInstitution) => {
    setIsProcessingAuth(true);
    setErrorMessage(null);
    setShowConnectPrompt(false);

    try {
      const data = await createBankAuthLink({
        institutionId: bank.id,
      });

      if (!data.success || !data.requisitionId || !data.authUrl) {
        throw new Error(data.error || "No se pudo generar el enlace bancario");
      }

      setRequisitionId(data.requisitionId);
      setAuthUrl(data.authUrl);
      setStep("AUTHORIZING");
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la entidad");
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Statement Parsing Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatementError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStatementText(text);
      processStatementContent(text, file.name.toLowerCase().includes("bankinter") ? "Bankinter" : statementBankName);
    };
    reader.onerror = () => {
      setStatementError("Error al leer el archivo. Prueba a copiar y pegar su contenido.");
    };
    reader.readAsText(file);
  };

  const processStatementContent = (content: string, bank: string) => {
    const result = parseSpanishBankStatement(content, bank);
    if (!result.success) {
      setStatementError(result.error || "No se detectaron movimientos válidos");
      setParsedMovements([]);
      return;
    }

    setParsedMovements(result.movements);
    if (result.accountIban) {
      const iban = result.accountIban;
      setStatementAccountIban(`${iban.substring(0, 4)} ${iban.substring(4, 8)} •••• ${iban.substring(iban.length - 4)}`);
    } else {
      setStatementAccountIban("ES •••• " + Math.floor(1000 + Math.random() * 9000));
    }

    const lastBal = result.movements.find((m) => m.balance !== undefined)?.balance;
    if (lastBal !== undefined) {
      setStatementBalance(lastBal);
    }
    setStatementError(null);
  };

  const handleImportRealStatement = () => {
    if (parsedMovements.length === 0) return;

    // 1. Create real bank account
    const newAccount: BankAccount = {
      id: `real_acc_${Date.now()}`,
      bankName: statementBankName,
      accountName: `Cuenta ${statementBankName}`,
      ibanMask: statementAccountIban || "ES00 •••• 0000",
      ownership: statementOwnership,
      balance: statementBalance,
      institutionId: statementBankName.toLowerCase(),
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };

    onAccountsConnected([newAccount]);

    // 2. Import movements to feed as pending transactions
    importBankMovements(
      parsedMovements.map((m) => ({
        id: m.id,
        concept: m.concept,
        amount: m.amount,
        date: m.date,
        monthKey: m.monthKey,
        bankName: statementBankName,
        ownership: statementOwnership,
      }))
    );

    setStep("SUCCESS");
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  // Step 2 -> Load accounts from requisition
  const loadAccountsFromRequisition = async (reqId: string) => {
    setIsProcessingAuth(true);
    setErrorMessage(null);

    try {
      const data = await getAccountsFromBankRequisition(reqId);

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
      const data = await saveDiscoveredAccounts({
        requisitionId: requisitionId || undefined,
        accounts: discoveredAccounts.map((acc) => ({
          id: acc.id,
          bankName: acc.bankName,
          accountName: acc.name,
          ibanMask: acc.ibanMask,
          ownership: acc.ownership,
          balance: acc.balance,
          institutionId: acc.institutionId,
        })),
      });

      if (!data.success || !data.accounts) {
        throw new Error(data.error || "Error al guardar cuentas");
      }

      onAccountsConnected(data.accounts);
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
                Conectar Banco (Enable Banking PSD2)
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

        {/* Tab Navigation (Only in SELECT_BANK step) */}
        {step === "SELECT_BANK" && (
          <div className="px-5 pt-3 pb-0 flex items-center gap-2 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => {
                setActiveMode("catalog");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "catalog"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bancos PSD2</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("statement");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "statement"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Extracto Real (Excel / CSV)</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black">
                100% Real
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("config");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
                activeMode === "config"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Clave Enable Banking</span>
              {hasLiveCredentials && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>
        )}

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
          {step === "SELECT_BANK" && activeMode === "catalog" && (
            <div className="space-y-4">
              {/* Show Connect Prompt Card when user clicked a bank without live key */}
              {showConnectPrompt && selectedBank && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-slate-900 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950">
                          Conectar {selectedBank.name} en Modo Real
                        </h4>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          Normativa Europea PSD2 Oficial
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConnectPrompt(false)}
                      className="text-amber-800 hover:text-amber-950 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-amber-900 leading-relaxed">
                    Para que <strong>{selectedBank.name}</strong> te abra su pasarela bancaria oficial y puedas autenticarte con tu app o SMS, la ley exige vincular tu cuenta con tu clave gratuita de <strong>Enable Banking</strong> o bien importar tu extracto real:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveMode("config")}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Clave Enable Banking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatementBankName(selectedBank.name);
                        setActiveMode("statement");
                      }}
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Subir Extracto {selectedBank.name}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-amber-800">
                      ¿Solo quieres ver una prueba antes de configurar?
                    </span>
                    <button
                      type="button"
                      onClick={() => executeBankConnection(selectedBank)}
                      className="text-[11px] font-bold text-amber-900 hover:underline cursor-pointer"
                    >
                      Continuar en modo simulación &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {!showConnectPrompt && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                    hasLiveCredentials
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-blue-50/80 border-blue-200 text-blue-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {hasLiveCredentials ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Conexión Real Enable Banking Activa</span>
                        </>
                      ) : (
                        <>
                          <Info className="w-4 h-4 text-blue-600" />
                          <span>Proveedor: Enable Banking PSD2 Oficial</span>
                        </>
                      )}
                    </div>

                    {!hasLiveCredentials && (
                      <button
                        type="button"
                        onClick={() => setActiveMode("config")}
                        className="text-[10px] font-black text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-md transition-colors"
                      >
                        Activar Modo Real
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {hasLiveCredentials
                      ? "Conectado a la API oficial de Enable Banking. Al pulsar sobre cualquier banco se abrirá su pantalla oficial de autenticación bancaria."
                      : "Puedes conectar bancos reales vinculando tu Application ID de Enable Banking (gratuito para uso personal) o cargando un extracto real (Excel/CSV) con tus movimientos."}
                  </p>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar banco (ej. Bankinter, Santander, BBVA, CaixaBank, Revolut...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              {/* Bank Grid */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Bancos Disponibles ({filteredInstitutions.length})</span>
                  <span>España & Europa</span>
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
          {/* TAB: REAL STATEMENT IMPORT (BANKINTER / EXCEL / CSV)      */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "statement" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Importación de Movimientos 100% Reales</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Descarga tu extracto de movimientos en Excel o CSV desde la web o app de <strong>Bankinter</strong> (o cualquier banco español) y súbelo aquí. Se cargarán tus movimientos reales con sus fechas, importes y saldo exactos.
                </p>
              </div>

              {statementError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statementError}</span>
                </div>
              )}

              {/* Bank & Ownership selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Entidad Bancaria:
                  </label>
                  <select
                    value={statementBankName}
                    onChange={(e) => setStatementBankName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                  >
                    <option value="Bankinter">Bankinter</option>
                    <option value="Banco Santander">Banco Santander</option>
                    <option value="BBVA">BBVA</option>
                    <option value="CaixaBank">CaixaBank</option>
                    <option value="Revolut">Revolut</option>
                    <option value="ING">ING</option>
                    <option value="Banco Sabadell">Banco Sabadell</option>
                    <option value="Otro Banco">Otro Banco</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Titular de la cuenta:
                  </label>
                  <select
                    value={statementOwnership}
                    onChange={(e) => setStatementOwnership(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                  >
                    <option value="JOINT">Ambos (Cuenta Conjunta)</option>
                    <option value="USER_A">{memberAName}</option>
                    <option value="USER_B">{memberBName}</option>
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#00D09C] bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-emerald-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Haz clic para seleccionar tu extracto de {statementBankName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Formatos soportados: CSV, Excel (.xlsx, .xls) o texto
                  </span>
                </div>
              </div>

              {/* Or paste content manually */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span>O pega aquí el texto copiado de tu banco:</span>
                  {parsedMovements.length > 0 && (
                    <span className="text-emerald-600 font-bold">
                      {parsedMovements.length} movimientos detectados
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={statementText}
                  onChange={(e) => {
                    setStatementText(e.target.value);
                    if (e.target.value.trim().length > 10) {
                      processStatementContent(e.target.value, statementBankName);
                    }
                  }}
                  placeholder="Fecha;Concepto;Importe;Saldo&#10;15/09/2026;Mercadona;-45,30;1250,00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              {/* Preview of Parsed Movements */}
              {parsedMovements.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      Vista previa de movimientos ({parsedMovements.length}):
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      Saldo: {statementBalance.toFixed(2)} €
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {parsedMovements.slice(0, 8).map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate text-[11px]">
                            {m.concept}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {m.date}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs shrink-0 ${
                            m.amount < 0 ? "text-slate-900" : "text-emerald-600"
                          }`}
                        >
                          {m.amount.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                    {parsedMovements.length > 8 && (
                      <div className="text-center text-[10px] text-slate-400 py-1 font-semibold">
                        + {parsedMovements.length - 8} movimientos más...
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportRealStatement}
                    className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Vincular Cuenta e Importar {parsedMovements.length} Movimientos Reales</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: ENABLE BANKING CREDENTIALS CONFIGURATION             */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "config" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                  <span>Configuración de tu Conexión Real Enable Banking</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Enable Banking permite conectar bancos españoles (Bankinter, Santander, BBVA, etc.) de forma <strong>100% gratuita para uso personal</strong> mediante su <em>Restricted Mode</em>.
                </p>
              </div>

              {appIdSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Clave de Enable Banking guardada con éxito! Redirigiendo a bancos...</span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Pasos para vincular tu cuenta en 2 minutos:
                </span>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Entra en{" "}
                    <a
                      href="https://enablebanking.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00A37A] font-bold underline inline-flex items-center gap-0.5"
                    >
                      enablebanking.com <ExternalLink className="w-3 h-3" />
                    </a>{" "}
                    y regístrate gratis.
                  </li>
                  <li>
                    En tu <strong>Control Panel</strong>, ve a <strong>API Applications</strong> y añade una nueva aplicación (Entorno: <em>Production</em>).
                  </li>
                  <li>
                    Haz clic en el botón <strong>"Activate by linking accounts"</strong> y selecciona <strong>Bankinter</strong> para autorizar tu acceso bancario oficial.
                  </li>
                  <li>
                    Copia tu <strong>Application ID</strong> y pégalo a continuación:
                  </li>
                </ol>
              </div>

              <form onSubmit={handleSaveAppId} className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Application ID de Enable Banking:
                  </label>
                  <input
                    type="text"
                    value={appIdInput}
                    onChange={(e) => setAppIdInput(e.target.value)}
                    placeholder="ej. eb_app_a1b2c3d4e5f6..."
                    className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  {hasLiveCredentials ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEnableBankingAppId(null);
                        setAppIdInput("");
                        setHasLiveCredentials(false);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-bold"
                    >
                      Desconectar Clave Actual
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Sin clave activa (Modo Simulación)
                    </span>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
                  >
                    Guardar Clave
                  </button>
                </div>
              </form>
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
