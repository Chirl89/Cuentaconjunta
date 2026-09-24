"use client";

import React from "react";
import { TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface IncomeExpenseBarsProps {
  totalIncome: number;
  totalExpenses: number;
  incomeLabel?: string;
  expenseLabel?: string;
  title?: string;
  subtitle?: string;
  showDifferenceBadge?: boolean;
  className?: string;
}

export const IncomeExpenseBars: React.FC<IncomeExpenseBarsProps> = ({
  totalIncome,
  totalExpenses,
  incomeLabel = "Total Ingresos",
  expenseLabel = "Total Gastos",
  title = "Diferencia de Ingresos vs Gastos",
  subtitle = "Proporción sobre el importe mayor",
  showDifferenceBadge = true,
  className = "",
}) => {
  const safeIncome = Math.max(0, Number(totalIncome) || 0);
  const safeExpenses = Math.max(0, Number(totalExpenses) || 0);

  // El tamaño máximo de la barra lo determina el número mayor entre "total_gastos" y "total_ingresos"
  const maxVal = Math.max(safeIncome, safeExpenses, 0.0001);
  const incomePct = safeIncome > 0 ? (safeIncome / maxVal) * 100 : 0;
  const expensePct = safeExpenses > 0 ? (safeExpenses / maxVal) * 100 : 0;

  const netDiff = safeIncome - safeExpenses;
  const isSurplus = netDiff >= 0;
  const savingsRate = safeIncome > 0 ? Math.round((netDiff / safeIncome) * 100) : 0;

  return (
    <div
      data-testid="income-expense-bars"
      className={`bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${className}`}
    >
      {/* Header with Title and Difference Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-[#00A37A] shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>

        {showDifferenceBadge && (
          <div
            data-testid="difference-badge"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
              isSurplus
                ? "bg-emerald-50 text-[#008761] border-emerald-200 shadow-xs"
                : "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
            }`}
          >
            {isSurplus ? (
              <TrendingUp className="w-3.5 h-3.5 text-[#00A37A] shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {isSurplus ? "Diferencia: +" : "Diferencia: "}
              {netDiff.toFixed(2)} €
            </span>
            {safeIncome > 0 && isSurplus && (
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md ml-0.5">
                {savingsRate}% ahorro
              </span>
            )}
          </div>
        )}
      </div>

      {/* Two Horizontal Bars, one above the other */}
      <div className="space-y-3.5 pt-1">
        {/* Barra 1: Total Ingresos */}
        <div className="space-y-1.5">
          {/* Label only above the bar */}
          <div className="flex items-center text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>{incomeLabel}</span>
            </span>
          </div>

          <div
            className="w-full bg-slate-100 rounded-2xl h-10 sm:h-11 overflow-hidden relative border border-slate-200/60 p-1 flex items-center"
            title={`${incomeLabel}: ${safeIncome.toFixed(2)} €`}
          >
            {safeIncome > 0 ? (
              <div
                data-testid="bar-income"
                className="h-full rounded-xl bg-gradient-to-r from-[#00B887] via-[#00D09C] to-emerald-400 transition-all duration-700 ease-out flex items-center px-3.5 text-white shadow-xs min-w-[90px] max-w-full"
                style={{ width: `${Math.max(incomePct, 12)}%` }}
              >
                <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap drop-shadow-xs">
                  {safeIncome.toFixed(2)} €
                </span>
              </div>
            ) : (
              <div className="px-3.5 text-xs font-bold text-slate-400 flex items-center">
                <span>0.00 €</span>
              </div>
            )}
          </div>
        </div>

        {/* Barra 2: Total Gastos */}
        <div className="space-y-1.5">
          {/* Label only above the bar */}
          <div className="flex items-center text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              <span>{expenseLabel}</span>
            </span>
          </div>

          <div
            className="w-full bg-slate-100 rounded-2xl h-10 sm:h-11 overflow-hidden relative border border-slate-200/60 p-1 flex items-center"
            title={`${expenseLabel}: ${safeExpenses.toFixed(2)} €`}
          >
            {safeExpenses > 0 ? (
              <div
                data-testid="bar-expense"
                className="h-full rounded-xl bg-gradient-to-r from-rose-500 via-rose-400 to-red-500 transition-all duration-700 ease-out flex items-center px-3.5 text-white shadow-xs min-w-[90px] max-w-full"
                style={{ width: `${Math.max(expensePct, 12)}%` }}
              >
                <span className="text-xs sm:text-sm font-black tracking-tight whitespace-nowrap drop-shadow-xs">
                  {safeExpenses.toFixed(2)} €
                </span>
              </div>
            ) : (
              <div className="px-3.5 text-xs font-bold text-slate-400 flex items-center">
                <span>0.00 €</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini stats summary: Only Ratio Gastos/Ingresos */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-[11px] text-slate-500">
        <span className="font-medium flex items-center gap-1.5">
          <span>Ratio Gastos/Ingresos:</span>
          <strong className={`font-black ${safeExpenses > safeIncome ? "text-rose-600" : "text-[#008761]"}`}>
            {safeIncome > 0 ? Math.round((safeExpenses / safeIncome) * 100) : 0}%
          </strong>
        </span>
      </div>
    </div>
  );
};

export default IncomeExpenseBars;
