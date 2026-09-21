"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useOptionalAuth } from "@/context/AuthContext";
import { BankAccount, useTransactions } from "@/context/TransactionsContext";
import {
  getBankInstitutions,
  createBankAuthLink,
  getAccountsFromBankRequisition,
  saveDiscoveredAccounts,
  getEnableBankingAppId,
  setEnableBankingAppId,
  getEnableBankingPrivateKey,
  setEnableBankingPrivateKey,
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
  Plus,
} from "lucide-react";

export type ConnectModalMode = "account" | "card" | "catalog" | "statement" | "config";

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsConnected: (accounts: BankAccount[]) => void;
  initialRequisitionId?: string | null;
  initialMode?: ConnectModalMode;
  initialBankName?: string;
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

const POPULAR_BANKS = [
  "Bankinter",
  "BBVA",
  "Banco Santander",
  "CaixaBank",
  "Revolut",
  "ING",
  "Banco Sabadell",
  "Openbank",
  "N26",
];

export default function ConnectBankModal({
  isOpen,
  onClose,
  onAccountsConnected,
  initialRequisitionId,
  initialMode,
  initialBankName,
}: ConnectBankModalProps) {
  const auth = useOptionalAuth();
  const { memberAName, memberBName } = useUserNames();
  const { importBankMovements } = useTransactions();

  const activeRole = auth?.activeRole || "memberA";
  const myName = activeRole === "memberB" ? (memberBName || "Persona B") : (memberAName || "Persona A");
  const partnerName = activeRole === "memberB" ? (memberAName || "Persona A") : (memberBName || "Persona B");
  const defaultOwner: "USER_A" | "USER_B" | "JOINT" = activeRole === "memberB" ? "USER_B" : "USER_A";
  const partnerOwner: "USER_A" | "USER_B" | "JOINT" = activeRole === "memberB" ? "USER_A" : "USER_B";

  const [activeMode, setActiveMode] = useState<ConnectModalMode>(initialMode || "account");
  const [step, setStep] = useState<"SELECT_BANK" | "AUTHORIZING" | "ASSIGN_OWNERSHIP" | "SUCCESS">(
    "SELECT_BANK"
  );
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankInstitution | null>(null);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(false);

  // Form state: Añadir Nueva Cuenta
  const [newAccBank, setNewAccBank] = useState("Bankinter");
  const [newAccName, setNewAccName] = useState("");
  const [newAccIban, setNewAccIban] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [accountOwnership, setAccountOwnership] = useState<"USER_A" | "USER_B" | "JOINT">(defaultOwner);
  const [isAccountJoint, setIsAccountJoint] = useState(false);

  // Form state: Añadir Nueva Tarjeta
  const [newCardBank, setNewCardBank] = useState("Bankinter");
  const [newCardName, setNewCardName] = useState("Tarjeta VISA");
  const [newCardDigits, setNewCardDigits] = useState("");
  const [cardOwnership, setCardOwnership] = useState<"USER_A" | "USER_B" | "JOINT">(defaultOwner);
  const [isCardJoint, setIsCardJoint] = useState(false);
  const [isLaunchingCardSync, setIsLaunchingCardSync] = useState(false);
  const [cardSyncFeedback, setCardSyncFeedback] = useState<string | null>(null);

  // App ID & RSA Private Key config state
  const [appIdInput, setAppIdInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [appIdSavedSuccess, setAppIdSavedSuccess] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  // Statement import state
  const [statementText, setStatementText] = useState("");
  const [statementBankName, setStatementBankName] = useState("Bankinter");
  const [statementOwnership, setStatementOwnership] = useState<"USER_A" | "USER_B" | "JOINT">(defaultOwner);
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
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Synchronize default ownership when activeRole changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setActiveMode(initialMode);
      } else {
        setActiveMode("account");
      }
      if (initialBankName) {
        setStatementBankName(initialBankName);
        setNewAccBank(initialBankName);
        setNewCardBank(initialBankName);
      }
      setErrorMessage(null);
      setSuccessBanner(null);
      setShowConnectPrompt(false);
      setIsLoadingInstitutions(true);

      // Initialize titularities to the active user who is adding it
      setAccountOwnership(defaultOwner);
      setIsAccountJoint(false);
      setCardOwnership(defaultOwner);
      setIsCardJoint(false);
      setStatementOwnership(defaultOwner);
      setCardSyncFeedback(null);

      const currentId = getEnableBankingAppId() || "";
      const currentKey = getEnableBankingPrivateKey() || "";
      setAppIdInput(currentId);
      setPrivateKeyInput(currentKey);
      setHasLiveCredentials(currentId.length > 5 && currentKey.length > 10);

      getBankInstitutions("ES")
        .then((data) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
            setHasLiveCredentials(
              !!data.hasLiveCredentials || (currentId.length > 5 && currentKey.length > 10)
            );
          }
        })
        .catch((err) => {
          console.warn("Error loading institutions:", err);
        })
        .finally(() => {
          setIsLoadingInstitutions(false);
        });

      if (initialRequisitionId) {
        setRequisitionId(initialRequisitionId);
        loadAccountsFromRequisition(initialRequisitionId);
      }
    } else {
      setStep("SELECT_BANK");
      setSelectedBank(null);
      setSearchTerm("");
      setDiscoveredAccounts([]);
      setErrorMessage(null);
      setSuccessBanner(null);
      setShowConnectPrompt(false);
      setParsedMovements([]);
      setStatementText("");
    }
  }, [isOpen, initialRequisitionId, initialMode, initialBankName, defaultOwner]);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm.trim()) return institutions;
    const term = searchTerm.toLowerCase();
    return institutions.filter((inst) => inst.name.toLowerCase().includes(term));
  }, [institutions, searchTerm]);

  // Handle saving Enable Banking Application ID and Private Key
  const handleKeyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setPrivateKeyInput(content.trim());
    };
    reader.readAsText(file);
  };

  const handleSaveAppId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appIdInput.trim() && !privateKeyInput.trim()) {
      setEnableBankingAppId(null);
      setEnableBankingPrivateKey(null);
      setHasLiveCredentials(false);
      setAppIdSavedSuccess(false);
      return;
    }

    setEnableBankingAppId(appIdInput.trim());
    setEnableBankingPrivateKey(privateKeyInput.trim());
    setHasLiveCredentials(appIdInput.trim().length > 5 && privateKeyInput.trim().length > 10);
    setAppIdSavedSuccess(true);
    setTimeout(() => {
      setAppIdSavedSuccess(false);
      setActiveMode("catalog");
    }, 1400);
  };

  // -------------------------------------------------------------
  // HANDLERS FOR DIRECT ACCOUNT & CARD CREATION
  // -------------------------------------------------------------
  const handleCreateDirectAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const bank = newAccBank.trim() || "Bankinter";
    const name = newAccName.trim() || `Cuenta ${bank}`;
    const rawBalance = parseFloat(newAccBalance.replace(",", "."));
    const balance = isNaN(rawBalance) ? 0 : rawBalance;

    let ibanMask = "ES00 •••• 0000";
    const cleanDigits = newAccIban.replace(/\s/g, "");
    if (cleanDigits.length >= 4) {
      ibanMask = `ES •••• ${cleanDigits.slice(-4)}`;
    } else if (cleanDigits.length > 0) {
      ibanMask = `ES •••• ${cleanDigits.padStart(4, "0")}`;
    }

    const newAccount: BankAccount = {
      id: `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      bankName: bank,
      accountName: name,
      ibanMask,
      ownership: accountOwnership,
      balance,
      institutionId: bank.toLowerCase().replace(/\s+/g, "_"),
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };

    onAccountsConnected([newAccount]);
    setSuccessBanner(`¡Cuenta "${name}" añadida con éxito con titularidad ${accountOwnership === "JOINT" ? "Conjunta" : accountOwnership === "USER_A" ? memberAName : memberBName}!`);

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCreateDirectCard = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const bank = newCardBank.trim() || "Bankinter";
    let name = newCardName.trim() || "Tarjeta VISA";
    if (!name.toLowerCase().includes("tarjeta")) {
      name = `Tarjeta ${name}`;
    }

    const cleanDigits = newCardDigits.replace(/\D/g, "");
    const ibanMask = cleanDigits ? `VISA **** ${cleanDigits.slice(-4)}` : "VISA **** 0000";

    const newCard: BankAccount = {
      id: `card_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      bankName: bank,
      accountName: name,
      ibanMask,
      ownership: cardOwnership,
      balance: 0,
      institutionId: bank.toLowerCase().replace(/\s+/g, "_"),
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };

    onAccountsConnected([newCard]);
    setSuccessBanner(`¡Tarjeta "${name}" añadida con éxito con titularidad ${cardOwnership === "JOINT" ? "Conjunta" : cardOwnership === "USER_A" ? memberAName : memberBName}!`);

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Launch Bankinter background card sync assistant
  const handleLaunchCardSync = async () => {
    setIsLaunchingCardSync(true);
    setCardSyncFeedback("Abriendo pasarela interactiva de Bankinter en pantalla...");
    try {
      const res = await fetch("/api/sync/launch-card-sync", { method: "POST" });
      if (!res.ok) {
        setCardSyncFeedback(`Aviso: Pasarela interactiva no disponible en este entorno (${res.status}).`);
        setIsLaunchingCardSync(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCardSyncFeedback("Ventana de Bankinter abierta en pantalla. Identifícate con tus claves...");
      } else {
        setCardSyncFeedback(data.error || "No se pudo abrir la pasarela.");
      }
    } catch (err: any) {
      setCardSyncFeedback("Error de conexión al lanzar la pasarela: " + (err.message || ""));
    } finally {
      setIsLaunchingCardSync(false);
    }
  };

  // -------------------------------------------------------------
  // OPEN BANKING PSD2 & REQUISITIONS
  // -------------------------------------------------------------
  const handleSelectBank = (bank: BankInstitution) => {
    setSelectedBank(bank);
    setErrorMessage(null);

    if (!hasLiveCredentials && !bank.isMock) {
      setShowConnectPrompt(true);
      return;
    }

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

      if (!data.success || !data.requisitionId) {
        throw new Error(data.error || "No se pudo generar el enlace bancario");
      }

      setRequisitionId(data.requisitionId);

      if (data.authUrl && data.authUrl.length > 5) {
        setAuthUrl(data.authUrl);
        setStep("AUTHORIZING");
      } else {
        await loadAccountsFromRequisition(data.requisitionId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la entidad");
    } finally {
      setIsProcessingAuth(false);
    }
  };

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
          // By default, ownership belongs to whoever added it (defaultOwner) unless marked joint
          ownership: defaultOwner,
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
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar la asignación");
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // STATEMENT IMPORT
  // -------------------------------------------------------------
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

    importBankMovements(
      parsedMovements.map((m) => ({
        id: m.id || `stmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        concept: m.concept,
        amount: m.amount,
        date: m.date,
        monthKey: m.monthKey || new Date().toISOString().substring(0, 7),
        bankName: statementBankName,
        accountLabel: `Cuenta ${statementBankName}`,
        ownership: statementOwnership,
      }))
    );

    setSuccessBanner(`¡Importados ${parsedMovements.length} movimientos en cuenta de ${statementBankName}!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00D09C] flex items-center justify-center shadow-md shadow-[#00D09C]/20">
              {activeMode === "card" ? (
                <CreditCard className="w-4 h-4 text-white" />
              ) : (
                <Landmark className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {step === "SELECT_BANK"
                  ? activeMode === "card"
                    ? "Añadir Nueva Tarjeta"
                    : activeMode === "account"
                    ? "Añadir Nueva Cuenta Bancaria"
                    : activeMode === "catalog"
                    ? "Conectar Banco (PSD2 Oficial)"
                    : activeMode === "statement"
                    ? "Cargar Extracto Bancario"
                    : "Configuración Enable Banking"
                  : step === "AUTHORIZING"
                  ? "Paso 2: Autorización Open Banking"
                  : step === "ASSIGN_OWNERSHIP"
                  ? "Paso 3: Asignar Titularidad"
                  : "¡Vinculación Completada!"}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Por defecto asignado a ti ({myName}) salvo que indiques que es conjunta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Only in SELECT_BANK step) */}
        {step === "SELECT_BANK" && (
          <div className="px-5 pt-2.5 pb-0 flex items-center gap-1.5 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveMode("account");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === "account"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Añadir Cuenta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("card");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === "card"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Añadir Tarjeta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("catalog");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
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
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeMode === "statement"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Subir Extracto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("config");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ml-auto cursor-pointer ${
                activeMode === "config"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Claves API</span>
              {hasLiveCredentials && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {successBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: AÑADIR CUENTA BANCARIA DIRECTAMENTE               */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "account" && (
            <form onSubmit={handleCreateDirectAccount} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">Añade tu cuenta en 1 paso</span>
                  <span className="text-[11px] text-emerald-800">
                    Por defecto la cuenta pertenecerá a ti (<strong>{myName}</strong>), salvo que marques abajo que es la cuenta conjunta.
                  </span>
                </div>
              </div>

              {/* Selector Rápido de Banco */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Banco o Entidad:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setNewAccBank(b);
                        if (!newAccName || newAccName.startsWith("Cuenta ")) {
                          setNewAccName(`Cuenta ${b}`);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        newAccBank.toLowerCase() === b.toLowerCase()
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newAccBank}
                  onChange={(e) => setNewAccBank(e.target.value)}
                  placeholder="O escribe el nombre de tu banco..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                  required
                />
              </div>

              {/* Nombre / Alias de la Cuenta */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Nombre o Alias de la Cuenta:
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder={`Ej. Cuenta Nómina ${newAccBank || "Banco"}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              {/* IBAN y Saldo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    IBAN o Últimos 4 dígitos:
                  </label>
                  <input
                    type="text"
                    value={newAccIban}
                    onChange={(e) => setNewAccIban(e.target.value)}
                    placeholder="Ej. 1234 o ES91 •••• 1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Saldo Inicial (€):
                  </label>
                  <input
                    type="text"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>
              </div>

              {/* TITULARIDAD DE LA CUENTA */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00A37A]" />
                    <span>Titularidad asignada a la cuenta:</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Definir pagador
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Opción 1: Quien la añade (Default) */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOwnership(defaultOwner);
                      setIsAccountJoint(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountOwnership === defaultOwner && !isAccountJoint
                        ? "border-[#00D09C] bg-white ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-[#00A37A]" />
                      <span className="truncate">{myName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Mi cuenta)
                    </span>
                  </button>

                  {/* Opción 2: Cuenta Conjunta */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOwnership("JOINT");
                      setIsAccountJoint(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountOwnership === "JOINT"
                        ? "border-[#00D09C] bg-[#00D09C]/15 ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs text-[#00A37A]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Conjunta</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block font-normal mt-0.5">
                      (Ambos 50/50)
                    </span>
                  </button>

                  {/* Opción 3: Pareja */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOwnership(partnerOwner);
                      setIsAccountJoint(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountOwnership === partnerOwner && !isAccountJoint
                        ? "border-blue-400 bg-white ring-2 ring-blue-400/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span className="truncate">{partnerName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Pareja)
                    </span>
                  </button>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAccountJoint}
                    onChange={(e) => {
                      setIsAccountJoint(e.target.checked);
                      setAccountOwnership(e.target.checked ? "JOINT" : defaultOwner);
                    }}
                    className="w-4 h-4 rounded text-[#00D09C] focus:ring-[#00D09C] accent-[#00D09C]"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Es la cuenta conjunta (gastos divididos al 50/50)
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cuenta Bancaria</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveMode("catalog")}
                  className="text-[11px] font-bold text-[#00A37A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>¿Prefieres conectar automáticamente por pasarela bancaria oficial? Ir a Bancos PSD2</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: AÑADIR TARJETA DIRECTAMENTE                       */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "card" && (
            <form onSubmit={handleCreateDirectCard} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-purple-950 flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">Añade tu tarjeta de crédito o débito</span>
                  <span className="text-[11px] text-purple-800">
                    Por defecto la tarjeta pertenecerá a ti (<strong>{myName}</strong>), salvo que marques abajo que es tarjeta conjunta.
                  </span>
                </div>
              </div>

              {/* Banco Emisor */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Banco o Entidad Emisora:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setNewCardBank(b);
                        if (!newCardName || newCardName === "Tarjeta VISA") {
                          setNewCardName(`Tarjeta VISA ${b}`);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        newCardBank.toLowerCase() === b.toLowerCase()
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newCardBank}
                  onChange={(e) => setNewCardBank(e.target.value)}
                  placeholder="O escribe la entidad de la tarjeta..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                  required
                />
              </div>

              {/* Nombre de la Tarjeta y Últimos 4 dígitos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Nombre o Alias de la Tarjeta:
                  </label>
                  <input
                    type="text"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="Ej. Tarjeta VISA Clásica"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Últimos 4 dígitos:
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newCardDigits}
                    onChange={(e) => setNewCardDigits(e.target.value)}
                    placeholder="Ej. 3080"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>
              </div>

              {/* TITULARIDAD DE LA TARJETA */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00A37A]" />
                    <span>Titularidad asignada a la tarjeta:</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Definir pagador
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Opción 1: Quien la añade (Default) */}
                  <button
                    type="button"
                    onClick={() => {
                      setCardOwnership(defaultOwner);
                      setIsCardJoint(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cardOwnership === defaultOwner && !isCardJoint
                        ? "border-[#00D09C] bg-white ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-[#00A37A]" />
                      <span className="truncate">{myName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Mi tarjeta)
                    </span>
                  </button>

                  {/* Opción 2: Tarjeta Conjunta */}
                  <button
                    type="button"
                    onClick={() => {
                      setCardOwnership("JOINT");
                      setIsCardJoint(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cardOwnership === "JOINT"
                        ? "border-[#00D09C] bg-[#00D09C]/15 ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs text-[#00A37A]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Conjunta</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block font-normal mt-0.5">
                      (Ambos 50/50)
                    </span>
                  </button>

                  {/* Opción 3: Pareja */}
                  <button
                    type="button"
                    onClick={() => {
                      setCardOwnership(partnerOwner);
                      setIsCardJoint(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cardOwnership === partnerOwner && !isCardJoint
                        ? "border-blue-400 bg-white ring-2 ring-blue-400/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span className="truncate">{partnerName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Pareja)
                    </span>
                  </button>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCardJoint}
                    onChange={(e) => {
                      setIsCardJoint(e.target.checked);
                      setCardOwnership(e.target.checked ? "JOINT" : defaultOwner);
                    }}
                    className="w-4 h-4 rounded text-[#00D09C] focus:ring-[#00D09C] accent-[#00D09C]"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Es una tarjeta conjunta (gastos divididos al 50/50)
                  </span>
                </label>
              </div>

              {/* Pasarela interactiva si es Bankinter */}
              {newCardBank.toLowerCase().includes("bankinter") && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Pasarela Interactiva Bankinter</span>
                    </span>
                    <button
                      type="button"
                      disabled={isLaunchingCardSync}
                      onClick={handleLaunchCardSync}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isLaunchingCardSync ? "Abriendo..." : "Lanzar Pasarela"}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Puedes lanzar la pasarela oficial de Bankinter para abrir la sesión y extraer las compras de la tarjeta automáticamente.
                  </p>
                  {cardSyncFeedback && (
                    <div className="text-[11px] font-bold text-amber-900 bg-white/60 p-2 rounded-xl border border-amber-200/80">
                      {cardSyncFeedback}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Guardar Tarjeta</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: BANCOS PSD2 (OPEN BANKING OFICIAL)                 */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "catalog" && (
            <div className="space-y-4">
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
                      className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-amber-900 leading-relaxed">
                    Para que <strong>{selectedBank.name}</strong> te abra su pasarela bancaria oficial y puedas autenticarte con tu app o SMS, la ley exige vincular tu clave gratuita de <strong>Enable Banking</strong> o bien añadir la cuenta de forma directa:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveMode("account")}
                      className="p-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Cuenta Directa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMode("config")}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Clave API</span>
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
                        className="text-[10px] font-black text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      >
                        Activar Modo Real
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {hasLiveCredentials
                      ? "Conectado a la API oficial de Enable Banking. Al pulsar sobre cualquier banco se abrirá su pantalla oficial de autenticación bancaria."
                      : "Puedes conectar bancos seleccionando la entidad a continuación o utilizar el botón '+ Añadir Cuenta' para darla de alta en 1 segundo."}
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

              {/* Grid of Banks */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {isLoadingInstitutions ? (
                  <div className="col-span-full py-10 text-center text-slate-400 text-xs font-semibold">
                    Cargando entidades bancarias...
                  </div>
                ) : filteredInstitutions.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                    No se encontraron entidades para "{searchTerm}"
                  </div>
                ) : (
                  filteredInstitutions.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => handleSelectBank(bank)}
                      className="p-3 rounded-2xl border border-slate-200/90 hover:border-[#00D09C] hover:bg-[#00D09C]/5 hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 cursor-pointer bg-white group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
                        {bank.logo ? (
                          <img
                            src={bank.logo}
                            alt={bank.name}
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-[#00A37A] transition-colors leading-tight line-clamp-1">
                        {bank.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {bank.bic || "PSD2"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: CARGAR EXTRACTO REAL (EXCEL / CSV)                 */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "statement" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Importación de Extracto Bancario Real</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Descarga tu extracto en <strong>Excel o CSV</strong> de la web de tu banco (Bankinter, Santander, etc.) y súbelo aquí.
                </p>
              </div>

              {/* Titularidad del extracto */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-extrabold text-slate-900 block">
                  Titularidad asignada a este extracto:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatementOwnership(defaultOwner)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      statementOwnership === defaultOwner
                        ? "border-[#00D09C] bg-white ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-[#00A37A]" />
                      <span className="truncate">{myName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Personal)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatementOwnership("JOINT")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      statementOwnership === "JOINT"
                        ? "border-[#00D09C] bg-[#00D09C]/15 ring-2 ring-[#00D09C]/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs text-[#00A37A]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Conjunta</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block font-normal mt-0.5">
                      (Ambos 50/50)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatementOwnership(partnerOwner)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      statementOwnership === partnerOwner
                        ? "border-blue-400 bg-white ring-2 ring-blue-400/30 text-slate-900 font-black shadow-xs"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span className="truncate">{partnerName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                      (Pareja)
                    </span>
                  </button>
                </div>
              </div>

              {/* Subir archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#00D09C] bg-slate-50/50 hover:bg-emerald-50/30 text-center cursor-pointer transition-all space-y-2"
              >
                <UploadCloud className="w-8 h-8 text-[#00A37A] mx-auto" />
                <div className="text-xs font-extrabold text-slate-800">
                  Arrastra tu archivo aquí o haz clic para seleccionarlo
                </div>
                <div className="text-[11px] text-slate-400">
                  Archivos soportados: .csv, .txt, .tsv (o copia y pega debajo)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {statementError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {statementError}
                </div>
              )}

              {/* O pegar texto */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  O pega directamente el texto del extracto:
                </label>
                <textarea
                  rows={4}
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

                  <button
                    type="button"
                    onClick={handleImportRealStatement}
                    className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Vincular Cuenta e Importar {parsedMovements.length} Movimientos</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: ENABLE BANKING API CONFIGURATION                   */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "config" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                  <span>Configuración de tu Conexión Real Enable Banking</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Enable Banking permite conectar bancos españoles de forma <strong>100% gratuita para uso personal</strong>.
                </p>
              </div>

              {appIdSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Clave de Enable Banking guardada con éxito!</span>
                </div>
              )}

              <form onSubmit={handleSaveAppId} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Application ID (Client ID):
                  </label>
                  <input
                    type="text"
                    value={appIdInput}
                    onChange={(e) => setAppIdInput(e.target.value)}
                    placeholder="Ej. 5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Clave Privada RSA (ENABLEBANKING_PRIVATE_KEY):
                  </label>
                  <textarea
                    rows={3}
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-900 focus:outline-none focus:border-[#00D09C]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => keyFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Cargar archivo .key / .pem
                  </button>
                  <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".key,.pem,.txt"
                    onChange={handleKeyFileUpload}
                    className="hidden"
                  />

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Guardar Claves
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: AUTHORIZING (EXTERNAL LINK OPEN BANKING)          */}
          {/* ========================================================= */}
          {step === "AUTHORIZING" && (
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#00A37A] animate-bounce">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Redirigiendo a tu banco...
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Se abrirá la pasarela oficial para autorizar la conexión. Al volver, tus cuentas estarán vinculadas.
                </p>
              </div>

              {authUrl && (
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs shadow-md shadow-[#00D09C]/20 transition-all"
                >
                  <span>Abrir Pasarela Bancaria</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ASSIGN OWNERSHIP FOR DISCOVERED ACCOUNTS          */}
          {/* ========================================================= */}
          {step === "ASSIGN_OWNERSHIP" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <span className="font-extrabold block">¡Cuentas recuperadas de tu banco!</span>
                <span className="text-[11px] text-emerald-800">
                  Asignadas por defecto a ti ({myName}), salvo que marques la opción de cuenta conjunta.
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {discoveredAccounts.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {acc.ibanMask} • {acc.bankName}
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        {acc.balance.toFixed(2)} €
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateOwnership(idx, defaultOwner)}
                        className={`p-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                          acc.ownership === defaultOwner
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {myName}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateOwnership(idx, "JOINT")}
                        className={`p-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                          acc.ownership === "JOINT"
                            ? "bg-[#00D09C] text-white border-[#00D09C] shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Conjunta (50/50)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateOwnership(idx, partnerOwner)}
                        className={`p-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                          acc.ownership === partnerOwner
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {partnerName}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAccounts}
                className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirmar y Guardar Cuentas</span>
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SUCCESS                                           */}
          {/* ========================================================= */}
          {step === "SUCCESS" && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                ¡Operación completada con éxito!
              </h3>
              <p className="text-xs text-slate-500">
                Las cuentas y tarjetas ya están listas y sincronizadas en la aplicación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
