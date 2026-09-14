"use client";

import React, { useState } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import {
  TrendingDown,
  ArrowRight,
  ShoppingCart,
  Zap,
  Utensils,
  Fuel,
  Receipt,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Fintonic official category color scheme
const FINTONIC_CATEGORIES = [
  { name: "Supermercado", icon: ShoppingCart, value: 450.3, color: "#00D09C", count: 8 },
  { name: "Hogar & Luz", icon: Zap, value: 215.8, color: "#38BDF8", count: 3 },
  { name: "Restaurantes & Ocio", icon: Utensils, value: 185.0, color: "#F59E0B", count: 5 },
  { name: "Transporte & Combustible", icon: Fuel, value: 110.4, color: "#818CF8", count: 4 },
  { name: "Otros Gastos Comunes", icon: Receipt, value: 88.5, color: "#EC4899", count: 2 },
];

const RECENT_TRANSACTIONS = [
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
    categoryColor: "#38BDF8",
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
  },
];

export default function HomePage() {
  const { memberAName, memberBName } = useUserNames();
  const [activeFilter, setActiveFilter] = useState<"all" | "pending">("all");

  const totalSpent = FINTONIC_CATEGORIES.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Top Fintonic FinScore & Health Header */}
      <section className="bg-gradient-to-br from-slate-900 via-[#131E33] to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00D09C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/25 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#00D09C]" />
              <span>FinScore Pareja: 820 • Excelente Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gastos de Septiembre
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Economía compartida de{" "}
              <strong className="text-[#00D09C] font-semibold">{memberAName}</strong> y{" "}
              <strong className="text-rose-400 font-semibold">{memberBName}</strong>
            </p>
          </div>

          {/* Large Fintonic Spent Metric */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:items-end justify-center min-w-[200px] shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Compartido del Mes
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
              {totalSpent.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xl text-[#00D09C] ml-1 font-bold">€</span>
            </div>
            <span className="text-[11px] text-[#00D09C] flex items-center gap-1 mt-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" /> -12% vs el mes pasado
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid: Fintonic Donut Chart & Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fintonic Donut Chart */}
        <section className="lg:col-span-7 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
                Distribución por Categorías
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                5 categorías activas sincronizadas
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
              Septiembre 2026
            </span>
          </div>

          {/* Donut Graphic with Large Total in Center */}
          <div className="relative h-64 w-full flex items-center justify-center my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={FINTONIC_CATEGORIES}
                  innerRadius={76}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
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
                    backgroundColor: "#0B1120",
                    borderColor: "#334155",
                    borderRadius: "1rem",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Total in Center (Authentic Fintonic layout) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Gasto Total
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {totalSpent.toFixed(0)} €
              </span>
              <span className="text-[10px] text-[#00D09C] font-semibold mt-0.5">
                Equilibrio 50/50
              </span>
            </div>
          </div>

          {/* Categories Grid List */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            {FINTONIC_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const percent = Math.round((cat.value / totalSpent) * 100);
              return (
                <div
                  key={cat.name}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">{cat.name}</span>
                      <span className="text-[10px] text-slate-400">{cat.count} movimientos</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">
                      {cat.value.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Balance Status & Quick Triage Box */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Balance Status ("Quién debe a quién") */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Liquidación de Cuentas
              </h2>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full uppercase">
                Pendiente
              </span>
            </div>

            {/* Couple Debt Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Saldo Neto Calculado
                </span>
                <p className="text-sm font-bold text-white">
                  <span className="text-rose-400">{memberBName}</span> debe a{" "}
                  <span className="text-[#00D09C]">{memberAName}</span>:
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-[#00D09C]">115,00 €</span>
                <span className="text-[10px] block text-slate-400">Reparto equitativo</span>
              </div>
            </div>

            {/* Contribution Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 block truncate">Pagado por {memberAName}</span>
                <span className="text-lg font-black text-[#00D09C] block">625,00 €</span>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-[#00D09C] h-full w-[61%]" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-[11px] text-slate-400 block truncate">Pagado por {memberBName}</span>
                <span className="text-lg font-black text-rose-400 block">395,00 €</span>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full w-[39%]" />
                </div>
              </div>
            </div>

            <button className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2">
              <span>Saldar cuentas vía Bizum o Transferencia</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#00D09C]" />
            </button>
          </div>

          {/* Quick Triage Preview (Read-only dynamic buttons) */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00D09C]" />
                <span>Inbox de Clasificación Inmediata</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20">
                2 pendientes
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Asignación con un toque con los nombres de la pareja para computar los saldos:
            </p>

            <div className="space-y-2 pt-1">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#00D09C]/20 text-[#00D09C] flex items-center justify-center text-xs">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Mercadona Gran Vía</span>
                      <span className="text-[10px] text-slate-400">Hoy • Tarjeta BBVA</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">-64,20 €</span>
                </div>

                {/* Triage buttons labeled with read-only member names */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button className="py-1.5 px-2 rounded-lg bg-[#00D09C]/10 hover:bg-[#00D09C]/20 border border-[#00D09C]/30 text-[#00D09C] text-[11px] font-semibold truncate transition-colors text-center">
                    {memberAName}
                  </button>
                  <button className="py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold truncate transition-colors text-center">
                    {memberBName}
                  </button>
                  <button className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-[11px] font-semibold truncate transition-colors text-center">
                    50 / 50
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Movements List (Fintonic transaction feed style) */}
      <section className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#00D09C]" />
            Movimientos Recientes
          </h2>
          <span className="text-xs text-slate-400">Actualizado vía PSD2</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {RECENT_TRANSACTIONS.map((tx) => {
            const Icon = tx.icon;
            return (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-white block">
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
                  <span className="text-sm sm:text-base font-bold text-white block">
                    {tx.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-[10px] font-medium text-[#00D09C]">
                    {tx.status === "pending" ? "Pendiente asignación" : "Asignado 50/50"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
