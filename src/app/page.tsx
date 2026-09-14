"use client";

import React, { useState } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useNavigation } from "@/context/NavigationContext";
import { useTransactions, SplitType } from "@/context/TransactionsContext";
import MonthSelector from "@/components/MonthSelector";
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
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRightLeft,
  Landmark,
  PieChart as PieIcon,
  Settings as SettingsIcon,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ReceiptText,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function HomePage() {
  const { memberAName, memberBName } = useUserNames();
  const { activeTab, setActiveTab } = useNavigation();
  const {
    selectedMonth,
    classifyTransaction,
    reclassifyTransaction,
    pendingTransactions,
    classifiedTransactions,
    filteredTransactions,
    totalSpent,
    categoriesBreakdown,
    balanceData,
  } = useTransactions();

  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
    showToast(`Reclasificado como "${label}". Balance recalculado.`);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Feedback Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#00A37A] text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: RESUMEN GASTOS                                        */}
      {/* ============================================================ */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          {/* Top Fintonic FinScore Banner + Month Selector */}
          <section className="bg-gradient-to-br from-[#E6FAF4] via-white to-[#F0FDF9] border border-[#00D09C]/30 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,208,156,0.12)] relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D09C]/15 text-[#008761] border border-[#00D09C]/30 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-[#00A37A]" />
                    <span>FinScore Pareja: 840 • Control Excelente</span>
                  </div>
                  {/* Month Selector Component */}
                  <MonthSelector />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Resumen de Gastos
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Cuentas conjuntas sincronizadas de{" "}
                  <strong className="text-[#00A37A] font-bold">{memberAName}</strong> y{" "}
                  <strong className="text-rose-500 font-bold">{memberBName}</strong>
                </p>
              </div>

              {/* Fintonic Main Spend Pill */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:items-end justify-center min-w-[210px] shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Gasto Total del Mes
                </span>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                  {totalSpent.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xl text-[#00A37A] ml-1 font-bold">€</span>
                </div>
                <span className="text-[11px] text-[#008761] font-semibold flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Basado en {classifiedTransactions.length} movimientos
                </span>
              </div>
            </div>
          </section>

          {/* Grid: Dynamic Donut Chart & Balance Debt */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dynamic Donut Chart */}
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
                    Distribución por Categorías
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {categoriesBreakdown.length} categorías registradas este mes
                  </p>
                </div>
                <MonthSelector />
              </div>

              {/* Donut Graphic */}
              <div className="relative h-64 w-full flex items-center justify-center my-3">
                {categoriesBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriesBreakdown}
                          innerRadius={76}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoriesBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
                            "Gasto",
                          ]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E2E8F0",
                            borderRadius: "1rem",
                            color: "#0F172A",
                            fontSize: "12px",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Total Gastado
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {totalSpent.toFixed(0)} €
                      </span>
                      <span className="text-[11px] text-[#008761] font-bold mt-0.5">
                        Dinámico en Vivo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
                    <Clock className="w-8 h-8 text-slate-300" />
                    <span>No hay gastos clasificados en este mes todavía.</span>
                  </div>
                )}
              </div>

              {/* Categories list */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {categoriesBreakdown.map((cat) => {
                  const percent = totalSpent > 0 ? Math.round((cat.value / totalSpent) * 100) : 0;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{cat.name}</span>
                          <span className="text-[10px] text-slate-400">{cat.count} movimientos</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {cat.value.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Column: Dynamic Balance Card */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
                    Balance en Tiempo Real
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase">
                    Calculado
                  </span>
                </div>

                {/* Who owes whom */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Quién debe a quién:
                    </span>
                    {balanceData.debtor !== "none" ? (
                      <p className="text-sm font-extrabold text-slate-800">
                        <span className="text-rose-600">{balanceData.debtorName}</span> debe a{" "}
                        <span className="text-[#008761]">{balanceData.creditorName}</span>:
                      </p>
                    ) : (
                      <p className="text-sm font-extrabold text-[#008761]">
                        ¡Cuentas completamente saldadas!
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-[#008761]">
                      {balanceData.netDebt.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-[10px] block text-slate-400 font-medium">Reparto 50/50</span>
                  </div>
                </div>

                {/* Paid by A vs Paid by B */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      Aportado por {memberAName}
                    </span>
                    <span className="text-lg font-black text-[#008761] block">
                      {balanceData.paidByA.toFixed(2)} €
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      Aportado por {memberBName}
                    </span>
                    <span className="text-lg font-black text-rose-600 block">
                      {balanceData.paidByB.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("balances")}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Ver detalle y saldar cuentas</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D09C]" />
                </button>
              </div>

              {/* Pending Shortcut */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#00A37A]" />
                    <span>Sin clasificar ({pendingTransactions.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("movimientos")}
                    className="text-xs font-bold text-[#00A37A] hover:underline"
                  >
                    Ir a Movimientos →
                  </button>
                </div>

                {pendingTransactions.length > 0 ? (
                  <p className="text-xs text-slate-600">
                    Tienes {pendingTransactions.length} gastos pendientes. Al asignarlos, la deuda se recalcula en el acto.
                  </p>
                ) : (
                  <p className="text-xs text-[#008761] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> ¡Todos los gastos de este mes están clasificados!
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MOVIMIENTOS (PENDIENTES ARRIBA + HISTÓRICO RECLASIFICABLE) */}
      {/* ============================================================ */}
      {activeTab === "movimientos" && (
        <div className="space-y-6">
          {/* Header & Month Selector */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-[#00A37A]" />
                Movimientos Bancarios
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Clasifica los gastos entrantes arriba y reclasifica cualquier movimiento histórico abajo.
              </p>
            </div>
            <MonthSelector />
          </div>

          {/* SECTION 1: PENDIENTES DE CLASIFICAR */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Gastos Pendientes de Clasificar ({pendingTransactions.length})
                </h2>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                Requiere tu validación
              </span>
            </div>

            {pendingTransactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-6 h-6 text-[#00A37A] mx-auto mb-1.5" />
                <span className="font-semibold text-slate-700 block">¡Bandeja al día!</span>
                <span>No hay gastos pendientes en este mes. Revisa el histórico abajo.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{tx.merchant}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {tx.category}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {tx.date} • {tx.account}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-base font-black text-slate-900">
                        {tx.amount.toFixed(2)} €
                      </span>

                      {/* 1-Click Triage Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTriage(tx.id, "50/50", "Ambos (50/50)")}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                          title="Gasto compartido al 50%"
                        >
                          50 / 50
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, "memberA", `Solo ${memberAName}`)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#E6FAF4] text-[#008761] text-xs font-bold border border-slate-200 hover:border-[#00D09C] transition-all"
                          title={`Gasto 100% de ${memberAName}`}
                        >
                          {memberAName}
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, "memberB", `Solo ${memberBName}`)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold border border-slate-200 hover:border-rose-300 transition-all"
                          title={`Gasto 100% de ${memberBName}`}
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

          {/* SECTION 2: HISTÓRICO DE MOVIMIENTOS RECLASIFICABLE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#00A37A]" />
                  Histórico de Movimientos (Reclasificables)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Haz clic en cualquier opción para cambiar el reparto y recalcular la deuda al instante.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {classifiedTransactions.length} clasificados
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {classifiedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${tx.categoryColor}15`, color: tx.categoryColor }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{tx.merchant}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tx.category}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {tx.date} • Pagado con {tx.account}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <span className="text-base font-black text-slate-900">
                      {tx.amount.toFixed(2)} €
                    </span>

                    {/* Reclassification Pill Switcher */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px]">
                      <button
                        onClick={() => handleReclassify(tx.id, "50/50", "Ambos (50/50)")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          tx.split === "50/50"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        50/50
                      </button>
                      <button
                        onClick={() => handleReclassify(tx.id, "memberA", `Solo ${memberAName}`)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          tx.split === "memberA"
                            ? "bg-[#00D09C] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {memberAName}
                      </button>
                      <button
                        onClick={() => handleReclassify(tx.id, "memberB", `Solo ${memberBName}`)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          tx.split === "memberB"
                            ? "bg-rose-500 text-white shadow-xs"
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
      {/* TAB 3: BALANCES & DEUDA                                       */}
      {/* ============================================================ */}
      {activeTab === "balances" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#00A37A]" />
                  Cálculo Dinámico de Balances
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Los saldos se recalculan en tiempo real cada vez que asignas o reclasificas un movimiento.
                </p>
              </div>
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
                      <span className="text-rose-600">{balanceData.debtorName}</span> debe a{" "}
                      <span className="text-[#008761]">{balanceData.creditorName}</span>
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
                  {balanceData.netDebt.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
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

            {/* Math Table */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 font-bold text-slate-700 grid grid-cols-3">
                <span>Concepto</span>
                <span className="text-center">{memberAName}</span>
                <span className="text-right">{memberBName}</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-4 py-3 grid grid-cols-3">
                  <span className="text-slate-600">Total aportado a gastos comunes</span>
                  <span className="text-center font-bold text-[#008761]">
                    {balanceData.paidByA.toFixed(2)} €
                  </span>
                  <span className="text-right font-bold text-rose-600">
                    {balanceData.paidByB.toFixed(2)} €
                  </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3">
                  <span className="text-slate-600">Cuota correspondiente (50%)</span>
                  <span className="text-center font-semibold text-slate-700">
                    {(totalSpent / 2).toFixed(2)} €
                  </span>
                  <span className="text-right font-semibold text-slate-700">
                    {(totalSpent / 2).toFixed(2)} €
                  </span>
                </div>
                <div className="px-4 py-3 bg-slate-50 font-bold text-slate-900 grid grid-cols-3">
                  <span>Diferencia Neta</span>
                  <span className="text-center text-[#008761]">
                    {balanceData.paidByA >= balanceData.paidByB
                      ? `+${balanceData.netDebt.toFixed(2)} € (a favor)`
                      : `-${balanceData.netDebt.toFixed(2)} € (debe)`}
                  </span>
                  <span className="text-right text-rose-600">
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
      {/* TAB 4: CUENTAS BANCARIAS PSD2                                 */}
      {/* ============================================================ */}
      {activeTab === "cuentas" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#00A37A]" />
                  Cuentas & Conexiones Bancarias (PSD2)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Cuentas vinculadas a través de la API oficial Open Banking GoCardless.
                </p>
              </div>
              <button
                onClick={() => alert("El flujo oficial OAuth PSD2 se activará en el Paso 5.")}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <span>Conectar Banco</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">BBVA Cuenta Compartida</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6FAF4] text-[#008761]">
                    Titularidad: Conjunta
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">2.410,80 €</div>
                <span className="text-xs text-slate-400 block">IBAN: ES76 0182 •••• 8491</span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Santander Tarjeta Gastos</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Titularidad: {memberAName}
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">840,25 €</div>
                <span className="text-xs text-slate-400 block">Tarjeta: •••• 2104</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: DISTRIBUCIÓN IA & REGLAS                               */}
      {/* ============================================================ */}
      {activeTab === "distribucion" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-[#00A37A]" />
                Motor de Distribución Inteligente
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Reglas automáticas de categorización y reparto configuradas para la pareja.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#E6FAF4] border border-[#00D09C]/30 text-xs text-[#008761] leading-relaxed">
              💡 <strong>Aprendizaje continuo:</strong> Al reclasificar cualquier gasto en Movimientos, el motor IA adaptará las reglas futuras para esa categoría o comercio.
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Mercadona / Carrefour / Lidl</span>
                  <span className="text-slate-400">Categoría: Supermercado</span>
                </div>
                <span className="font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  Reparto: 50/50
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Iberdrola / Naturgy / Agua</span>
                  <span className="text-slate-400">Categoría: Hogar & Suministros</span>
                </div>
                <span className="font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  Reparto: 50/50
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CONFIGURACIÓN                                          */}
      {/* ============================================================ */}
      {activeTab === "ajustes" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-[#00A37A]" />
                Configuración del Hogar
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Información de los miembros y estado del sistema.
              </p>
            </div>

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
                  <span className="font-bold text-slate-800 block">Consentimiento Bancario PSD2</span>
                  <span className="text-slate-500">Vigente durante 89 días restantes</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-[#E6FAF4] text-[#008761] rounded-full">
                  Activo
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Estándar y Versión de la App</span>
                  <span className="text-slate-500">FitDuo Protocol • Versión v0.2.4</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-[#E6FAF4] text-[#008761] rounded-full">
                  Paso 2 Completado
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
