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
import {
  parseSpanishBankStatement,
  parseBankinterExcel,
  detectCardDetails,
  ParsedBankMovement,
} from "@/lib/bank/importer";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Landmark,
  X,
  Search,
  CheckCircle2,
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
  ShieldCheck,
} from "lucide-react";

export type ConnectModalMode = "catalog" | "card" | "statement" | "config" | "account";

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsConnected: (accounts: BankAccount[]) => void;
  initialRequisitionId?: string | null;
  initialMode?: ConnectModalMode;
  initialBankName?: string;
  initialCardId?: string;
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
  "Revolut (IBAN ES)",
  "Revolut (Europa / LT)",
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
  initialCardId,
}: ConnectBankModalProps) {
  const auth = useOptionalAuth();
  const { memberAName, memberBName } = useUserNames();
  const { importBankMovements, accounts } = useTransactions();

  const activeRole = auth?.activeRole || "memberA";
  const myName = activeRole === "memberB" ? (memberBName || "Persona B") : (memberAName || "Persona A");
  const partnerName = activeRole === "memberB" ? (memberAName || "Persona A") : (memberBName || "Persona B");
  const defaultOwner: "USER_A" | "USER_B" | "JOINT" = activeRole === "memberB" ? "USER_B" : "USER_A";
  const partnerOwner: "USER_A" | "USER_B" | "JOINT" = activeRole === "memberB" ? "USER_A" : "USER_B";

  // Map initialMode: statement or card -> card, catalog or account -> catalog
  const resolvedInitialMode: "catalog" | "card" | "config" =
    initialMode === "statement" || initialMode === "card"
      ? "card"
      : initialMode === "config"
      ? "config"
      : "catalog";

  const [activeMode, setActiveMode] = useState<"catalog" | "card" | "config">(resolvedInitialMode);
  const [step, setStep] = useState<"SELECT_BANK" | "AUTHORIZING" | "ASSIGN_OWNERSHIP" | "SUCCESS">(
    "SELECT_BANK"
  );
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankInstitution | null>(null);
  const [hasLiveCredentials, setHasLiveCredentials] = useState(false);

  // Cards registered in the app
  const existingCards = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.accountName.toLowerCase().includes("tarjeta") ||
        a.id.startsWith("card_") ||
        a.id === "acc_card_bankinter"
    );
  }, [accounts]);

  // Target Card selection for statements & creation
  const [selectedCardId, setSelectedCardId] = useState<string>("new");
  const [newCardBank, setNewCardBank] = useState("Bankinter");
  const [newCardName, setNewCardName] = useState("Tarjeta VISA");
  const [newCardDigits, setNewCardDigits] = useState("");
  const [newAccountType, setNewAccountType] = useState<"account" | "card">("account");
  const [initialBalanceInput, setInitialBalanceInput] = useState("");
  const [cardOwnership, setCardOwnership] = useState<"USER_A" | "USER_B" | "JOINT">(defaultOwner);
  const [isCardJoint, setIsCardJoint] = useState(false);
  const [cardRecognitionMessage, setCardRecognitionMessage] = useState<string | null>(null);

  // Card Statement File/Text state
  const [statementText, setStatementText] = useState("");
  const [parsedMovements, setParsedMovements] = useState<ParsedBankMovement[]>([]);
  const [statementError, setStatementError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showManualCardForm, setShowManualCardForm] = useState(false);

  // App ID & RSA Private Key config state
  const [appIdInput, setAppIdInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [appIdSavedSuccess, setAppIdSavedSuccess] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [availablePoolBanks, setAvailablePoolBanks] = useState<string[]>([]);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  // Authorization & Discovery state
  const [requisitionId, setRequisitionId] = useState<string | null>(initialRequisitionId || null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [isGeneratingLiveLink, setIsGeneratingLiveLink] = useState(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredAccountItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Initialize or reset modal state
  useEffect(() => {
    if (isOpen) {
      if (initialMode === "statement" || initialMode === "card") {
        setActiveMode("card");
      } else if (initialMode === "config") {
        setActiveMode("config");
      } else {
        setActiveMode("catalog");
      }

      if (initialCardId) {
        setSelectedCardId(initialCardId);
      } else if (existingCards.length > 0) {
        setSelectedCardId(existingCards[0].id);
      } else {
        setSelectedCardId("new");
      }

      if (initialBankName) {
        setNewCardBank(initialBankName);
      }

      setErrorMessage(null);
      setSuccessBanner(null);
      setShowConnectPrompt(false);
      setIsLoadingInstitutions(true);
      setCardOwnership(defaultOwner);
      setIsCardJoint(false);
      setStatementText("");
      setParsedMovements([]);
      setStatementError(null);
      setCardRecognitionMessage(null);
      setShowManualCardForm(false);

      const currentId = getEnableBankingAppId() || "";
      const currentKey = getEnableBankingPrivateKey() || "";
      setAppIdInput(currentId);
      setPrivateKeyInput(currentKey);
      const userHasCustomKey = currentId.length > 5 && currentKey.length > 10;
      setHasLiveCredentials(userHasCustomKey);

      // Check pre-generated live official link pool in public/data/bank-auth-links.json
      const basePath =
        typeof window !== "undefined" && window.location.pathname.startsWith("/Cuentaconjunta")
          ? "/Cuentaconjunta"
          : "";
      fetch(`${basePath}/data/bank-auth-links.json?t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((pool) => {
          if (pool && typeof pool === "object") {
            const keys = Object.keys(pool);
            if (keys.length > 0) {
              setAvailablePoolBanks(keys);
              setHasLiveCredentials(true);
            }
          }
        })
        .catch(() => {});

      getBankInstitutions("ES")
        .then((data) => {
          if (data.success && Array.isArray(data.institutions)) {
            setInstitutions(data.institutions);
            if (data.hasLiveCredentials) {
              setHasLiveCredentials(true);
            }
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
  }, [isOpen, initialRequisitionId, initialMode, initialBankName, initialCardId, defaultOwner]);

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
  // CARD STATEMENT PARSING & INTELLIGENT RECOGNITION
  // -------------------------------------------------------------
  const processCardFileContent = (content: string, bankFallback = "Bankinter") => {
    const detected = detectCardDetails(content, bankFallback);
    const parseResult = parseSpanishBankStatement(content, detected.detectedBank);

    if (!parseResult.success || parseResult.movements.length === 0) {
      setStatementError(parseResult.error || "No se detectaron movimientos válidos en el extracto.");
      setParsedMovements([]);
      setCardRecognitionMessage(null);
      return;
    }

    setParsedMovements(parseResult.movements);
    setStatementError(null);

    // INTELLIGENT CARD RECOGNITION:
    // Check if detected digits or name match any existing registered card
    let matchedCard = existingCards.find((c) => {
      if (detected.detectedDigits && c.ibanMask.includes(detected.detectedDigits)) {
        return true;
      }
      return false;
    });

    if (!matchedCard && detected.detectedCardName) {
      matchedCard = existingCards.find(
        (c) => c.accountName.toLowerCase() === detected.detectedCardName.toLowerCase()
      );
    }

    if (matchedCard) {
      // Existing card recognized!
      setSelectedCardId(matchedCard.id);
      const ownerLabel =
        matchedCard.ownership === "JOINT"
          ? "Compartida 50/50"
          : matchedCard.ownership === "USER_A"
          ? memberAName
          : memberBName;
      setCardRecognitionMessage(
        `✅ Reconocida tarjeta existente: ${matchedCard.accountName} (${matchedCard.ibanMask}) • Titular: ${ownerLabel}`
      );
    } else {
      // First time this card is uploaded! Create new card and default ownership to active user
      setSelectedCardId("new");
      setNewCardBank(detected.detectedBank);
      setNewCardName(detected.detectedCardName);
      if (detected.detectedDigits) {
        setNewCardDigits(detected.detectedDigits);
      }
      setCardOwnership(defaultOwner);
      setIsCardJoint(false);
      setCardRecognitionMessage(
        `✨ Primera vez que se detecta esta tarjeta (${detected.detectedCardName}). Se creará en la app y la titularidad se asigna por defecto a ti (${myName}).`
      );
    }
  };

  const handleCardFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatementError(null);

    // If Excel file (.xls / .xlsx)
    if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const res = parseBankinterExcel(buffer);
          if (res.success && res.movements.length > 0) {
            setParsedMovements(res.movements);
            const digits = res.cardNumber.replace(/\D/g, "").slice(-4);
            const matched = existingCards.find((c) => digits && c.ibanMask.includes(digits));
            if (matched) {
              setSelectedCardId(matched.id);
              setCardRecognitionMessage(
                `✅ Reconocida tarjeta existente: ${matched.accountName} (${matched.ibanMask})`
              );
            } else {
              setSelectedCardId("new");
              setNewCardBank("Bankinter");
              setNewCardName(res.cardName ? `Tarjeta ${res.cardName}` : "Tarjeta VISA Bankinter");
              if (digits) setNewCardDigits(digits);
              setCardOwnership(defaultOwner);
              setIsCardJoint(false);
              setCardRecognitionMessage(
                `✨ Primera vez: Nueva tarjeta detectada (${res.cardName || "VISA"}). Titularidad asignada a ${myName}.`
              );
            }
          } else {
            setStatementError(res.error || "No se encontraron movimientos en el archivo Excel.");
          }
        } catch (err: any) {
          setStatementError("Error al leer Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // CSV / Text file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStatementText(text);
      processCardFileContent(text, file.name.toLowerCase().includes("bankinter") ? "Bankinter" : "Banco");
    };
    reader.readAsText(file);
  };

  // Import Statement Movements into Target Card
  const handleImportMovementsToCard = () => {
    if (parsedMovements.length === 0) return;

    let targetCard: BankAccount;

    if (selectedCardId === "new") {
      // Register New Card for the first time
      const bank = newCardBank.trim() || "Bankinter";
      let name = newCardName.trim() || "Tarjeta VISA";
      if (!name.toLowerCase().includes("tarjeta")) {
        name = `Tarjeta ${name}`;
      }
      const rawDigits = newCardDigits.replace(/\D/g, "").slice(-4);
      const mask = rawDigits ? `VISA **** ${rawDigits}` : "VISA **** 0000";

      targetCard = {
        id: `card_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        bankName: bank,
        accountName: name,
        ibanMask: mask,
        ownership: cardOwnership, // Assigned to uploader (or JOINT if selected)
        balance: 0,
        institutionId: bank.toLowerCase().replace(/\s+/g, "_"),
        connectedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      };

      onAccountsConnected([targetCard]);
    } else {
      const found = existingCards.find((c) => c.id === selectedCardId);
      if (!found) {
        setErrorMessage("Selecciona una tarjeta válida para asociar los movimientos.");
        return;
      }
      targetCard = found;
    }

    // Map movements directly into this card with its ownership and account label
    const importResult = importBankMovements(
      parsedMovements.map((m) => ({
        id: m.id,
        concept: m.concept,
        amount: m.amount,
        date: m.date,
        monthKey: m.monthKey || new Date().toISOString().substring(0, 7),
        bankName: targetCard.bankName,
        accountLabel: targetCard.accountName,
        ownership: targetCard.ownership,
        rawConcept: m.rawConcept || m.concept,
      }))
    );

    const targetOwnerName =
      targetCard.ownership === "JOINT"
        ? "Compartida (50/50)"
        : targetCard.ownership === "USER_A"
        ? memberAName
        : memberBName;

    if (importResult.added === 0) {
      setSuccessBanner(
        `Todos los movimientos (${importResult.duplicates}) ya estaban registrados en ${targetCard.accountName}. Cero duplicados creados.`
      );
    } else if (importResult.duplicates > 0) {
      setSuccessBanner(
        `¡${importResult.added} compras nuevas incorporadas! (${importResult.duplicates} repetidas del extracto se mantuvieron intactas sin duplicar)`
      );
    } else {
      setSuccessBanner(
        `¡${importResult.added} compras incorporadas en ${targetCard.accountName} (Titular: ${targetOwnerName})!`
      );
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Direct manual account / card creation (without extract)
  const handleCreateCardDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const bank = newCardBank.trim() || "Revolut";
    let name = newCardName.trim() || (newAccountType === "card" ? "Tarjeta VISA" : `Cuenta ${bank}`);
    if (newAccountType === "card" && !name.toLowerCase().includes("tarjeta")) {
      name = `Tarjeta ${name}`;
    }
    const cleanDigits = newCardDigits.replace(/\D/g, "");
    const ibanMask = cleanDigits
      ? (newAccountType === "card" ? `VISA **** ${cleanDigits.slice(-4)}` : `ES•• •••• ${cleanDigits.slice(-4)}`)
      : (newAccountType === "card" ? "VISA **** 0000" : `ES•• •••• •••• (${bank})`);

    const balance = parseFloat(initialBalanceInput.replace(",", ".")) || 0;

    const createdItem: BankAccount = {
      id: `${newAccountType === "card" ? "card" : "acc"}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      bankName: bank,
      accountName: name,
      ibanMask,
      ownership: cardOwnership,
      balance,
      institutionId: bank.toLowerCase().replace(/\s+/g, "_"),
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    };

    onAccountsConnected([createdItem]);
    setSuccessBanner(
      `¡${newAccountType === "card" ? "Tarjeta" : "Cuenta"} "${name}" añadida con éxito con saldo de ${balance.toFixed(2)} € (Titular: ${
        cardOwnership === "JOINT" ? "Conjunta 50/50" : cardOwnership === "USER_A" ? memberAName : memberBName
      })!`
    );

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // -------------------------------------------------------------
  // OPEN BANKING PSD2 OFFICIAL FLOW
  // -------------------------------------------------------------
  const handleSelectBank = (bank: BankInstitution) => {
    setSelectedBank(bank);
    setErrorMessage(null);

    const inPool = availablePoolBanks.some(
      (b) =>
        b.toLowerCase() === bank.name.toLowerCase() ||
        b.toLowerCase() === bank.id.toLowerCase() ||
        bank.name.toLowerCase().includes(b.toLowerCase()) ||
        b.toLowerCase().includes(bank.name.toLowerCase())
    );

    if (!hasLiveCredentials && !inPool && !bank.isMock) {
      setShowConnectPrompt(true);
      return;
    }

    executeBankConnection(bank);
  };

  const isBankMatch = (nameA: string, nameB: string) => {
    const a = (nameA || "").toLowerCase();
    const b = (nameB || "").toLowerCase();
    if (a === b) return true;
    if (a.includes("revolut") && b.includes("revolut")) {
      const aLt = a.includes("lt") || a.includes("europa") || a.includes("lituania");
      const bLt = b.includes("lt") || b.includes("europa") || b.includes("lituania");
      return aLt === bLt;
    }
    if (a.includes("bankinter") && b.includes("bankinter")) return true;
    if (a.includes("santander") && b.includes("santander")) return true;
    if (a.includes("bbva") && b.includes("bbva")) return true;
    if (a.includes("caixa") && b.includes("caixa")) return true;
    if (a.includes("ing") && b.includes("ing")) return true;
    if (a.includes("sabadell") && b.includes("sabadell")) return true;
    return false;
  };

  const executeBankConnection = async (bank: BankInstitution, forceRenew = false) => {
    setIsProcessingAuth(true);
    setIsGeneratingLiveLink(true);
    setErrorMessage(null);
    setAuthUrl(null);
    setShowConnectPrompt(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("pending_bank_connection", bank.name);
    }

    const supabase = getSupabaseBrowserClient();
    const requestStartTime = Date.now();

    // 1. If not forcing renew, check if Supabase has an unexpired live link (< 8 min old)
    if (!forceRenew && supabase) {
      try {
        const { data: dbData } = await supabase
          .from("household_state")
          .select("settlements")
          .eq("household_code", "FITDUO")
          .single();
        const liveLinks = (dbData as any)?.settlements?._live_bank_links;
        if (liveLinks && typeof liveLinks === "object") {
          for (const [storedName, val] of Object.entries(liveLinks)) {
            if (isBankMatch(storedName, bank.name)) {
              const stored = val as any;
              if (stored?.url && stored.expiresAt) {
                const remainingSec = Math.floor((new Date(stored.expiresAt).getTime() - Date.now()) / 1000);
                if (remainingSec > 120) {
                  setAuthUrl(stored.url);
                  if (stored.authorizationId) setRequisitionId(stored.authorizationId);
                  setStep("AUTHORIZING");
                  setIsProcessingAuth(false);
                  setIsGeneratingLiveLink(false);
                  return;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not check Supabase live links:", err);
      }
    }

    // 2. Request brand new link in realtime via Supabase Realtime broadcast + DB polling
    if (supabase) {
      setStep("AUTHORIZING");
      const ch = supabase.channel("household_room_FITDUO");
      const reqId = `req_${Date.now()}`;

      let resolved = false;
      let pollInterval: NodeJS.Timeout | null = null;

      const cleanup = () => {
        resolved = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };

      const timer = setTimeout(async () => {
        if (!resolved) {
          cleanup();
          try {
            const data = await createBankAuthLink({ institutionId: bank.id });
            if (data.success && data.authUrl) {
              setAuthUrl(data.authUrl);
            }
          } catch {}
          setIsProcessingAuth(false);
          setIsGeneratingLiveLink(false);
        }
      }, 6500);

      ch.on("broadcast", { event: "BANK_AUTH_LINK_READY" }, (msg: any) => {
        const p = msg?.payload;
        if (p?.bank && isBankMatch(p.bank, bank.name) && p?.url) {
          cleanup();
          clearTimeout(timer);
          setAuthUrl(p.url);
          if (p.authorizationId) setRequisitionId(p.authorizationId);
          setIsProcessingAuth(false);
          setIsGeneratingLiveLink(false);
        }
      });

      const sendRequest = () => {
        ch.send({
          type: "broadcast",
          event: "REQUEST_BANK_AUTH_LINK",
          payload: { bank: bank.name, requestId: reqId },
        });
      };

      const chState = (ch as any).state;
      if (chState === "joined" || chState === "subscribed") {
        sendRequest();
      } else {
        ch.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            sendRequest();
          }
        });
      }

      // Parallel DB poll to catch link immediately once auto-sync-listener updates household_state
      pollInterval = setInterval(async () => {
        if (resolved) return;
        try {
          const { data: dbData } = await supabase
            .from("household_state")
            .select("settlements")
            .eq("household_code", "FITDUO")
            .single();
          const liveLinks = (dbData as any)?.settlements?._live_bank_links;
          if (liveLinks && typeof liveLinks === "object") {
            for (const [storedName, val] of Object.entries(liveLinks)) {
              if (isBankMatch(storedName, bank.name)) {
                const stored = val as any;
                const createdTime = stored?.createdAt ? new Date(stored.createdAt).getTime() : 0;
                if (stored?.url && createdTime >= requestStartTime - 1000) {
                  cleanup();
                  clearTimeout(timer);
                  setAuthUrl(stored.url);
                  if (stored.authorizationId) setRequisitionId(stored.authorizationId);
                  setIsProcessingAuth(false);
                  setIsGeneratingLiveLink(false);
                  return;
                }
              }
            }
          }
        } catch {}
      }, 700);

      return;
    }

    // Fallback if no Supabase available
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
      setIsGeneratingLiveLink(false);
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
          // By default, ownership belongs to whoever connects it (defaultOwner) unless marked joint
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
                    ? "Tarjetas & Carga de Extracto CSV"
                    : activeMode === "catalog"
                    ? "Conectar Cuenta Bancaria (PSD2)"
                    : "Configuración de Claves Enable Banking"
                  : step === "AUTHORIZING"
                  ? "Paso 2: Autorización Oficial PSD2"
                  : step === "ASSIGN_OWNERSHIP"
                  ? "Paso 3: Asignar Titularidad de Cuentas"
                  : "¡Vinculación Completada!"}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {activeMode === "catalog"
                  ? "Integración oficial PSD2 para cuentas bancarias."
                  : `Titularidad por defecto asignada a ti (${myName}) salvo que indiques que es conjunta.`}
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
          <div className="px-5 pt-2.5 pb-0 flex items-center gap-2 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => {
                setActiveMode("catalog");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "catalog"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Cuentas Bancarias (PSD2)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("card");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "card"
                  ? "border-[#00D09C] text-[#00A37A]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cuentas Directas & Tarjetas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("config");
                setShowConnectPrompt(false);
              }}
              className={`pb-2.5 px-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 ml-auto cursor-pointer ${
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
          {/* TAB 1: INTEGRACIÓN DE CUENTAS POR PSD2                    */}
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
                          Conectar {selectedBank.name} por Open Banking Oficial (PSD2)
                        </h4>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          Normativa Europea PSD2 AIS
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
                    Para conectar <strong>{selectedBank.name}</strong> en directo y autorizar el acceso con tu app del banco o SMS, la ley exige vincular tu clave gratuita de <strong>Enable Banking</strong>:
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveMode("config")}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Clave Enable Banking</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-amber-800">
                      ¿Deseas probar la conexión simulada PSD2?
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
                          <span>Conexión Bancaria PSD2 Oficial</span>
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
                    Selecciona tu banco para conectarlo por Open Banking oficial. La app abrirá la pasarela segura del banco y traerá tus cuentas y saldos automáticamente.
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
                  placeholder="Buscar banco (ej. Bankinter, Santander, BBVA, CaixaBank, Revolut, ING...)"
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
          {/* TAB 2: TARJETAS & CARGA DE EXTRACTO CSV                   */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "card" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-purple-950 flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">Gestión de Tarjetas & Carga de Extractos</span>
                  <span className="text-[11px] text-purple-800">
                    Sube el extracto CSV/Excel de tu tarjeta. Si es la primera vez, se reconocerá la tarjeta y se asignará la titularidad a ti (<strong>{myName}</strong>). Los siguientes extractos que subas se meterán directamente en esa tarjeta.
                  </span>
                </div>
              </div>

              {/* TARGET CARD SELECTOR */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tarjeta asociada al extracto:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualCardForm(!showManualCardForm)}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    {showManualCardForm ? "Ocultar formulario a mano" : "Crear tarjeta a mano sin extracto"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {existingCards.map((c) => {
                    const ownerName =
                      c.ownership === "JOINT"
                        ? "Compartida"
                        : c.ownership === "USER_A"
                        ? memberAName
                        : memberBName;
                    const isSelected = selectedCardId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCardId(c.id);
                          setCardRecognitionMessage(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20 text-slate-900 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black truncate">{c.accountName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            {ownerName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {c.ibanMask} • {c.bankName}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCardId("new");
                      setCardOwnership(defaultOwner);
                      setIsCardJoint(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedCardId === "new"
                        ? "border-[#00D09C] bg-emerald-50/70 ring-2 ring-[#00D09C]/20 text-slate-900 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#00A37A]">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Tarjeta (Primera vez)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Se crea y asigna a ti ({myName})
                    </span>
                  </button>
                </div>

                {cardRecognitionMessage && (
                  <div className="p-2.5 rounded-xl bg-purple-100/70 border border-purple-300 text-purple-900 text-xs font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{cardRecognitionMessage}</span>
                  </div>
                )}
              </div>

              {/* MANUAL CARD / ACCOUNT CREATION FORM */}
              {(showManualCardForm || selectedCardId === "new") && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {selectedCardId === "new" ? "Datos de la Nueva Cuenta o Tarjeta:" : "Registrar Cuenta o Tarjeta a Mano:"}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setNewAccountType("account")}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          newAccountType === "account" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🏦 Cuenta
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccountType("card")}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          newAccountType === "card" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        💳 Tarjeta
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block">Banco Emisor:</label>
                      <input
                        type="text"
                        value={newCardBank}
                        onChange={(e) => setNewCardBank(e.target.value)}
                        placeholder="Ej. Revolut / Bankinter"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block">Nombre / Alias:</label>
                      <input
                        type="text"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        placeholder={newAccountType === "account" ? "Ej. Revolut Conjunta" : "Ej. Tarjeta Débito"}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block">Saldo actual (€):</label>
                      <input
                        type="text"
                        value={initialBalanceInput}
                        onChange={(e) => setInitialBalanceInput(e.target.value)}
                        placeholder="0,00 €"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block">Últimos 4 dígitos o IBAN:</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={newCardDigits}
                        onChange={(e) => setNewCardDigits(e.target.value)}
                        placeholder="3080"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00D09C]"
                      />
                    </div>
                  </div>

                  {/* TITULARIDAD */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Titularidad inicial (asignada por defecto a quien la carga):
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCardOwnership(defaultOwner);
                          setIsCardJoint(false);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          cardOwnership === defaultOwner && !isCardJoint
                            ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs truncate block">{myName} (Tú)</span>
                        <span className="text-[9px] opacity-75 font-normal">Por defecto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCardOwnership("JOINT");
                          setIsCardJoint(true);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          cardOwnership === "JOINT"
                            ? "bg-[#00D09C] text-white border-[#00D09C] font-bold shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs truncate block">Conjunta</span>
                        <span className="text-[9px] opacity-75 font-normal">Gastos 50/50</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCardOwnership(partnerOwner);
                          setIsCardJoint(false);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          cardOwnership === partnerOwner && !isCardJoint
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs truncate block">{partnerName}</span>
                        <span className="text-[9px] opacity-75 font-normal">Pareja</span>
                      </button>
                    </div>

                    {showManualCardForm && parsedMovements.length === 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleCreateCardDirect}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Guardar {newAccountType === "card" ? "Tarjeta" : "Cuenta"} a Mano
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* UPLOAD EXTRACT (CSV, EXCEL, TXT) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/30 text-center cursor-pointer transition-all space-y-2"
              >
                <UploadCloud className="w-8 h-8 text-purple-600 mx-auto" />
                <div className="text-xs font-extrabold text-slate-800">
                  Arrastra aquí tu extracto de tarjeta (CSV, Excel o TXT) o haz clic para subirlo
                </div>
                <div className="text-[11px] text-slate-400">
                  Reconoce automáticamente los movimientos de compras de la tarjeta.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt,.tsv"
                  onChange={handleCardFileInput}
                  className="hidden"
                />
              </div>

              {statementError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {statementError}
                </div>
              )}

              {/* O PEGAR TEXTO DEL EXTRACTO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  O pega directamente el texto del extracto de la tarjeta:
                </label>
                <textarea
                  rows={3}
                  value={statementText}
                  onChange={(e) => {
                    setStatementText(e.target.value);
                    if (e.target.value.trim().length > 10) {
                      processCardFileContent(e.target.value, newCardBank);
                    }
                  }}
                  placeholder="Tarjeta: VISA CLÁSICA (**** 3080)&#10;15/09/2026;MERCADONA;-45,30&#10;12/09/2026;REPSOL;-30,00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00D09C]"
                />
              </div>

              {/* MOVEMENTS PREVIEW AND CONFIRM BUTTON */}
              {parsedMovements.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      Vista previa ({parsedMovements.length} compras detectadas):
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      Total:{" "}
                      {parsedMovements
                        .reduce((sum, m) => sum + Math.abs(m.amount), 0)
                        .toFixed(2)}{" "}
                      €
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {parsedMovements.slice(0, 6).map((m, idx) => (
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
                        <span className="font-black text-xs shrink-0 text-slate-900">
                          {Math.abs(m.amount).toFixed(2)} €
                        </span>
                      </div>
                    ))}
                    {parsedMovements.length > 6 && (
                      <div className="text-center text-[10px] text-slate-400 py-1 font-semibold">
                        + {parsedMovements.length - 6} compras más...
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportMovementsToCard}
                    className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Incorporar {parsedMovements.length} Movimientos a{" "}
                      {selectedCardId === "new" ? "la Nueva Tarjeta" : "esta Tarjeta"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ENABLE BANKING API CONFIGURATION                   */}
          {/* ========================================================= */}
          {step === "SELECT_BANK" && activeMode === "config" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                  <span>Configuración de tu Conexión Real Enable Banking</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Enable Banking permite conectar bancos españoles de forma <strong>100% gratuita para uso personal</strong> mediante la API PSD2 AIS.
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
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#00A37A] shadow-sm">
                <Landmark className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  Pasarela Oficial PSD2
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Conectar con {selectedBank?.name || "tu Banco"}
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Pulsa el botón inferior para abrir la pasarela regulada de <strong>Enable Banking</strong>. Iniciarás sesión de forma 100% segura en tu entidad para vincular tus cuentas reales.
                </p>
              </div>

              {isGeneratingLiveLink ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 animate-in fade-in">
                  <RefreshCw className="w-8 h-8 text-[#00A37A] animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Generando enlace oficial en directo con {selectedBank?.name}...
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Creando pasarela oficial PSD2 autorizada (validez 10 min)
                    </p>
                  </div>
                </div>
              ) : authUrl ? (
                <div className="pt-2 space-y-3">
                  <a
                    href={authUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white font-extrabold text-xs shadow-md shadow-[#00D09C]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Abrir Pasarela Oficial de {selectedBank?.name || "tu Banco"}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => selectedBank && executeBankConnection(selectedBank, true)}
                      disabled={isGeneratingLiveLink}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                      title="Si el banco te indica que el enlace ha caducado, pulsa aquí para generar uno nuevo al instante"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingLiveLink ? "animate-spin" : ""}`} />
                      <span>🔄 ¿Enlace caducado? Renovar enlace nuevo</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">ℹ️ Pasos para conectar tu cuenta real:</p>
                    <p>1. Se abrirá la pasarela segura oficial de {selectedBank?.name || "tu entidad"}.</p>
                    <p>2. Introduce tu teléfono o escanea el QR para autorizar con tu app bancaria.</p>
                    {selectedBank?.name.toLowerCase().includes("revolut") && (
                      <div className="my-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1.5">
                        <p className="font-bold">⚠️ Importante para usuarios de Revolut:</p>
                        <p>
                          La pasarela PSD2 de Revolut <strong>solo autoriza Cuentas Personales individuales</strong>. Revolut no permite conectar Cuentas Conjuntas por Open Banking.
                        </p>
                        <p>
                          • En la app de Revolut, <strong>marca únicamente tu cuenta Personal</strong>.
                        </p>
                        <p>
                          • Si quieres registrar tu <strong>Cuenta Conjunta de Revolut</strong>, hazlo directamente a mano o subiendo extracto:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setStep("SELECT_BANK");
                            setActiveMode("card");
                            setNewAccountType("account");
                            setNewCardBank("Revolut");
                            setNewCardName("Revolut Conjunta");
                            setCardOwnership("JOINT");
                            setIsCardJoint(true);
                            setShowManualCardForm(true);
                            setSelectedCardId("new");
                          }}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>👉 Registrar Revolut Conjunta directamente a mano</span>
                        </button>
                      </div>
                    )}
                    <p>3. Los enlaces tienen 10 minutos de validez. Si tardaste en entrar, pulsa arriba <strong>"Renovar enlace nuevo"</strong>.</p>
                    <p>4. Al terminar, volverás a la app con tus cuentas reales conectadas.</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ASSIGN OWNERSHIP FOR DISCOVERED ACCOUNTS          */}
          {/* ========================================================= */}
          {step === "ASSIGN_OWNERSHIP" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <span className="font-extrabold block">¡Cuentas recuperadas de tu banco por PSD2!</span>
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
