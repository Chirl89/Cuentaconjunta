"use client";

import React, { useState } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useNavigation } from "@/context/NavigationContext";
import {
  useTransactions,
  SplitType,
  CATEGORIES_LIST,
} from "@/context/TransactionsContext";
import MonthSelector from "@/components/MonthSelector";
import AddManualExpenseModal from "@/components/AddManualExpenseModal";
import {
  TrendingDown,
  ArrowRight,
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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function HomePage() {
  const { memberAName, memberBName, setMemberAName, setMemberBName } = useUserNames();
  const { activeTab, setActiveTab } = useNavigation();
  const {
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
  } = useTransactions();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Settings tab form state
  const [inputNameA, setInputNameA] = useState(memberAName);
  const [inputNameB, setInputNameB] = useState(memberBName);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTriage = (id: string, split: SplitType, label: string) => {
    classifyTransaction(id, split);
    showToast(`Movimiento asignado a "${label}". Balance recalculado.`);
  };

  const handleReclassify = (id: string, split: SplitType, label: string) => {
    reclassifyTransaction(id, split);
    showToast(`Reparto reclasificado a "${label}". Balance recalculado.`);
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
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00A37A]" />
                  <span>Gastos Conjuntos</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    Reparto 1/2
                  </span>
                  <MonthSelector />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between md:justify-end gap-4 min-w-[210px]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Conjunto
                  </span>
                  <span className="text-[11px] text-[#008761] font-semibold flex items-center gap-1 mt-0.5">
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
                          <span className="text-xs font-bold text-slate-900 block">{tx.merchant}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">{tx.category} • {tx.date}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                tx.payer === "memberA"
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-blue-50 text-blue-600 border-blue-200"
                              }`}
                            >
                              Pagó {tx.payer === "memberA" ? memberAName : memberBName}
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
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <User className="w-5 h-5 text-red-500" />
                  <span>Gastos de {memberAName}</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-bold">
                    Individual
                  </span>
                  <MonthSelector />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between md:justify-end gap-4 min-w-[210px]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total {memberAName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
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
                        <span className="text-xs font-bold text-slate-900 block">{tx.merchant}</span>
                        <span className="text-[10px] text-slate-400">{tx.category} • {tx.date}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 whitespace-nowrap">{tx.amount.toFixed(2)} €</span>
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
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Gastos de {memberBName}</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold">
                    Individual
                  </span>
                  <MonthSelector />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between md:justify-end gap-4 min-w-[210px]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total {memberBName}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
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
                        <span className="text-xs font-bold text-slate-900 block">{tx.merchant}</span>
                        <span className="text-[10px] text-slate-400">{tx.category} • {tx.date}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{tx.amount.toFixed(2)} €</span>
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

          {/* SECTION 1: PENDIENTES (Cuadro global ámbar sin cuadros interiores) */}
          <div className="border border-amber-300/80 bg-amber-50/40 rounded-3xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-amber-200/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Pendientes ({pendingTransactions.length})
                </h2>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full">
                Por clasificar
              </span>
            </div>

            {pendingTransactions.length === 0 ? (
              <div className="p-5 text-center text-slate-400 text-xs bg-white/70 rounded-2xl border border-dashed border-amber-200">
                <CheckCircle2 className="w-5 h-5 text-[#00A37A] mx-auto mb-1" />
                <span className="font-semibold text-slate-700 block">¡Bandeja al día!</span>
                <span>Todos los gastos están clasificados.</span>
              </div>
            ) : (
              <div className="divide-y divide-amber-200/70">
                {pendingTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">{tx.merchant}</span>

                          {/* Category Selector */}
                          <div className="relative inline-block shrink-0">
                            <select
                              value={tx.category}
                              onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                              className="appearance-none cursor-pointer text-[10px] font-bold px-2 py-0.5 pr-4 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#00D09C] focus:outline-none"
                            >
                              {CATEGORIES_LIST.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
                              ▼
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {tx.date} • {getAccountDisplay(tx)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-base font-black text-slate-900 whitespace-nowrap">
                        {tx.amount.toFixed(2)} €
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTriage(tx.id, "50/50", "1/2 (Compartido)")}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs whitespace-nowrap"
                        >
                          1/2
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, "memberA", `Solo ${memberAName}`)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 text-xs font-bold border border-slate-200 hover:border-red-300 whitespace-nowrap"
                        >
                          {memberAName}
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, "memberB", `Solo ${memberBName}`)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold border border-slate-200 hover:border-blue-300 whitespace-nowrap"
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#00A37A]" />
                <span>Histórico de Movimientos</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {classifiedTransactions.length} clasificados
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {classifiedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 px-1 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${tx.categoryColor}15`, color: tx.categoryColor }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{tx.merchant}</span>

                        <div className="relative inline-block">
                          <select
                            value={tx.category}
                            onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                            className="appearance-none cursor-pointer text-[10px] font-bold px-2 py-0.5 pr-4 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#00D09C] focus:outline-none"
                          >
                            {CATEGORIES_LIST.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
                            ▼
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {tx.date} • {getAccountDisplay(tx)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <span className="text-base font-black text-slate-900 whitespace-nowrap">
                      {tx.amount.toFixed(2)} €
                    </span>

                    {/* Reclassification Split Pill */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] shrink-0">
                      <button
                        onClick={() => handleReclassify(tx.id, "50/50", "1/2 (Compartido)")}
                        className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "50/50"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        1/2
                      </button>
                      <button
                        onClick={() => handleReclassify(tx.id, "memberA", `Solo ${memberAName}`)}
                        className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "memberA"
                            ? "bg-red-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {memberAName}
                      </button>
                      <button
                        onClick={() => handleReclassify(tx.id, "memberB", `Solo ${memberBName}`)}
                        className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                          tx.split === "memberB"
                            ? "bg-blue-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {memberBName}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

            {/* Big summary card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#E6FAF4] to-white border border-[#00D09C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#008761]">
                  Estado de Liquidación
                </span>
                {balanceData.debtor !== "none" ? (
                  <>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      <span className={balanceData.debtor === "memberA" ? "text-red-600" : "text-blue-600"}>
                        {balanceData.debtorName}
                      </span>{" "}
                      debe a{" "}
                      <span className={balanceData.debtor === "memberA" ? "text-blue-600" : "text-red-600"}>
                        {balanceData.creditorName}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Saldo exacto para equilibrar al 50% todos los gastos compartidos.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-black text-[#008761] mt-1">
                      ¡Cuentas al día y saldadas!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      No hay deudas pendientes entre vosotros este mes.
                    </p>
                  </>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-4xl font-black text-[#008761] block">
                  {balanceData.netDebt.toFixed(2)} €
                </span>
                {balanceData.debtor !== "none" && (
                  <button
                    onClick={() =>
                      alert(
                        `Bizum simulado: Enlace preparado para que ${balanceData.debtorName} envíe ${balanceData.netDebt.toFixed(2)} € a ${balanceData.creditorName}.`
                      )
                    }
                    className="mt-2 px-4 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/25 transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Saldar por Bizum</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Math Table with Round Numbers */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 font-bold text-slate-700 grid grid-cols-3">
                <span>Concepto</span>
                <span className="text-center text-red-600 font-bold">{memberAName}</span>
                <span className="text-right text-blue-600 font-bold">{memberBName}</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-4 py-3 grid grid-cols-3">
                  <span className="text-slate-600">Aportado a gastos comunes (50/50)</span>
                  <span className="text-center font-bold text-red-600">
                    {balanceData.paidByA.toFixed(2)} €
                  </span>
                  <span className="text-right font-bold text-blue-600">
                    {balanceData.paidByB.toFixed(2)} €
                  </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3">
                  <span className="text-slate-600">Cuota debida (50% de {totalJointSpent.toFixed(2)} €)</span>
                  <span className="text-center font-semibold text-slate-700">
                    {(totalJointSpent / 2).toFixed(2)} €
                  </span>
                  <span className="text-right font-semibold text-slate-700">
                    {(totalJointSpent / 2).toFixed(2)} €
                  </span>
                </div>
                <div className="px-4 py-3 bg-slate-50 font-bold text-slate-900 grid grid-cols-3">
                  <span>Diferencia Neta</span>
                  <span className="text-center text-red-600">
                    {balanceData.paidByA >= balanceData.paidByB
                      ? `+${balanceData.netDebt.toFixed(2)} € (a favor)`
                      : `-${balanceData.netDebt.toFixed(2)} € (debe)`}
                  </span>
                  <span className="text-right text-blue-600">
                    {balanceData.paidByB >= balanceData.paidByA
                      ? `+${balanceData.netDebt.toFixed(2)} € (a favor)`
                      : `-${balanceData.netDebt.toFixed(2)} € (debe)`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CUENTAS BANCARIAS (CON CUENTA PARA ANDREA)            */}
      {/* ============================================================ */}
      {activeTab === "cuentas" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#00A37A]" />
                <span>Cuentas Bancarias</span>
              </h1>
              <button
                onClick={() => alert("El conector bancario automático oficial PSD2 se configurará en el Paso 5.")}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Conectar Banco
              </button>
            </div>

            {/* List of accounts: Joint, Member A, Member B (Andrea) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const isJoint = acc.ownership === "JOINT";
                const isA = acc.ownership === "USER_A";
                const ownerLabel = isJoint
                  ? "Titularidad: Conjunta"
                  : isA
                  ? `Titularidad: ${memberAName}`
                  : `Titularidad: ${memberBName}`;

                const badgeStyle = isJoint
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isA
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-blue-50 text-blue-600 border border-blue-200";

                return (
                  <div key={acc.id} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {acc.bankName} {acc.accountName}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${badgeStyle}`}>
                      {ownerLabel}
                    </span>
                    <div className="text-2xl font-black text-slate-900">
                      {acc.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                    </div>
                    <span className="text-xs text-slate-400 block font-mono">{acc.ibanMask}</span>
                  </div>
                );
              })}
            </div>
          </div>
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
                  <span className="text-slate-500">FitDuo Protocol • Versión v0.2.8</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-[#E6FAF4] text-[#008761] rounded-full">
                  Paso 2
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
