"use client";

import React, { useState } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useNavigation } from "@/context/NavigationContext";
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
  CreditCard,
  Plus,
  Check,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Authentic Fintonic category scheme
const FINTONIC_CATEGORIES = [
  { name: "Supermercado", icon: ShoppingCart, value: 450.3, color: "#00D09C", count: 8 },
  { name: "Hogar & Luz", icon: Zap, value: 215.8, color: "#0EA5E9", count: 3 },
  { name: "Restaurantes & Ocio", icon: Utensils, value: 185.0, color: "#F59E0B", count: 5 },
  { name: "Transporte & Gasolina", icon: Fuel, value: 110.4, color: "#6366F1", count: 4 },
  { name: "Otros Gastos Comunes", icon: Receipt, value: 88.5, color: "#EC4899", count: 2 },
];

const INITIAL_TRANSACTIONS = [
  {
    id: "tx-1",
    merchant: "Mercadona Gran Vía",
    date: "Hoy, 11:42",
    amount: -64.2,
    category: "Supermercado",
    categoryColor: "#00D09C",
    icon: ShoppingCart,
    account: "BBVA Conjunta ••8491",
    status: "pending",
  },
  {
    id: "tx-2",
    merchant: "Iberdrola Clientes",
    date: "Ayer, 09:15",
    amount: -89.4,
    category: "Hogar & Luz",
    categoryColor: "#0EA5E9",
    icon: Zap,
    account: "Santander Mixta ••2104",
    status: "pending",
  },
  {
    id: "tx-3",
    merchant: "Restaurante La Tagliatella",
    date: "12 Sep, 21:30",
    amount: -54.0,
    category: "Restaurantes & Ocio",
    categoryColor: "#F59E0B",
    icon: Utensils,
    account: "Revolut A ••5932",
    status: "triaged",
    assignedTo: "Ambos (50/50)",
  },
  {
    id: "tx-4",
    merchant: "Repsol Estación de Servicio",
    date: "10 Sep, 18:20",
    amount: -45.0,
    category: "Transporte & Gasolina",
    categoryColor: "#6366F1",
    icon: Fuel,
    account: "BBVA Conjunta ••8491",
    status: "triaged",
    assignedTo: "Persona A",
  },
];

