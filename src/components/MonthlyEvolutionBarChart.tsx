"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Scale,
  Calendar,
  User,
  Filter,
  Inbox,
} from "lucide-react";
import { Transaction, BankAccount } from "@/context/TransactionsContext";

export interface MonthlyEvolutionBarChartProps {
  transactions: Transaction[];
  accounts?: BankAccount[];
  referenceMonth?: string; // "YYYY-MM", defaults to "2026-09"
  activeRole?: "memberA" | "memberB";
  memberAName?: string;
  memberBName?: string;
  onUserChange?: (user: "memberA" | "memberB") => void;
  isIOS?: boolean;
}

export interface MonthlyEvolutionItem {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  hasData: boolean;
  income: number | null;
  expense: number | null;
  net: number | null;
  personalExpense: number | null;
  jointExpenseHalf: number | null;
  personalIncome: number | null;
  jointIncomeHalf: number | null;
  txCount: number;
}

const MONTH_NAMES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const MONTH_NAMES_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/**
 * Checks if the current client platform is iOS (iPhone/iPad/iPod).
 */
export function checkIsIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Calculates rolling N months ending in referenceMonth.
 * E.g., for "2026-09" and count 7, returns ["2026-03", "2026-04", ..., "2026-09"].
 */
export function getRollingMonths(referenceMonth: string = "2026-09", count: number = 12): string[] {
  const [yStr, mStr] = referenceMonth.split("-");
  const baseYear = parseInt(yStr, 10) || new Date().getFullYear();
  const baseMonth = parseInt(mStr, 10) || new Date().getMonth() + 1; // 1-12

  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = baseMonth - i;
    let y = baseYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

/**
 * Calculates rolling 12 months (not calendar year) ending in referenceMonth.
 * E.g., for "2026-09", returns ["2025-10", "2025-11", ..., "2026-09"].
 */
export function getRolling12Months(referenceMonth: string = "2026-09"): string[] {
  return getRollingMonths(referenceMonth, 12);
}

export const MonthlyEvolutionBarChart: React.FC<MonthlyEvolutionBarChartProps> = ({
  transactions,
  accounts = [],
  referenceMonth = "2026-09",
  activeRole = "memberA",
  memberAName = "Carlos",
  memberBName = "Andrea",
  isIOS: propIsIOS,
}) => {
  const [viewMode, setViewMode] = useState<"all12" | "onlyData">("all12");
  const [detectedIsIOS, setDetectedIsIOS] = useState<boolean>(false);

  React.useEffect(() => {
    if (propIsIOS === undefined) {
      setDetectedIsIOS(checkIsIOS());
    }
  }, [propIsIOS]);

  const effectiveIsIOS = propIsIOS !== undefined ? propIsIOS : detectedIsIOS;
  const currentPersonName = activeRole === "memberA" ? memberAName : memberBName;

  // Pre-calculate rolling months data for active viewing person (7 months on iOS, 12 months on PC)
  const { allMonthsData, chartData, total12mIncome, total12mExpense, total12mNet, monthsWithDataCount } =
    useMemo(() => {
      const monthsCount = effectiveIsIOS ? 7 : 12;
      const rollingMonths = getRollingMonths(referenceMonth, monthsCount);

      const getAccountOwnership = (tx: Transaction): "USER_A" | "USER_B" | "JOINT" | undefined => {
        if (!accounts || accounts.length === 0) return undefined;
        const acc = accounts.find((a) => a.id === tx.accountLabel || a.accountName === tx.accountLabel);
        return acc?.ownership;
      };

      let sumIncome = 0;
      let sumExpense = 0;
      let countWithData = 0;

      const data: MonthlyEvolutionItem[] = rollingMonths.map((mKey) => {
        const [yStr, mStr] = mKey.split("-");
        const y = parseInt(yStr, 10);
        const mIdx = parseInt(mStr, 10) - 1;
        const shortLabel = MONTH_NAMES_SHORT[mIdx] || mKey;
        const fullLabel = `${MONTH_NAMES_FULL[mIdx]} ${y}`;

        // Get all movements for this month excluding internal transfers and settlements
        const monthTxs = transactions.filter(
          (t) =>
            t.monthKey === mKey &&
            t.movementType !== "transfer_to_joint" &&
            t.movementType !== "settlement"
        );

        let personalExpense = 0;
        let jointExpenseHalf = 0;
        let personalIncome = 0;
        let jointIncomeHalf = 0;
        let countedTx = 0;

        for (const tx of monthTxs) {
          const isIncome =
            tx.isCredit ||
            tx.category === "Ingreso / Nómina" ||
            tx.category === "Ingresos";

          const isExpense = !isIncome;
          const ownership = getAccountOwnership(tx);
          const amt = Math.abs(tx.amount);

          if (isExpense) {
            // Strictly exclude unclassified / pending expenses!
            // Pending transactions are waiting in inbox and NOT assigned to anyone yet!
            if (tx.status === "pending") continue;

            if (activeRole === "memberA") {
              if (tx.split === "memberA") {
                personalExpense += amt;
                countedTx++;
              } else if (tx.split === "50/50") {
                jointExpenseHalf += amt * 0.5;
                countedTx++;
              }
              // tx.split === "memberB" is Andrea's private expense - never included for Carlos!
            } else {
              // memberB
              if (tx.split === "memberB") {
                personalExpense += amt;
                countedTx++;
              } else if (tx.split === "50/50") {
                jointExpenseHalf += amt * 0.5;
                countedTx++;
              }
              // tx.split === "memberA" is Carlos's private expense - never included for Andrea!
            }
          } else {
            // Income
            if (activeRole === "memberA") {
              const isPersonalA =
                (tx.payer === "memberA" || ownership === "USER_A" || tx.split === "memberA") &&
                tx.payer !== "joint" &&
                ownership !== "JOINT" &&
                tx.split !== "memberB" &&
                tx.split !== "50/50";

              const isJoint =
                tx.payer === "joint" || ownership === "JOINT" || tx.split === "50/50";

              if (isPersonalA) {
                personalIncome += amt;
                countedTx++;
              } else if (isJoint) {
                jointIncomeHalf += amt * 0.5;
                countedTx++;
              }
            } else {
              // memberB
              const isPersonalB =
                (tx.payer === "memberB" || ownership === "USER_B" || tx.split === "memberB") &&
                tx.payer !== "joint" &&
                ownership !== "JOINT" &&
                tx.split !== "memberA" &&
                tx.split !== "50/50";

              const isJoint =
                tx.payer === "joint" || ownership === "JOINT" || tx.split === "50/50";

              if (isPersonalB) {
                personalIncome += amt;
                countedTx++;
              } else if (isJoint) {
                jointIncomeHalf += amt * 0.5;
                countedTx++;
              }
            }
          }
        }

        const totalExpense = Math.round((personalExpense + jointExpenseHalf) * 100) / 100;
        const totalIncome = Math.round((personalIncome + jointIncomeHalf) * 100) / 100;
        const hasData = countedTx > 0 && (totalIncome > 0 || totalExpense > 0);

        if (!hasData) {
          return {
            monthKey: mKey,
            shortLabel,
            fullLabel,
            hasData: false,
            income: null,
            expense: null,
            net: null,
            personalExpense: null,
            jointExpenseHalf: null,
            personalIncome: null,
            jointIncomeHalf: null,
            txCount: 0,
          };
        }

        const net = Math.round((totalIncome - totalExpense) * 100) / 100;
        sumIncome += totalIncome;
        sumExpense += totalExpense;
        countWithData += 1;

        return {
          monthKey: mKey,
          shortLabel,
          fullLabel,
          hasData: true,
          income: totalIncome,
          expense: totalExpense,
          net,
          personalExpense: Math.round(personalExpense * 100) / 100,
          jointExpenseHalf: Math.round(jointExpenseHalf * 100) / 100,
          personalIncome: Math.round(personalIncome * 100) / 100,
          jointIncomeHalf: Math.round(jointIncomeHalf * 100) / 100,
          txCount: countedTx,
        };
      });

      const filtered = viewMode === "onlyData" ? data.filter((d) => d.hasData) : data;

      return {
        allMonthsData: data,
        chartData: filtered,
        total12mIncome: Math.round(sumIncome * 100) / 100,
        total12mExpense: Math.round(sumExpense * 100) / 100,
        total12mNet: Math.round((sumIncome - sumExpense) * 100) / 100,
        monthsWithDataCount: countWithData,
      };
    }, [transactions, accounts, referenceMonth, activeRole, viewMode, effectiveIsIOS]);

  // Tooltip personalizado
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d: MonthlyEvolutionItem = payload[0].payload;
    if (!d) return null;

    if (!d.hasData || d.net === null) {
      return (
        <div
          data-testid="evolution-bar-tooltip"
          className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{d.fullLabel}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Sin movimientos registrados</p>
        </div>
      );
    }

    const isNetPos = d.net >= 0;

    return (
      <div
        data-testid="evolution-bar-tooltip"
        className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none min-w-[200px]"
      >
        <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-2 pb-1.5 border-b border-slate-800 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-[#00D09C]" />
          <span>{d.fullLabel}</span>
        </div>

        {/* Ingresos */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ingresos:
            </span>
            <span>+{(d.income || 0).toFixed(2)} €</span>
          </div>
          <div className="text-[10px] text-slate-400 pl-3 flex justify-between">
            <span>Propios: {(d.personalIncome || 0).toFixed(2)} €</span>
            <span>50% Comunes: {(d.jointIncomeHalf || 0).toFixed(2)} €</span>
          </div>
        </div>

        {/* Gastos */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-rose-400 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Gastos:
            </span>
            <span>-{(d.expense || 0).toFixed(2)} €</span>
          </div>
          <div className="text-[10px] text-slate-400 pl-3 flex justify-between">
            <span>Propios: {(d.personalExpense || 0).toFixed(2)} €</span>
            <span>50% Comunes: {(d.jointExpenseHalf || 0).toFixed(2)} €</span>
          </div>
        </div>

        {/* Balance Neto */}
        <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between font-black">
          <span className="text-slate-300">Neto del Mes:</span>
          <span className={isNetPos ? "text-emerald-400 text-sm" : "text-rose-400 text-sm"}>
            {isNetPos ? `+${d.net.toFixed(2)} €` : `${d.net.toFixed(2)} €`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="monthly-evolution-bar-chart"
      className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      {/* Header with Title, User Toggle & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{effectiveIsIOS ? "Evolución del Gasto (Últimos 7 Meses)" : "Evolución del Gasto (Últimos 12 Meses)"}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Reflejando ingresos y gastos de{" "}
                <span className="font-bold text-slate-700">{currentPersonName}</span> (gastos propios +
                50% comunes)
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Active User Badge & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active User Badge (Privacy isolation: no switching between partners' personal finances) */}
          <div
            data-testid="evolution-user-badge"
            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center gap-1.5 text-xs font-bold text-slate-700"
          >
            <User className={`w-3.5 h-3.5 ${activeRole === "memberA" ? "text-indigo-500" : "text-blue-500"}`} />
            <span>{currentPersonName}</span>
          </div>

          {/* View mode toggle: 12 meses / 7 meses vs Solo con datos */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/70 text-xs">
            <button
              type="button"
              data-testid="evolution-view-all12"
              onClick={() => setViewMode("all12")}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewMode === "all12"
                  ? "bg-white text-slate-900 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title={effectiveIsIOS ? "Mostrar ventana de 7 meses" : "Mostrar ventana móvil completa de 12 meses"}
            >
              {effectiveIsIOS ? "7 Meses" : "12 Meses"}
            </button>
            <button
              type="button"
              data-testid="evolution-view-only-data"
              onClick={() => setViewMode("onlyData")}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "onlyData"
                  ? "bg-white text-slate-900 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Ocultar meses sin movimientos registrados"
            >
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Con datos ({monthsWithDataCount})</span>
            </button>
          </div>

          {/* Legend indicators */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              Gastos
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Scale className="w-3 h-3 text-slate-500" />
              Neto
            </span>
          </div>
        </div>
      </div>

      {/* Empty State when zero months have data */}
      {monthsWithDataCount === 0 ? (
        <div
          data-testid="evolution-empty-state"
          className="text-center py-12 px-4 rounded-3xl bg-slate-50 border border-dashed border-slate-200 space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 mx-auto flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              No hay movimientos registrados para mostrar la evolución
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Conecta tu banco PSD2 o añade gastos para comenzar a visualizar los gráficos de evolución
              de ingresos y gastos mensuales.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="w-full overflow-x-auto">
            <div className={`${effectiveIsIOS ? "w-full min-w-0" : "min-w-[620px] sm:min-w-full"} h-64 pt-2`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: effectiveIsIOS ? -20 : -15, bottom: 25 }}
                  barGap={effectiveIsIOS ? 1 : 2}
                  barCategoryGap={effectiveIsIOS ? "12%" : "18%"}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="monthKey"
                    interval={0}
                    tick={({ x, y, payload }: any) => {
                      const d = chartData.find((item) => item.monthKey === payload.value);
                      if (!d) return <g />;
                      const hasData = d.hasData && d.net !== null;
                      const isPos = hasData && d.net! >= 0;

                      return (
                        <g transform={`translate(${x},${y})`}>
                          {/* Month label */}
                          <text
                            x={0}
                            y={10}
                            textAnchor="middle"
                            fill={hasData ? "#475569" : "#94a3b8"}
                            fontSize={11}
                            fontWeight={hasData ? 700 : 500}
                          >
                            {d.shortLabel}
                          </text>
                          {/* Net label below: only if has real data, otherwise subtle dash */}
                          <text
                            x={0}
                            y={24}
                            textAnchor="middle"
                            fill={!hasData ? "#cbd5e1" : isPos ? "#059669" : "#e11d48"}
                            fontSize={9.5}
                            fontWeight={hasData ? 800 : 500}
                          >
                            {!hasData ? "—" : isPos ? `+${Math.round(d.net!)}€` : `${Math.round(d.net!)}€`}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(val) => `${val}€`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="income"
                    name="Ingresos"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={effectiveIsIOS ? 18 : 22}
                  />
                  <Bar
                    dataKey="expense"
                    name="Gastos"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={effectiveIsIOS ? 18 : 22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid of months with Net breakdown below */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Resumen Neto Mes a Mes ({currentPersonName})
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Balance acumulado ({monthsWithDataCount}{" "}
                {monthsWithDataCount === 1 ? "mes" : "meses"} con datos):{" "}
                <span
                  className={`font-black ${
                    total12mNet >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {total12mNet >= 0 ? `+${total12mNet.toFixed(2)} €` : `${total12mNet.toFixed(2)} €`}
                </span>
              </span>
            </div>

            <div className={`grid ${effectiveIsIOS ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12"} gap-1.5`}>
              {chartData.map((d) => {
                const hasData = d.hasData && d.net !== null;
                const isPos = hasData && d.net! >= 0;
                const isCurrent = d.monthKey === referenceMonth;

                if (!hasData) {
                  return (
                    <div
                      key={d.monthKey}
                      data-testid={`evolution-card-${d.monthKey}`}
                      className="p-2 rounded-2xl flex flex-col items-center justify-between text-center bg-slate-50/60 border border-dashed border-slate-200/80 opacity-60"
                      title={`${d.fullLabel}: Sin movimientos registrados`}
                    >
                      <span className="text-[11px] font-medium text-slate-400 mb-1">{d.shortLabel}</span>
                      <span className="text-[9px] text-slate-400 font-medium my-0.5">Sin datos</span>
                      <div className="w-full py-0.5 px-1 rounded-md text-[10px] font-bold text-slate-400 bg-slate-100">
                        —
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={d.monthKey}
                    data-testid={`evolution-card-${d.monthKey}`}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-between transition-all text-center ${
                      isCurrent
                        ? "bg-indigo-50/80 border border-indigo-200 shadow-xs ring-1 ring-indigo-200"
                        : "bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[11px] font-bold text-slate-700">{d.shortLabel}</span>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" title="Mes en curso" />
                      )}
                    </div>
                    <div className="w-full flex items-center justify-between text-[9px] text-slate-400 px-0.5 mb-1">
                      <span className="text-emerald-600 font-semibold">+{Math.round(d.income!)}</span>
                      <span className="text-rose-600 font-semibold">-{Math.round(d.expense!)}</span>
                    </div>
                    <div
                      className={`w-full py-0.5 px-1 rounded-md text-[10px] font-extrabold truncate ${
                        isPos
                          ? "bg-emerald-100/70 text-emerald-800"
                          : "bg-rose-100/70 text-rose-800"
                      }`}
                      title={`Neto: ${isPos ? `+${d.net!.toFixed(2)} €` : `${d.net!.toFixed(2)} €`}`}
                    >
                      {isPos ? `+${Math.round(d.net!)}€` : `${Math.round(d.net!)}€`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyEvolutionBarChart;
