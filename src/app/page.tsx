"use client";

import React, { useState, useEffect } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useNavigation } from "@/context/NavigationContext";
import {
  useTransactions,
  SplitType,
  CATEGORIES_LIST,
  CATEGORY_COLOR_PALETTE,
  getCategoryFrequencyGroup,
  Transaction,
} from "@/context/TransactionsContext";
import MonthSelector from "@/components/MonthSelector";
import AddManualExpenseModal from "@/components/AddManualExpenseModal";
import CoupleLinkingCard from "@/components/CoupleLinkingCard";
import ConnectBankModal from "@/components/ConnectBankModal";
import BankSyncConsole from "@/components/BankSyncConsole";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import versionData from "../../version.json";
import {
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ArrowDownLeft,
  ShoppingCart,
  Zap,
  Utensils,
  Fuel,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Building2,
  Sparkles,
  ArrowRightLeft,
  Landmark,
  Settings as SettingsIcon,
  Check,
  SlidersHorizontal,
  ReceiptText,
  UserCheck,
  Plus,
  Users,
  User,
  Tag,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Palette,
  X,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ColorPickerPopoverProps {
  palette: string[];
  usedColors: Set<string>;
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

function ColorPickerPopover({
  palette,
  usedColors,
  currentColor,
  onSelect,
  onClose,
}: ColorPickerPopoverProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-50 p-3 bg-white rounded-2xl shadow-xl border border-slate-200 w-64 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-700">Elige un color único (20)</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {palette.map((color) => {
            const isUsedByOther = usedColors.has(color.toUpperCase());
            const isSelected = currentColor.toUpperCase() === color.toUpperCase();

            return (
              <button
                key={color}
                type="button"
                disabled={isUsedByOther}
                onClick={() => onSelect(color)}
                title={
                  isUsedByOther
                    ? "Color ya usado por otra categoría"
                    : isSelected
                    ? "Color seleccionado actualmente"
                    : "Asignar este color"
                }
                className={`relative w-9 h-9 rounded-xl transition-all flex items-center justify-center ${
                  isSelected
                    ? "ring-2 ring-slate-900 ring-offset-2 scale-105 shadow-sm"
                    : isUsedByOther
                    ? "opacity-20 cursor-not-allowed border border-dashed border-slate-400"
                    : "hover:scale-110 active:scale-95 hover:shadow-md cursor-pointer border border-black/10"
                }`}
                style={{ backgroundColor: color }}
              >
                {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                {isUsedByOther && (
                  <span className="text-[9px] font-extrabold text-slate-800 select-none">✕</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Los colores con ✕ ya están en uso por otra categoría.
        </p>
      </div>
    </>
  );
}

export default function HomePage() {
  const { memberAName, memberBName, setMemberAName, setMemberBName } = useUserNames();
  const { activeTab, setActiveTab } = useNavigation();
  const {
    transactions,
    accounts,
    classifyTransaction,
    reclassifyTransaction,
    updateTransactionCategory,
    getAccountDisplay,
    pendingTransactions,
    classifiedTransactions,
    jointClassifiedTransactions,
    memberAClassifiedTransactions,
    memberBClassifiedTransactions,
    totalJointSpent,
    totalMemberASpent,
    totalMemberBSpent,
    jointCategoriesBreakdown,
    memberACategoriesBreakdown,
    memberBCategoriesBreakdown,
    balanceData,
    debtContributingMovements,
    settleDebt,
    resetSettlement,
    hasActiveSettlement,
    lastSettlementInfo,
    categories,
    addCategory,
    updateCategoryColor,
    deleteCategory,
    getCategoryUsageStatus,
    getCategoryMonthlyBreakdown,
    allPendingTransactions,
    selectedMonth,
    addConnectedAccounts,
    updateAccountOwnership,
    updateAccountBalance,
    removeAccount,
    syncBankFeed,
    clearAllTransactions,
  } = useTransactions();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankCallbackReqId, setBankCallbackReqId] = useState<string | null>(null);
  const [bankModalInitialMode, setBankModalInitialMode] = useState<"catalog" | "statement" | "config">("catalog");
  const [bankModalInitialBank, setBankModalInitialBank] = useState<string>("Bankinter");
  const [editingBalanceAccountId, setEditingBalanceAccountId] = useState<string | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState<string>("");

  const [bankAuthCodeReceived, setBankAuthCodeReceived] = useState<string | null>(null);
  const [bankAuthCodeCopied, setBankAuthCodeCopied] = useState(false);

  // Check for bank callback redirection in URL (PSD2 OAuth redirect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get("bank_auth_success");
    const code = urlParams.get("code");
    const sessionId = urlParams.get("session_id");
    const reqId = urlParams.get("requisition_id");
    const errorParam = urlParams.get("error");

    if (code) {
      localStorage.setItem("last_bank_auth_code", code);
      setBankAuthCodeReceived(code);
      setToastMsg(`✅ Código bancario recibido de Bankinter`);

      // Broadcast to Supabase Realtime with PSU context so worker satisfies Redsys PSD2
      (async () => {
        try {
          const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
          let clientIp = "";
          try {
            const ipRes = await fetch("https://api64.ipify.org?format=json").then((r) => r.json());
            clientIp = ipRes.ip;
          } catch {}

          const supabase = getSupabaseBrowserClient();
          if (supabase) {
            const ch = supabase.channel("household_room_FITDUO");
            ch.subscribe((status: any) => {
              if (status === "SUBSCRIBED") {
                ch.send({
                  type: "broadcast",
                  event: "BANK_AUTH_CODE",
                  payload: {
                    code,
                    bank: "Bankinter",
                    psuIp: clientIp,
                    psuUserAgent: userAgent,
                    timestamp: Date.now(),
                  },
                });
              }
            });
          }
        } catch (err) {
          console.warn("Could not broadcast bank auth code:", err);
        }
      })();
    }

    if (errorParam) {
      console.warn("Bank OAuth redirect error:", errorParam);
      setToastMsg(`⚠️ Aviso del banco: ${errorParam}`);
    }

    // Only open the connect modal for GoCardless requisitions or explicit session IDs, NEVER for raw OAuth codes
    const callbackId = authSuccess === "true" && reqId ? reqId : sessionId;

    if (callbackId) {
      setActiveTab("cuentas");
      setBankCallbackReqId(callbackId);
      setIsBankModalOpen(true);
    }

    // Clean up URL parameters if code or callback was received
    if (code || callbackId || errorParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [setActiveTab]);

  // Category tab state
  const [newConceptName, setNewConceptName] = useState("");
  const [newConceptColor, setNewConceptColor] = useState(() => {
    const used = categories.map((c) => c.color.toUpperCase());
    const available = CATEGORY_COLOR_PALETTE.find((c) => !used.includes(c.toUpperCase()));
    return available || CATEGORY_COLOR_PALETTE[0];
  });
  const [showAddColorPicker, setShowAddColorPicker] = useState(false);
  const [editingCategoryColor, setEditingCategoryColor] = useState<string | null>(null);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleAddConcept = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCategory(newConceptName, newConceptColor);
    if (!res.success) {
      setConceptError(res.error || "Error al añadir el concepto");
    } else {
      const addedName = newConceptName.trim();
      setNewConceptName("");
      setConceptError(null);
      setShowAddColorPicker(false);

      // Auto-asignar el siguiente color libre de la paleta de 20
      const usedNow = [...categories.map((c) => c.color.toUpperCase()), newConceptColor.toUpperCase()];
      const nextAvailable = CATEGORY_COLOR_PALETTE.find((c) => !usedNow.includes(c.toUpperCase()));
      if (nextAvailable) {
        setNewConceptColor(nextAvailable);
      }

      setToastMsg(`Categoría "${addedName}" añadida correctamente`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleUpdateCategoryColor = (catName: string, chosenColor: string) => {
    const res = updateCategoryColor(catName, chosenColor);
    if (!res.success) {
      setToastMsg(res.error || "No se pudo actualizar el color");
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      setEditingCategoryColor(null);
      setToastMsg(`Color de "${catName}" actualizado correctamente`);
      setTimeout(() => setToastMsg(null), 3000);

      const usedNow = categories.map((c) =>
        c.name === catName ? chosenColor.toUpperCase() : c.color.toUpperCase()
      );
      if (usedNow.includes(newConceptColor.toUpperCase())) {
        const nextFree = CATEGORY_COLOR_PALETTE.find((c) => !usedNow.includes(c.toUpperCase()));
        if (nextFree) {
          setNewConceptColor(nextFree);
        }
      }
    }
  };

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`¿Seguro que deseas eliminar la categoría "${catName}"? Los gastos asociados existentes se reasignarán automáticamente a la categoría principal sin perderse.`)) {
      const res = deleteCategory(catName);
      if (res.success) {
        if (expandedCategory === catName) {
          setExpandedCategory(null);
        }
        setToastMsg(`Categoría "${catName}" eliminada correctamente`);
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        alert(res.error || "No se pudo eliminar la categoría");
      }
    }
  };

  const truncateConcept = (str: string, maxLength: number = 24) => {
    if (!str) return "";
    return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
  };

  // Settings tab form state
  const [inputNameA, setInputNameA] = useState(memberAName);
  const [inputNameB, setInputNameB] = useState(memberBName);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTriage = (id: string, split: SplitType, label: string) => {
    const tx = transactions.find((t) => t.id === id);
    classifyTransaction(id, split);
    if (tx?.payer === "memberA" && split === "memberB") {
      showToast(`Asignado: Compra para ${memberBName} (100% deuda a favor de ${memberAName}).`);
    } else if (tx?.payer === "memberB" && split === "memberA") {
      showToast(`Asignado: Compra para ${memberAName} (100% deuda a favor de ${memberBName}).`);
    } else {
      showToast(`Movimiento asignado a "${label}". Balance recalculado.`);
    }
  };

  const handleReclassify = (id: string, split: SplitType, label: string) => {
    const tx = transactions.find((t) => t.id === id);
    reclassifyTransaction(id, split);
    if (tx?.payer === "memberA" && split === "memberB") {
      showToast(`Reclasificado: Compra para ${memberBName} (100% deuda a favor de ${memberAName}).`);
    } else if (tx?.payer === "memberB" && split === "memberA") {
      showToast(`Reclasificado: Compra para ${memberAName} (100% deuda a favor de ${memberBName}).`);
    } else {
      showToast(`Reparto reclasificado a "${label}". Balance recalculado.`);
    }
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    updateTransactionCategory(id, newCategory);
    showToast(`Categoría cambiada a "${newCategory}". Gráfico actualizado.`);
  };

  const handleSaveNames = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNameA.trim()) setMemberAName(inputNameA.trim());
    if (inputNameB.trim()) setMemberBName(inputNameB.trim());
    showToast("¡Nombres del hogar actualizados con éxito!");
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#00A37A] text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Add Manual Expense Modal */}
      <AddManualExpenseModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* ============================================================ */}
      {/* GRÁFICA 1: GASTOS CONJUNTOS (1/2)                            */}
      {/* ============================================================ */}
      {activeTab === "resumen_conjunta" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                  <Users className="w-5 h-5 text-[#00A37A] shrink-0" />
                  <span>Gastos Conjuntos</span>
                </h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold whitespace-nowrap">
                  Reparto 1/2
                </span>
                <MonthSelector />
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center gap-5 shrink-0 ml-auto sm:ml-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block whitespace-nowrap">
                    Total Conjunto
                  </span>
                  <span className="text-[11px] text-[#008761] font-semibold flex items-center justify-end gap-1 mt-0.5 whitespace-nowrap">
                    <TrendingDown className="w-3.5 h-3.5" /> {jointClassifiedTransactions.length} comunes
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                  {totalJointSpent.toFixed(2)}
                  <span className="text-lg text-[#00A37A] ml-1 font-bold">€</span>
                </div>
              </div>
            </div>
          </section>

          {/* Grid: Donut Chart & Latest Joint Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Joint Donut Chart */}
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
                  Categorías Conjuntas
                </h2>
                <span className="text-xs font-bold text-[#008761]">1/2 Común</span>
              </div>

              <div className="relative h-64 w-full flex items-center justify-center my-3">
                {jointCategoriesBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={jointCategoriesBreakdown}
                          innerRadius={76}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {jointCategoriesBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(2)} €`, "Gasto"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E2E8F0",
                            borderRadius: "1rem",
                            color: "#0F172A",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Total Común
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {totalJointSpent.toFixed(0)} €
                      </span>
                      <span className="text-[11px] text-[#008761] font-bold mt-0.5">
                        Reparto 50/50
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 text-xs py-8">
                    No hay gastos conjuntos registrados en este mes.
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {jointCategoriesBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{cat.value.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Latest Joint Movements (igual que en las otras vistas) */}
            <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
                    Últimos Movimientos Conjuntos
                  </h2>
                  <span className="text-xs font-bold text-[#008761]">
                    {jointClassifiedTransactions.length} comunes
                  </span>
                </div>

                {jointClassifiedTransactions.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8">
                    No hay movimientos conjuntos registrados en este mes.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                    {jointClassifiedTransactions.map((tx) => (
                      <div key={tx.id} className="py-3 flex items-center justify-between">
                        <div>
                          {tx.isManual ? (
                            <button
                              type="button"
                              onClick={() => setEditingTransaction(tx)}
                              className="text-left text-xs font-bold text-slate-900 hover:text-[#00A37A] hover:underline transition-colors flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-xs cursor-pointer"
                              title="Gasto manual: Pulsar para editar o eliminar"
                            >
                              <span className="truncate">{truncateConcept(tx.merchant, 22)}</span>
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                                Manual
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-900 block truncate max-w-[160px] sm:max-w-xs">
                              {truncateConcept(tx.merchant, 24)}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">{tx.category} • {tx.date}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                tx.payer === "memberA"
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : tx.payer === "memberB"
                                  ? "bg-blue-50 text-blue-600 border-blue-200"
                                  : "bg-emerald-50 text-[#008761] border-emerald-200"
                              }`}
                            >
                              Pagó {tx.payer === "memberA" ? memberAName : tx.payer === "memberB" ? memberBName : "Conjunta"}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900">{tx.amount.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActiveTab("movimientos")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Ver todos los movimientos</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GRÁFICA 2: GASTOS DE CARLOS (EXCLUSIVOS, SIN DUPLICAR 1/2)   */}
      {/* ============================================================ */}
      {activeTab === "resumen_carlos" && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                  <User className="w-5 h-5 text-red-500 shrink-0" />
                  <span>Gastos de {memberAName}</span>
                </h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-bold whitespace-nowrap">
                  Individual
                </span>
                <MonthSelector />
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center gap-5 shrink-0 ml-auto sm:ml-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block whitespace-nowrap">
                    Total {memberAName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 whitespace-nowrap">
                    {memberAClassifiedTransactions.length} individuales
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight whitespace-nowrap">
                  {totalMemberASpent.toFixed(2)} €
                </div>
              </div>
            </div>
          </section>

          {/* Donut Chart Carlos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Categorías de {memberAName}
                </h2>
                <span className="text-xs font-bold text-red-600">100% Individual</span>
              </div>

              <div className="relative h-64 w-full flex items-center justify-center my-3">
                {memberACategoriesBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={memberACategoriesBreakdown}
                          innerRadius={76}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {memberACategoriesBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(2)} €`, "Gasto"]}
                          contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "1rem" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Total {memberAName}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                        {totalMemberASpent.toFixed(0)} €
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 text-xs py-8">
                    {memberAName} no tiene gastos individuales propios este mes.
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {memberACategoriesBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    <span className="text-xs font-bold text-slate-900">{cat.value.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </section>

            {/* List of Carlos's personal expenses */}
            <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Movimientos de {memberAName}
                </h2>
                <span className="text-xs font-bold text-red-600">
                  {memberAClassifiedTransactions.length}
                </span>
              </div>
              {memberAClassifiedTransactions.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  No hay movimientos personales asignados a {memberAName}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                  {memberAClassifiedTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between">
                      <div>
                        {tx.isManual ? (
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(tx)}
                            className="text-left text-xs font-bold text-slate-900 hover:text-red-600 hover:underline transition-colors flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-xs cursor-pointer"
                            title="Gasto manual: Pulsar para editar o eliminar"
                          >
                            <span className="truncate">{truncateConcept(tx.merchant, 22)}</span>
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                              Manual
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-900 block truncate max-w-[160px] sm:max-w-xs">
                            {truncateConcept(tx.merchant, 24)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {tx.isCredit ? "💰 Ingreso • " : ""}{tx.category} • {tx.date}
                        </span>
                      </div>
                      <span className={`text-sm font-black whitespace-nowrap ${tx.isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                        {tx.isCredit ? `+ ${tx.amount.toFixed(2)} €` : `${tx.amount.toFixed(2)} €`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GRÁFICA 3: GASTOS DE ANDREA (EXCLUSIVOS, SIN DUPLICAR 1/2)   */}
      {/* ============================================================ */}
      {activeTab === "resumen_andrea" && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                  <User className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>Gastos de {memberBName}</span>
                </h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold whitespace-nowrap">
                  Individual
                </span>
                <MonthSelector />
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center gap-5 shrink-0 ml-auto sm:ml-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block whitespace-nowrap">
                    Total {memberBName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 whitespace-nowrap">
                    {memberBClassifiedTransactions.length} individuales
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight whitespace-nowrap">
                  {totalMemberBSpent.toFixed(2)} €
                </div>
              </div>
            </div>
          </section>

          {/* Donut Chart Andrea */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Distribución Personal de {memberBName}
                </h2>
                <span className="text-xs font-bold text-blue-600">100% Individual</span>
              </div>

              <div className="relative h-64 w-full flex items-center justify-center my-3">
                {memberBCategoriesBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={memberBCategoriesBreakdown}
                          innerRadius={76}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {memberBCategoriesBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(2)} €`, "Gasto"]}
                          contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "1rem" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Total {memberBName}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                        {totalMemberBSpent.toFixed(0)} €
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 text-xs py-8">
                    {memberBName} no tiene gastos individuales propios este mes.
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {memberBCategoriesBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    <span className="text-xs font-bold text-slate-900">{cat.value.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </section>

            {/* List of Andrea's personal expenses */}
            <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Movimientos Propios de {memberBName}
                </h2>
                <span className="text-xs font-bold text-blue-600">
                  {memberBClassifiedTransactions.length}
                </span>
              </div>
              {memberBClassifiedTransactions.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  No hay movimientos personales asignados a {memberBName}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                  {memberBClassifiedTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between">
                      <div>
                        {tx.isManual ? (
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(tx)}
                            className="text-left text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-xs cursor-pointer"
                            title="Gasto manual: Pulsar para editar o eliminar"
                          >
                            <span className="truncate">{truncateConcept(tx.merchant, 22)}</span>
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                              Manual
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-900 block truncate max-w-[160px] sm:max-w-xs">
                            {truncateConcept(tx.merchant, 24)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {tx.isCredit ? "💰 Ingreso • " : ""}{tx.category} • {tx.date}
                        </span>
                      </div>
                      <span className={`text-sm font-black whitespace-nowrap ${tx.isCredit ? "text-emerald-600" : "text-slate-900"}`}>
                        {tx.isCredit ? `+ ${tx.amount.toFixed(2)} €` : `${tx.amount.toFixed(2)} €`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: MOVIMIENTOS (+ AÑADIR GASTO MANUAL)                   */}
      {/* ============================================================ */}
      {activeTab === "movimientos" && (
        <div className="space-y-6">
          {/* Header with Month Selector & "+ Gasto" Button */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-[#00A37A]" />
              <span>Movimientos</span>
            </h1>

            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <MonthSelector />
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Gasto</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: PENDIENTES (Bandeja unificada con preservación estricta de fecha) */}
          <div className="border border-amber-300/80 bg-amber-50/40 rounded-3xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200/70 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Bandeja de Triage ({allPendingTransactions.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-800/90 font-semibold bg-amber-100/90 px-2.5 py-1 rounded-full">
                  ⚡ La fecha original de cada gasto manda
                </span>
              </div>
            </div>

            {allPendingTransactions.length === 0 ? (
              <div className="p-5 text-center text-slate-400 text-xs bg-white/70 rounded-2xl border border-dashed border-amber-200">
                <CheckCircle2 className="w-5 h-5 text-[#00A37A] mx-auto mb-1" />
                <span className="font-semibold text-slate-700 block">¡Bandeja al día!</span>
                <span>Todos los gastos están clasificados.</span>
              </div>
            ) : (
              <div className="divide-y divide-amber-200/70">
                {allPendingTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-amber-100/40 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          tx.isCredit
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            : ""
                        }`}
                        style={
                          tx.isCredit
                            ? undefined
                            : { backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }
                        }
                        title={tx.isCredit ? "Ingreso / Abono bancario" : tx.category}
                      >
                        {tx.isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
                        {/* Línea 1: Concepto con límite de caracteres */}
                        {tx.isManual ? (
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(tx)}
                            className={`text-left font-bold text-xs sm:text-sm hover:underline transition-colors flex items-center gap-1.5 truncate w-full leading-tight cursor-pointer ${
                              tx.isCredit
                                ? "text-emerald-950 hover:text-emerald-700"
                                : "text-slate-900 hover:text-amber-800"
                            }`}
                            title="Gasto manual: Pulsar para editar o eliminar"
                          >
                            <span className="truncate">{truncateConcept(tx.merchant, 26)}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 shrink-0">
                              Manual
                            </span>
                          </button>
                        ) : (
                          <span
                            className={`font-bold text-xs sm:text-sm block truncate w-full leading-tight ${
                              tx.isCredit ? "text-emerald-950" : "text-slate-900"
                            }`}
                          >
                            {truncateConcept(tx.merchant, 28)}
                          </span>
                        )}

                        {/* Línea 2: Categoría */}
                        <div className="relative inline-block max-w-[125px] xs:max-w-[145px] sm:max-w-none">
                          <select
                            value={tx.category}
                            onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                            className="appearance-none cursor-pointer text-[10px] font-bold py-0.5 pl-1.5 pr-3.5 rounded-md border border-amber-300 bg-white text-slate-700 hover:border-amber-500 focus:outline-none leading-none w-full truncate block"
                          >
                            {(categories || CATEGORIES_LIST).map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
                            ▼
                          </span>
                        </div>

                        {/* Línea 3: Fecha, cuenta y badge */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate leading-tight">
                            {tx.date} • {getAccountDisplay(tx)}
                          </span>
                          {tx.isCredit && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              💰 Ingreso / Abono
                            </span>
                          )}
                          {tx.monthKey !== selectedMonth && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-950 border border-amber-300">
                              📅 Original de {tx.monthKey === "2026-08" ? "Agosto 2026" : tx.monthKey}
                            </span>
                          )}
                          {tx.payer === "memberA" && tx.split === "memberB" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                              Para {memberBName} (100% deuda)
                            </span>
                          )}
                          {tx.payer === "memberB" && tx.split === "memberA" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                              Para {memberAName} (100% deuda)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-center gap-1 shrink-0 ml-2">
                      <span
                        className={`text-sm sm:text-base font-black whitespace-nowrap text-right leading-none ${
                          tx.isCredit ? "text-emerald-600 font-extrabold" : "text-slate-900"
                        }`}
                      >
                        {tx.isCredit ? `+ ${tx.amount.toFixed(2)} €` : `${tx.amount.toFixed(2)} €`}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleTriage(
                              tx.id,
                              "50/50",
                              tx.isCredit ? "Abono 50/50 (Compartido)" : "1/2 (Compartido)"
                            )
                          }
                          className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-white text-[10px] sm:text-xs font-bold shadow-xs whitespace-nowrap ${
                            tx.isCredit
                              ? "bg-emerald-700 hover:bg-emerald-800"
                              : "bg-slate-900 hover:bg-slate-800"
                          }`}
                          title={tx.isCredit ? "Abono compartido al 50%" : "Gasto compartido 50/50"}
                        >
                          {tx.isCredit ? "1/2 Abono" : "1/2"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTriage(
                              tx.id,
                              "memberA",
                              tx.isCredit ? `Ingreso de ${memberAName}` : `Solo ${memberAName}`
                            )
                          }
                          className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-white hover:bg-red-50 text-red-600 text-[10px] sm:text-xs font-bold border border-slate-200 hover:border-red-300 whitespace-nowrap"
                          title={
                            tx.isCredit
                              ? `Ingreso exclusivo de ${memberAName}`
                              : `Solo ${memberAName}`
                          }
                        >
                          {memberAName}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTriage(
                              tx.id,
                              "memberB",
                              tx.isCredit ? `Ingreso de ${memberBName}` : `Solo ${memberBName}`
                            )
                          }
                          className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 text-blue-600 text-[10px] sm:text-xs font-bold border border-slate-200 hover:border-blue-300 whitespace-nowrap"
                          title={
                            tx.isCredit
                              ? `Ingreso exclusivo de ${memberBName}`
                              : `Solo ${memberBName}`
                          }
                        >
                          {memberBName}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: HISTÓRICO RECLASIFICABLE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#00A37A]" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Histórico de Movimientos
                </h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {classifiedTransactions.length}
                </span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <MonthSelector className="scale-90 sm:scale-95 origin-left sm:origin-right" />
              </div>
            </div>

            {classifiedTransactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <span className="font-semibold text-slate-700 block">No hay movimientos en este mes</span>
                <span className="text-slate-400 block mt-0.5">Usa el selector para ver otros meses del histórico.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {classifiedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-50/60 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.isCredit
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                          : ""
                      }`}
                      style={
                        tx.isCredit
                          ? undefined
                          : { backgroundColor: `${tx.categoryColor}15`, color: tx.categoryColor }
                      }
                      title={tx.isCredit ? "Ingreso / Abono bancario" : tx.category}
                    >
                      {tx.isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
                      {/* Línea 1: Concepto alineado a la izquierda */}
                      {tx.isManual ? (
                        <button
                          type="button"
                          onClick={() => setEditingTransaction(tx)}
                          className={`text-left font-bold text-xs sm:text-sm hover:underline transition-colors flex items-center gap-1.5 truncate w-full leading-tight cursor-pointer ${
                            tx.isCredit
                              ? "text-emerald-950 hover:text-emerald-700"
                              : "text-slate-900 hover:text-[#00A37A]"
                          }`}
                          title="Gasto manual: Pulsar para editar o eliminar"
                        >
                          <span className="truncate">{truncateConcept(tx.merchant, 26)}</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                            Manual
                          </span>
                        </button>
                      ) : (
                        <span
                          className={`font-bold text-xs sm:text-sm block truncate w-full leading-tight ${
                            tx.isCredit ? "text-emerald-950" : "text-slate-900"
                          }`}
                        >
                          {truncateConcept(tx.merchant, 28)}
                        </span>
                      )}

                      {/* Línea 2: Categoría */}
                      <div className="relative inline-block max-w-[125px] xs:max-w-[145px] sm:max-w-none">
                        <select
                          value={tx.category}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                          className="appearance-none cursor-pointer text-[10px] font-bold py-0.5 pl-1.5 pr-3.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#00D09C] focus:outline-none leading-none w-full truncate block"
                        >
                          {(categories || CATEGORIES_LIST).map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
                          ▼
                        </span>
                      </div>

                      {/* Línea 3: Fecha, cuenta y badge */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] sm:text-[11px] text-slate-400 truncate leading-tight">
                          {tx.date} • {getAccountDisplay(tx)}
                        </span>
                        {tx.isCredit && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            💰 Ingreso / Abono
                          </span>
                        )}
                        {tx.payer === "memberA" && tx.split === "memberB" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            Para {memberBName} (100% deuda)
                          </span>
                        )}
                        {tx.payer === "memberB" && tx.split === "memberA" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                            Para {memberAName} (100% deuda)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alineado a la derecha: importe arriba, selector debajo */}
                  <div className="flex flex-col items-end justify-center gap-1 shrink-0 ml-2">
                    <span
                      className={`text-sm sm:text-base font-black whitespace-nowrap text-right leading-none ${
                        tx.isCredit ? "text-emerald-600 font-extrabold" : "text-slate-900"
                      }`}
                    >
                      {tx.isCredit ? `+ ${tx.amount.toFixed(2)} €` : `${tx.amount.toFixed(2)} €`}
                    </span>

                    {/* Reclassification Split Pill */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5 text-[10px] sm:text-[11px] shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleReclassify(
                            tx.id,
                            "50/50",
                            tx.isCredit ? "Abono 50/50" : "1/2 (Compartido)"
                          )
                        }
                        className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "50/50"
                            ? tx.isCredit
                              ? "bg-emerald-700 text-white shadow-xs"
                              : "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={tx.isCredit ? "Abono compartido al 50%" : "Gasto compartido 50/50"}
                      >
                        {tx.isCredit ? "1/2 Abono" : "1/2"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReclassify(
                            tx.id,
                            "memberA",
                            tx.isCredit ? `Ingreso de ${memberAName}` : `Solo ${memberAName}`
                          )
                        }
                        className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "memberA"
                            ? "bg-red-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={
                          tx.isCredit
                            ? `Ingreso exclusivo de ${memberAName}`
                            : `Solo ${memberAName}`
                        }
                      >
                        {memberAName}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReclassify(
                            tx.id,
                            "memberB",
                            tx.isCredit ? `Ingreso de ${memberBName}` : `Solo ${memberBName}`
                          )
                        }
                        className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "memberB"
                            ? "bg-blue-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={
                          tx.isCredit
                            ? `Ingreso exclusivo de ${memberBName}`
                            : `Solo ${memberBName}`
                        }
                      >
                        {memberBName}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: BALANCES & DEUDA                                       */}
      {/* ============================================================ */}
      {activeTab === "balances" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#00A37A]" />
                <span>Balances & Deuda</span>
              </h1>
              <MonthSelector />
            </div>

            {/* Opciones de Liquidación / Neteo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opción 1: Neteo Directo entre Miembros */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#008761] bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                      Opción 1: Neteo Directo
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Bizum / Transferencia</span>
                  </div>
                  {balanceData.debtor !== "none" ? (
                    <div className="mt-3">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                        <span className={balanceData.debtor === "memberA" ? "text-red-600" : "text-blue-600"}>
                          {balanceData.debtorName}
                        </span>{" "}
                        paga a{" "}
                        <span className={balanceData.debtor === "memberA" ? "text-blue-600" : "text-red-600"}>
                          {balanceData.creditorName}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Cada miembro asume el 50% exacto de su bolsillo.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <h3 className="text-lg sm:text-xl font-black text-[#008761]">
                        ¡Cuentas equilibradas!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        No hay deudas personales pendientes entre vosotros.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Importe a transferir</span>
                    <span className="text-3xl font-black text-[#008761]">
                      {balanceData.netDebt.toFixed(2)} €
                    </span>
                  </div>
                  {balanceData.debtor !== "none" && (
                    <button
                      onClick={() =>
                        alert(
                          `Bizum directo: ${balanceData.debtorName} transfiere ${balanceData.netDebt.toFixed(2)} € a ${balanceData.creditorName}. Las cuentas personales quedan saldadas al 100%.`
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/25 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Saldar por Bizum</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Opción 2: Neteo con la Cuenta Conjunta */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-50/60 via-white to-slate-50 border border-blue-200/80 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                      Opción 2: Neteo con la Conjunta
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Fondo común</span>
                  </div>
                  {balanceData.debtor !== "none" ? (
                    <div className="mt-3">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                        <span className={balanceData.debtor === "memberA" ? "text-red-600" : "text-blue-600"}>
                          {balanceData.debtorName}
                        </span>{" "}
                        aporta a la{" "}
                        <span className="text-[#008761]">Cuenta Conjunta</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Ingresa el importe en la cuenta común para igualar las aportaciones totales sin traspasos personales.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <h3 className="text-lg sm:text-xl font-black text-blue-700">
                        ¡Aportaciones niveladas!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Ambos habéis aportado exactamente la misma cantidad este mes.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ingreso a la Conjunta</span>
                    <span className="text-3xl font-black text-blue-600">
                      {balanceData.netDebtToJoint.toFixed(2)} €
                    </span>
                  </div>
                  {balanceData.debtor !== "none" && (
                    <button
                      onClick={() =>
                        alert(
                          `Transferencia a Conjunta: ${balanceData.debtorName} transfiere ${balanceData.netDebtToJoint.toFixed(2)} € a la BBVA Cuenta Conjunta. Ambas aportaciones totales quedarán igualadas.`
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Ingresar a Conjunta</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Movimientos que componen la deuda actual */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-[#00A37A]" />
                    <span>Movimientos que componen esta deuda</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gastos que generan saldo positivo o negativo entre vosotros (excluye gastos pagados con la cuenta conjunta).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100/70 text-[#008761]">
                    {debtContributingMovements.length} {debtContributingMovements.length === 1 ? "movimiento" : "movimientos"}
                  </span>
                  {hasActiveSettlement && (
                    <button
                      type="button"
                      onClick={resetSettlement}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline ml-2 cursor-pointer"
                    >
                      Deshacer Neteo
                    </button>
                  )}
                </div>
              </div>

              {/* Banner de estado de neteo activo */}
              {hasActiveSettlement && lastSettlementInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00A37A] shrink-0" />
                    <span>
                      <strong>Neteo registrado ({lastSettlementInfo.amount.toFixed(2)} € saldados):</strong> Mostrando únicamente los nuevos movimientos registrados a partir del cierre.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetSettlement}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                  >
                    Reabrir cuentas
                  </button>
                </div>
              )}

              {/* Lista de movimientos */}
              {debtContributingMovements.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#00D09C] mx-auto opacity-70" />
                  <p className="text-xs font-bold text-slate-700">¡No hay deuda viva pendiente!</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Todos los movimientos están equilibrados o han sido liquidados en el último neteo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  {debtContributingMovements.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                        item.isCarryOver ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                      }`}
                    >
                      {/* Left: Icon & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            backgroundColor: `${item.categoryColor}18`,
                            color: item.categoryColor,
                          }}
                        >
                          {item.isCarryOver ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {item.merchant}
                            </span>
                            {item.isCarryOver && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                                Arrastrado
                              </span>
                            )}
                            {item.isManual && !item.isCarryOver && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                Manual
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-slate-500">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span>{item.accountLabel}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{item.typeLabel}</span>
                            <span>•</span>
                            <span className="text-slate-400">Ticket: {item.ticketAmount.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Net Debt Impact */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm sm:text-base font-black tracking-tight block ${
                            item.beneficiary === "memberA" ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          +{item.debtImpact.toFixed(2)} €
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${
                            item.beneficiary === "memberA" ? "text-red-500" : "text-blue-500"
                          }`}
                        >
                          a favor de {item.beneficiary === "memberA" ? memberAName : memberBName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón de Neteo / Cerrar Cuentas */}
              {balanceData.debtor !== "none" && balanceData.netDebt > 0 && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
                  <div className="text-xs text-slate-600">
                    <span>Al liquidar, se registra el neteo y la deuda actual queda saldada a <strong>0.00 €</strong>.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Registrar neteo de ${balanceData.netDebt.toFixed(2)} € entre ${balanceData.debtorName} y ${balanceData.creditorName}? La deuda quedará cerrada a 0 €.`
                        )
                      ) {
                        settleDebt("direct");
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Registrar Neteo / Cerrar Cuentas</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CUENTAS BANCARIAS (OPEN BANKING PSD2 & TITULARIDAD)    */}
      {/* ============================================================ */}
      {activeTab === "cuentas" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6">
            {/* Header with Connect Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
                  <Landmark className="w-5 h-5 text-[#00A37A]" />
                  <span>Cuentas Bancarias & Tarjetas</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Conexión bancaria oficial PSD2 (Enable Banking). Sincronización automática de movimientos y gestión de titularidad.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    await syncBankFeed();
                    showToast("Sincronizando feed de movimientos bancarios...");
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Sincronizar movimientos bancarios descargados por el backend"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sincronizar ahora</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas eliminar todos los movimientos y dejar la app completamente limpia para los datos reales del banco?")) {
                      clearAllTransactions();
                      showToast("Movimientos eliminados. Listo para cargar datos reales.");
                    }
                  }}
                  className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-rose-200/60"
                  title="Vaciar movimientos para empezar desde cero con el feed bancario"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Limpiar movimientos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBankModalInitialMode("catalog");
                    setIsBankModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Conectar Banco (PSD2)</span>
                </button>
              </div>
            </div>

            {/* PSD2 Information & Status Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[#00A37A]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    Pasarela Segura PSD2 Open Banking & Worker en Segundo Plano
                  </span>
                  <span className="text-slate-500 text-[11px] leading-relaxed block">
                    Lectura oficial de solo lectura. Worker autónomo programado cada hora para volcar los movimientos de tus tarjetas a la app.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                  <span>Backend Worker: cada 1h</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Consentimiento activo (90 días)</span>
                </span>
              </div>
            </div>

            {/* Accounts Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Cuentas Registradas ({accounts.length})
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Saldo total agrupado:{" "}
                  <strong className="text-slate-900 font-extrabold">
                    {accounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((acc) => {
                  const isJoint = acc.ownership === "JOINT";
                  const isA = acc.ownership === "USER_A";
                  const isB = acc.ownership === "USER_B";
                  const isEditingThisBalance = editingBalanceAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className="p-5 rounded-3xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
                    >
                      {/* Card Top: Bank & Name & Remove */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 text-slate-700">
                              {acc.accountName.toLowerCase().includes("tarjeta") ? (
                                <CreditCard className="w-4 h-4 text-slate-600" />
                              ) : (
                                <Landmark className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-900 block truncate">
                                {acc.bankName}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600 block truncate">
                                {acc.accountName}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Desconectar la cuenta "${acc.bankName} ${acc.accountName}"?`)) {
                                removeAccount(acc.id);
                                showToast(`Cuenta ${acc.accountName} eliminada`);
                              }
                            }}
                            className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Desconectar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Balance and IBAN with Inline Quick Edit */}
                        <div className="pt-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Saldo disponible
                            </span>
                            {!isEditingThisBalance && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBalanceAccountId(acc.id);
                                  setEditingBalanceValue(acc.balance.toString());
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                                title="Editar saldo actual directamente"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Ajustar saldo</span>
                              </button>
                            )}
                          </div>

                          {isEditingThisBalance ? (
                            <div className="flex items-center gap-1.5 pt-1">
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  autoFocus
                                  value={editingBalanceValue}
                                  onChange={(e) => setEditingBalanceValue(e.target.value)}
                                  className="w-full text-base font-black text-slate-900 bg-white border-2 border-emerald-500 rounded-xl px-2.5 py-1 pr-6 focus:outline-none"
                                  placeholder="0.00"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const val = parseFloat(editingBalanceValue.replace(",", "."));
                                      if (!isNaN(val)) {
                                        updateAccountBalance(acc.id, val);
                                        showToast(`Saldo actualizado a ${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`);
                                      }
                                      setEditingBalanceAccountId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingBalanceAccountId(null);
                                    }
                                  }}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  €
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseFloat(editingBalanceValue.replace(",", "."));
                                  if (!isNaN(val)) {
                                    updateAccountBalance(acc.id, val);
                                    showToast(`Saldo actualizado a ${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`);
                                  }
                                  setEditingBalanceAccountId(null);
                                }}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shrink-0"
                                title="Guardar saldo"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBalanceAccountId(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors shrink-0"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                              {acc.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                            </div>
                          )}

                          <span className="text-[11px] text-slate-400 font-mono block">
                            {acc.ibanMask}
                          </span>
                        </div>

                        {/* Direct Action: Cargar Extracto / Movimientos */}
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setBankModalInitialMode("statement");
                              setBankModalInitialBank(acc.bankName);
                              setIsBankModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-slate-100/90 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200/80 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title={`Cargar extracto de movimientos para ${acc.bankName}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>📥 Cargar Extracto / Movimientos</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Ownership Switcher */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Titularidad asignada:</span>
                          <span
                            className={
                              isJoint
                                ? "text-[#00A37A]"
                                : isA
                                ? "text-red-600"
                                : "text-blue-600"
                            }
                          >
                            {isJoint ? "Compartida" : isA ? memberAName : memberBName}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateAccountOwnership(acc.id, "JOINT");
                              showToast(`Titularidad de "${acc.accountName}" cambiada a Conjunta`);
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isJoint
                                ? "bg-[#00D09C] text-white shadow-xs"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                            }`}
                            title="Asignar como cuenta conjunta / compartida"
                          >
                            <Users className="w-3 h-3 shrink-0" />
                            <span className="truncate">Conjunta</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateAccountOwnership(acc.id, "USER_A");
                              showToast(`Titularidad de "${acc.accountName}" cambiada a ${memberAName}`);
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isA
                                ? "bg-red-500 text-white shadow-xs"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                            }`}
                            title={`Asignar a ${memberAName}`}
                          >
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{memberAName}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateAccountOwnership(acc.id, "USER_B");
                              showToast(`Titularidad de "${acc.accountName}" cambiada a ${memberBName}`);
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isB
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                            }`}
                            title={`Asignar a ${memberBName}`}
                          >
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{memberBName}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Consola de Diagnóstico & Sincronización en Vivo */}
          <BankSyncConsole />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 7: CONFIGURACIÓN (CON FORMULARIO DE NOMBRES)             */}
      {/* ============================================================ */}
      {activeTab === "ajustes" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-[#00A37A]" />
                <span>Configuración</span>
              </h1>
            </div>

            {/* Household & Couple Profile Linking Card */}
            <CoupleLinkingCard
              onToast={showToast}
            />

            {/* Name Customizer Form */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <UserCheck className="w-4 h-4 text-[#00A37A]" />
                <span>Nombres de la Pareja</span>
              </div>

              <form onSubmit={handleSaveNames} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Nombre Miembro A:</span>
                    <span className="text-[10px] text-red-600 font-bold">Acento Rojo</span>
                  </label>
                  <input
                    type="text"
                    value={inputNameA}
                    onChange={(e) => setInputNameA(e.target.value)}
                    placeholder="ej. Carlos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-red-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Nombre Miembro B:</span>
                    <span className="text-[10px] text-blue-600 font-bold">Acento Azul</span>
                  </label>
                  <input
                    type="text"
                    value={inputNameB}
                    onChange={(e) => setInputNameB(e.target.value)}
                    placeholder="ej. Andrea"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    ⚡ Se guardan de forma permanente y se reflejan al instante en toda la app.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/20 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Guardar Nombres
                  </button>
                </div>
              </form>
            </div>

            {/* System Info */}
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Miembros Registrados</span>
                  <span className="text-slate-500">Miembro A: {memberAName} • Miembro B: {memberBName}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
                  Configurado
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Versión del Sistema</span>
                  <span className="text-slate-500">FitDuo Protocol • Versión v{versionData.version}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-[#E6FAF4] text-[#008761] rounded-full">
                  Paso 5 (v0.5.0)
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: CATEGORÍAS & CONCEPTOS (Añadir, Eliminar y 12 meses)    */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* TAB: CATEGORÍAS & CONCEPTOS (Línea compacta, 20 colores y 3 grupos) */}
      {/* ============================================================ */}
      {activeTab === "categorias" && (() => {
        const frequentCategories = categories.filter(
          (c) => getCategoryFrequencyGroup(c.name, transactions, selectedMonth) === "frequent"
        );
        const lessFrequentCategories = categories.filter(
          (c) => getCategoryFrequencyGroup(c.name, transactions, selectedMonth) === "less_frequent"
        );
        const rareCategories = categories.filter(
          (c) => getCategoryFrequencyGroup(c.name, transactions, selectedMonth) === "rare"
        );
        const usedColorsSet = new Set(categories.map((c) => c.color.toUpperCase()));

        const renderCategoryItem = (cat: typeof categories[0], group: "frequent" | "less_frequent" | "rare") => {
          const usage = getCategoryUsageStatus(cat.name);
          const isExpanded = expandedCategory === cat.name;
          const breakdown = isExpanded ? getCategoryMonthlyBreakdown(cat.name) : [];
          const total12m = isExpanded ? breakdown.reduce((sum, m) => sum + m.amount, 0) : 0;
          const maxMonthly = isExpanded ? Math.max(...breakdown.map((m) => m.amount), 1) : 1;

          const otherUsedColors = new Set(
            categories
              .filter((c) => c.name !== cat.name)
              .map((c) => c.color.toUpperCase())
          );

          return (
            <div
              key={cat.name}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? "bg-slate-50/90 border-slate-300 shadow-sm"
                  : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              {/* Fila Principal */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5">
                {/* Cuadrito de color interactivo con desplegable para editar */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryColor(editingCategoryColor === cat.name ? null : cat.name);
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-xs transition-transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border border-black/10 group"
                    style={{ backgroundColor: cat.color }}
                    title="Pulsar para cambiar el color de esta categoría (20 colores)"
                  >
                    <Palette className="w-3.5 h-3.5 text-white/90 drop-shadow opacity-70 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {editingCategoryColor === cat.name && (
                    <ColorPickerPopover
                      palette={CATEGORY_COLOR_PALETTE}
                      usedColors={otherUsedColors}
                      currentColor={cat.color}
                      onSelect={(newCol) => handleUpdateCategoryColor(cat.name, newCol)}
                      onClose={() => setEditingCategoryColor(null)}
                    />
                  )}
                </div>

                {/* Nombre de la categoría con espacio holgado */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                  className="flex-1 min-w-0 text-left cursor-pointer group py-0.5"
                >
                  <span className="text-sm font-bold text-slate-900 group-hover:text-[#00A37A] transition-colors break-words leading-tight block">
                    {cat.name}
                  </span>
                </button>

                {/* Insignia y Acciones */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {group === "frequent" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Activa</span>
                    </span>
                  )}

                  {group === "less_frequent" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Hace 3m</span>
                    </span>
                  )}

                  {group === "rare" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="max-w-[85px] sm:max-w-none truncate">{usage.unusedText || "> 3 meses"}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.name);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={isExpanded ? "Ocultar desglose" : "Ver desglose de 12 meses"}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-[#00D09C]" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Desglose desplegable de 12 meses atrás */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-700">
                      Total 12 meses en <span className="font-bold text-slate-900">{cat.name}</span>:{" "}
                      <span className="text-[#00A37A] font-extrabold">{total12m.toFixed(2)} €</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Media mensual: <span className="font-bold text-slate-800">{(total12m / 12).toFixed(2)} €/mes</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Historial mes a mes (últimos 12 meses):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {breakdown.map((m) => {
                        const pct = maxMonthly > 0 ? Math.min(100, Math.round((m.amount / maxMonthly) * 100)) : 0;
                        return (
                          <div
                            key={m.monthKey}
                            className={`p-3 rounded-xl border transition-all ${
                              m.amount > 0
                                ? "bg-white border-slate-200 shadow-2xs"
                                : "bg-slate-50/60 border-slate-100 text-slate-400"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-bold text-slate-800 truncate">
                                {m.label}
                              </span>
                              <span
                                className={`font-black ${
                                  m.amount > 0 ? "text-slate-900" : "text-slate-400"
                                }`}
                              >
                                {m.amount.toFixed(2)} €
                              </span>
                            </div>

                            {/* Barra de progreso proporcional */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1.5">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: m.amount > 0 ? cat.color : "transparent",
                                }}
                              />
                            </div>

                            <div className="text-[10px] text-slate-400 flex items-center justify-between">
                              <span>{m.count} {m.count === 1 ? "movimiento" : "movimientos"}</span>
                              {m.amount > 0 && <span className="font-semibold text-emerald-600">Registrado</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#00A37A]" />
                    <span>Categorías y Conceptos</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Gestiona categorías, colores únicos y consulta el histórico interactivo de los últimos 12 meses.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#E6FAF4] text-[#008761] border border-[#00D09C]/30 self-start sm:self-auto shrink-0">
                  {categories.length} categorías disponibles
                </span>
              </div>

              {/* Formulario Añadir Nueva Categoría (LÍNEA COMPACTA HORIZONTAL) */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#00A37A]" />
                  <span>Añadir nueva categoría</span>
                </div>

                <form onSubmit={handleAddConcept} className="flex items-center gap-2">
                  {/* Cuadrito de color con desplegable de 20 colores */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAddColorPicker(!showAddColorPicker)}
                      className="w-10 h-10 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
                      style={{ backgroundColor: newConceptColor }}
                      title="Pulsar para elegir color (20 colores disponibles, nunca repetidos)"
                    >
                      <Palette className="w-4 h-4 text-white drop-shadow-md" />
                    </button>

                    {showAddColorPicker && (
                      <ColorPickerPopover
                        palette={CATEGORY_COLOR_PALETTE}
                        usedColors={usedColorsSet}
                        currentColor={newConceptColor}
                        onSelect={(c) => {
                          setNewConceptColor(c);
                          setShowAddColorPicker(false);
                        }}
                        onClose={() => setShowAddColorPicker(false)}
                      />
                    )}
                  </div>

                  {/* Campo de texto de nombre */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={newConceptName}
                      onChange={(e) => {
                        setNewConceptName(e.target.value);
                        setConceptError(null);
                      }}
                      placeholder="Nombre de la categoría..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00D09C] transition-colors"
                    />
                  </div>

                  {/* Botón + compacto a la derecha */}
                  <button
                    type="submit"
                    disabled={!newConceptName.trim()}
                    className="w-10 h-10 rounded-xl bg-[#00D09C] hover:bg-[#00B386] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-md shadow-[#00D09C]/20 transition-all cursor-pointer"
                    title="Añadir categoría"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </form>

                {conceptError && (
                  <div className="text-xs text-red-600 font-semibold flex items-center gap-1 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{conceptError}</span>
                  </div>
                )}
              </div>

              {/* LISTADO ORGANIZADO EN 3 CUADROS POR FRECUENCIA */}
              <div className="space-y-4 pt-1">
                {/* 1. CUADRO: FRECUENTES (Mes actual y anterior) */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-sm font-extrabold text-slate-900">Frecuentes</h2>
                      <span className="text-[11px] text-slate-500 font-medium">
                        (usadas este mes y el anterior)
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {frequentCategories.length}
                    </span>
                  </div>

                  {frequentCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2.5 text-center italic">
                      No hay categorías usadas este mes ni el anterior
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {frequentCategories.map((cat) => renderCategoryItem(cat, "frequent"))}
                    </div>
                  )}
                </div>

                {/* 2. CUADRO: UTILIZADAS MENOS FRECUENTEMENTE (Últimos 3 meses) */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h2 className="text-sm font-extrabold text-slate-900">Utilizadas menos frecuentemente</h2>
                      <span className="text-[11px] text-slate-500 font-medium">
                        (usadas en los últimos 3 meses)
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {lessFrequentCategories.length}
                    </span>
                  </div>

                  {lessFrequentCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2.5 text-center italic">
                      No hay categorías en este rango
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lessFrequentCategories.map((cat) => renderCategoryItem(cat, "less_frequent"))}
                    </div>
                  )}
                </div>

                {/* 3. CUADRO: RARA VEZ UTILIZADAS (> 3 meses) */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <h2 className="text-sm font-extrabold text-slate-900">Rara vez utilizadas</h2>
                      <span className="text-[11px] text-slate-500 font-medium">
                        (no usadas en más de 3 meses)
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {rareCategories.length}
                    </span>
                  </div>

                  {rareCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2.5 text-center italic">
                      No hay categorías en este grupo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rareCategories.map((cat) => renderCategoryItem(cat, "rare"))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Añadir / Editar / Eliminar Gasto */}
      <AddManualExpenseModal
        isOpen={isManualModalOpen || !!editingTransaction}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={showToast}
        transactionToEdit={editingTransaction}
      />

      {/* Modal / Banner de Autorización Bancaria Recibida */}
      {bankAuthCodeReceived && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C2438] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Bankinter Conectado</h3>
                <p className="text-xs text-slate-400">Autorización PSD2 completada con éxito</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Tu entidad bancaria ha verificado tu identidad. Tu código de autorización bancaria recibido es:
            </p>

            <div className="bg-[#0B0E14] border border-slate-700/60 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-emerald-300 break-all select-all">
              <span className="truncate mr-2">{bankAuthCodeReceived}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(bankAuthCodeReceived);
                  setBankAuthCodeCopied(true);
                  setTimeout(() => setBankAuthCodeCopied(false), 2000);
                }}
                className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                {bankAuthCodeCopied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setBankAuthCodeReceived(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conexión Bancaria PSD2 Oficial (Enable Banking) */}
      <ConnectBankModal
        isOpen={isBankModalOpen}
        onClose={() => {
          setIsBankModalOpen(false);
          setBankCallbackReqId(null);
        }}
        initialRequisitionId={bankCallbackReqId}
        initialMode={bankModalInitialMode}
        initialBankName={bankModalInitialBank}
        onAccountsConnected={(newAccs) => {
          addConnectedAccounts(newAccs);
          showToast(`¡${newAccs.length} cuenta(s) vinculada(s) con éxito!`);
        }}
      />
    </div>
  );
}
