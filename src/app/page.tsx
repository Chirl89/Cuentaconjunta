"use client";

import React from "react";
import { useUserNames } from "@/context/UserNamesContext";
import {
  Wallet,
  TrendingDown,
  ArrowRightLeft,
  CheckCircle2,
  PieChart as PieIcon,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const MOCK_CATEGORIES = [
  { name: "Supermercado & Alimentación", value: 420, color: "#00D09C" },
  { name: "Hogar & Suministros", value: 280, color: "#38BDF8" },
  { name: "Restaurantes & Ocio", value: 190, color: "#F59E0B" },
  { name: "Transporte & Gasolina", value: 95, color: "#A855F7" },
  { name: "Mascotas & Salud", value: 65, color: "#FF6B6B" },
];

export default function HomePage() {
  const { memberAName, memberBName, setMemberAName, setMemberBName } = useUserNames();

  const totalSpent = MOCK_CATEGORIES.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fintech Fintonic Standard • PWA Ready</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gastos compartidos de <span className="text-emerald-400">{memberAName}</span> y{" "}
              <span className="text-rose-400">{memberBName}</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Equilibrio financiero transparente en pareja sin fricción, con detección automática de
              traspasos y nombres 100% dinámicos en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950/80 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col items-center justify-center min-w-[130px] shadow-sm">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total del Mes
              </span>
              <span className="text-xl font-bold text-emerald-400 mt-0.5">{totalSpent.toFixed(2)} €</span>
              <span className="text-[10px] text-slate-400 mt-0.5">5 categorías</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Name Customizer & Multi-window Sync Test */}
      <section className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Personalización Reactiva de Nombres (Test Multi-Ventana)</span>
          </h2>
          <span className="text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
            Sincronización en Vivo
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          Escribe abajo y observa cómo los nombres cambian al instante en todos los botones, tarjetas,
          gráficos y en cualquier otra pestaña del navegador que tengas abierta:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
              <span>Nombre Miembro A:</span>
              <span className="text-[10px] text-slate-400 font-normal">Color Identificador Verde Menta</span>
            </label>
            <input
              type="text"
              value={memberAName}
              onChange={(e) => setMemberAName(e.target.value)}
              placeholder="Persona A"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-rose-400 flex items-center justify-between">
              <span>Nombre Miembro B:</span>
              <span className="text-[10px] text-slate-400 font-normal">Color Identificador Coral</span>
            </label>
            <input
              type="text"
              value={memberBName}
              onChange={(e) => setMemberBName(e.target.value)}
              placeholder="Persona B"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Grid: Donut Chart & Balance Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart (Fintonic style) */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Desglose por Categorías (Gráfico Donut)</span>
              </h2>
              <span className="text-xs text-slate-400">Septiembre 2026</span>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Visualización con total central y colores representativos de gastos comunes.
            </p>
          </div>

          <div className="relative h-64 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_CATEGORIES}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {MOCK_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} €`, "Gasto"]}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Total in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {totalSpent} €
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
            {MOCK_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="truncate max-w-[150px]">{cat.name}</span>
                </span>
                <span className="font-semibold text-slate-200">{cat.value} €</span>
              </div>
            ))}
          </div>
        </section>

        {/* Balance Card & Triage Button Preview */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Balance card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>Estado del Balance Compartido</span>
              </h2>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                Pendiente de Ajuste
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Quién debe a quién:</span>
                <p className="text-sm font-bold text-white mt-1">
                  <span className="text-rose-400">{memberBName}</span> debe a{" "}
                  <span className="text-emerald-400">{memberAName}</span>:
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">115.00 €</span>
                <span className="text-[10px] text-slate-400 block">Cálculo 50/50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Aportado por {memberAName}:</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">625.00 €</span>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Aportado por {memberBName}:</span>
                <span className="text-base font-bold text-rose-400 mt-1 block">395.00 €</span>
              </div>
            </div>
          </div>

          {/* Quick Triage Buttons Simulation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulación de Botones de Triage de Gastos</span>
            </h3>
            <p className="text-xs text-slate-300">
              En el Inbox diario, cada gasto no asignado se cataloga con 1 toque utilizando los nombres
              reales:
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-between">
                <span>Pagado por {memberAName}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center justify-between">
                <span>Pagado por {memberBName}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              </button>
              <button className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-between">
                <span>Compartido Ambos (50 / 50)</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Step 2 Checklist */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hitos Completados del Paso 2 (FitDuo Standard v0.2.0)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Next.js 14+ App Router & TypeScript configurados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Paleta Fintech Fintonic (Navy, Menta #00D09C, Coral)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Contexto reactivo de nombres con sync multi-ventana</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Componente de versión visible leyendo version.json</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>PWA Manifest, Safe-Areas iOS dvh y Cross-Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Entorno de testeo con Vitest + React Testing Library</span>
          </div>
        </div>
      </section>
    </div>
  );
}