export default function HomePage() {
  const { memberAName, memberBName } = useUserNames();
  const { activeTab, setActiveTab } = useNavigation();

  // Local state for interactive triage simulation
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [lastAssignedMsg, setLastAssignedMsg] = useState<string | null>(null);

  const totalSpent = FINTONIC_CATEGORIES.reduce((sum, item) => sum + item.value, 0);

  const handleTriage = (txId: string, assigned: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, status: "triaged", assignedTo: assigned } : tx))
    );
    setLastAssignedMsg(`Movimiento asignado a "${assigned}" correctamente.`);
    setTimeout(() => setLastAssignedMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback when clicking actions */}
      {lastAssignedMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#00A37A] text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{lastAssignedMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: RESUMEN DE GASTOS (FINTONIC AUTHENTIC DASHBOARD)       */}
      {/* ============================================================ */}
      {activeTab === "resumen" && (
        <div className="space-y-6">
          {/* Fintonic FinScore & Health Header */}
          <section className="bg-gradient-to-br from-[#E6FAF4] via-white to-[#F0FDF9] border border-[#00D09C]/30 rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,208,156,0.12)] relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D09C]/15 text-[#008761] border border-[#00D09C]/30 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-[#00A37A]" />
                  <span>FinScore Compartido: 840 • Control Excelente</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Gastos de Septiembre
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
                  Total Compartido del Mes
                </span>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                  {totalSpent.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xl text-[#00A37A] ml-1 font-bold">€</span>
                </div>
                <span className="text-[11px] text-[#008761] font-semibold flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3.5 h-3.5" /> -12% vs el mes anterior
                </span>
              </div>
            </div>
          </section>

          {/* Grid: Donut Chart & Balance Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart (Fintonic clean style) */}
            <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
                    Distribución por Categorías
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    5 categorías activas sincronizadas
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                  Septiembre 2026
                </span>
              </div>

              {/* Donut Graphic */}
              <div className="relative h-64 w-full flex items-center justify-center my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={FINTONIC_CATEGORIES}
                      innerRadius={76}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {FINTONIC_CATEGORIES.map((entry) => (
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
                    Equilibrio 50/50
                  </span>
                </div>
              </div>

              {/* Categories list */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {FINTONIC_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const percent = Math.round((cat.value / totalSpent) * 100);
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
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

            {/* Right Column: Balance & Quick Triage */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              {/* Balance Card ("Quién debe a quién") */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Liquidación de Cuentas
                  </h2>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                    Pendiente
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Saldo Neto Calculado
                    </span>
                    <p className="text-sm font-extrabold text-slate-800">
                      <span className="text-rose-600">{memberBName}</span> debe a{" "}
                      <span className="text-[#008761]">{memberAName}</span>:
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-[#008761]">115,00 €</span>
                    <span className="text-[10px] block text-slate-400 font-medium">Reparto 50/50</span>
                  </div>
                </div>

                {/* Contributions Bar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      Pagado por {memberAName}
                    </span>
                    <span className="text-lg font-black text-[#008761] block">625,00 €</span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00D09C] h-full w-[61%]" />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      Pagado por {memberBName}
                    </span>
                    <span className="text-lg font-black text-rose-600 block">395,00 €</span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[39%]" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("balances")}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Ver detalle completo de saldos</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D09C]" />
                </button>
              </div>

              {/* Inbox Shortcut Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#00A37A]" />
                    <span>Inbox de Clasificación Rápida</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className="text-xs font-bold text-[#00A37A] hover:underline"
                  >
                    Ver todos →
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Hay movimientos pendientes de asignación esperando tu validación:
                </p>

                {/* Quick triage item */}
                {transactions
                  .filter((t) => t.status === "pending")
                  .slice(0, 1)
                  .map((tx) => (
                    <div key={tx.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#E6FAF4] text-[#00A37A] flex items-center justify-center text-xs">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{tx.merchant}</span>
                            <span className="text-[10px] text-slate-400">{tx.account}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          {tx.amount.toFixed(2)} €
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => handleTriage(tx.id, memberAName)}
                          className="py-1.5 px-2 rounded-xl bg-white hover:bg-[#E6FAF4] border border-slate-200 hover:border-[#00D09C]/40 text-[#008761] text-[11px] font-bold truncate transition-colors text-center shadow-2xs"
                        >
                          {memberAName}
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, memberBName)}
                          className="py-1.5 px-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 text-[11px] font-bold truncate transition-colors text-center shadow-2xs"
                        >
                          {memberBName}
                        </button>
                        <button
                          onClick={() => handleTriage(tx.id, "50/50")}
                          className="py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold truncate transition-colors text-center shadow-2xs"
                        >
                          50 / 50
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* Recent Activity Section */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00A37A]" />
                Movimientos Recientes de las Cuentas
              </h2>
              <span className="text-xs font-semibold text-slate-400">Actualizado vía PSD2</span>
            </div>

            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const Icon = tx.icon;
                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${tx.categoryColor}15`, color: tx.categoryColor }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                          {tx.merchant}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{tx.account}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm sm:text-base font-black text-slate-900 block">
                        {tx.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          tx.status === "pending"
                            ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
                            : "text-[#008761] bg-[#E6FAF4] px-2 py-0.5 rounded-full"
                        }`}
                      >
                        {tx.status === "pending" ? "Pendiente" : tx.assignedTo || "Asignado"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: INBOX DE TRIAGE (INTERACTIVO)                          */}
      {/* ============================================================ */}
      {activeTab === "inbox" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00A37A]" />
                  Bandeja de Entrada de Gastos (Inbox)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Clasifica cada movimiento con 1 solo toque asignándolo a {memberAName}, {memberBName} o Compartido (50/50).
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#E6FAF4] text-[#008761] rounded-full">
                {transactions.filter((t) => t.status === "pending").length} pendientes
              </span>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => {
                const Icon = tx.icon;
                const isPending = tx.status === "pending";
                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPending
                        ? "bg-white border-slate-200 shadow-xs"
                        : "bg-slate-50/60 border-slate-100 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${tx.categoryColor}15`, color: tx.categoryColor }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{tx.merchant}</span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
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

                        {isPending ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleTriage(tx.id, memberAName)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#E6FAF4] text-[#008761] text-xs font-bold border border-slate-200 hover:border-[#00D09C] transition-colors"
                            >
                              {memberAName}
                            </button>
                            <button
                              onClick={() => handleTriage(tx.id, memberBName)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-600 text-xs font-bold border border-slate-200 hover:border-rose-300 transition-colors"
                            >
                              {memberBName}
                            </button>
                            <button
                              onClick={() => handleTriage(tx.id, "50/50")}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                            >
                              50 / 50
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#008761] bg-[#E6FAF4] px-3 py-1 rounded-xl">
                            <Check className="w-3.5 h-3.5" /> Asignado a: {tx.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#00A37A]" />
                Balance de Gastos Compartidos
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Cálculo matemático exacto de las aportaciones y compensaciones pendientes.
              </p>
            </div>

            {/* Big summary card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#E6FAF4] to-white border border-[#00D09C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#008761]">
                  Estado de Liquidación
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  <span className="text-rose-600">{memberBName}</span> debe a{" "}
                  <span className="text-[#008761]">{memberAName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ambos miembros absorben el 50% de los gastos comunes del hogar.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-4xl font-black text-[#008761] block">115,00 €</span>
                <button
                  onClick={() => alert(`Simulación: Enlace Bizum preparado para que ${memberBName} envíe 115,00 € a ${memberAName}.`)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/25 transition-all inline-flex items-center gap-1.5"
                >
                  <span>Saldar por Bizum</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
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
                  <span className="text-center font-bold text-[#008761]">625,00 €</span>
                  <span className="text-right font-bold text-rose-600">395,00 €</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3">
                  <span className="text-slate-600">Cuota correspondiente (50%)</span>
                  <span className="text-center font-semibold text-slate-700">510,00 €</span>
                  <span className="text-right font-semibold text-slate-700">510,00 €</span>
                </div>
                <div className="px-4 py-3 bg-slate-50 font-bold text-slate-900 grid grid-cols-3">
                  <span>Diferencia Neta</span>
                  <span className="text-center text-[#008761]">+115,00 € (a favor)</span>
                  <span className="text-right text-rose-600">-115,00 € (deudor)</span>
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
                <Plus className="w-3.5 h-3.5 text-[#00D09C]" />
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
              💡 <strong>Aprendizaje por corrección:</strong> Cuando reclasifiques un gasto en el Inbox, el sistema aprenderá el patrón del comercio para asignarlo automáticamente en el futuro.
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
                  <span className="text-slate-500">FitDuo Protocol • Versión v0.2.3</span>
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
