"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { Transaction } from "@/context/TransactionsContext";

interface CumulativeExpenseAreaChartProps {
  transactions: Transaction[];
  selectedMonth: string; // "YYYY-MM"
  currencySymbol?: string;
  color?: string;
  title?: string;
  subtitle?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { dayLabel: string; date: string; dayExpense: number; cumulative: number } }>;
}

const CustomAreaTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div
      data-testid="cumulative-area-tooltip"
      className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none"
    >
      <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1 text-[11px]">
        <Calendar className="w-3.5 h-3.5 text-[#00D09C]" />
        <span>{data.date}</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-bold">
        <span className="text-slate-400">Gasto del día:</span>
        <span className="text-white">
          {data.dayExpense > 0 ? `+${data.dayExpense.toFixed(2)} €` : "0,00 €"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 font-black text-sm mt-1 pt-1 border-t border-slate-700/80">
        <span className="text-[#00D09C]">Acumulado:</span>
        <span className="text-[#00D09C]">{data.cumulative.toFixed(2)} €</span>
      </div>
    </div>
  );
};

export const CumulativeExpenseAreaChart: React.FC<CumulativeExpenseAreaChartProps> = ({
  transactions,
  selectedMonth,
  currencySymbol = "€",
  color = "#00D09C",
  title = "Evolución del Gasto Acumulado",
  subtitle = "Ritmo de gasto conjunto a lo largo del mes",
}) => {
  // Preparamos los datos acumulativos por día del mes
  const { chartData, totalCumulative, maxDay } = useMemo(() => {
    if (!selectedMonth) {
      return { chartData: [], totalCumulative: 0, maxDay: 0 };
    }

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12

    if (isNaN(year) || isNaN(month)) {
      return { chartData: [], totalCumulative: 0, maxDay: 0 };
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    // Sumar gastos por día (ignorando abonos/ingresos para la curva de gasto o restándolos si es neto)
    const dailyExpenses = new Map<number, number>();

    // Identificar el día máximo con movimientos para evitar proyectar ceros futuros vacíos si estamos a mitad de mes
    let highestDayWithTx = 1;

    for (const tx of transactions) {
      if (tx.split === "ignored" || tx.isCredit) continue;
      // tx.date suele ser "YYYY-MM-DD"
      if (!tx.date || !tx.date.startsWith(selectedMonth)) continue;

      const dayNum = parseInt(tx.date.split("-")[2], 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) continue;

      const currentDaySum = dailyExpenses.get(dayNum) || 0;
      dailyExpenses.set(dayNum, currentDaySum + tx.amount);

      if (dayNum > highestDayWithTx) {
        highestDayWithTx = dayNum;
      }
    }

    // Para visualización limpia, mostramos hasta el último día del mes o hasta el día actual
    const targetDays = daysInMonth;
    const data: Array<{
      day: number;
      dayLabel: string;
      date: string;
      dayExpense: number;
      cumulative: number;
    }> = [];

    let runningTotal = 0;
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    const monthLabel = monthNames[month - 1] || "";

    for (let d = 1; d <= targetDays; d++) {
      const dayExpense = dailyExpenses.get(d) || 0;
      runningTotal += dayExpense;
      const dayPad = String(d).padStart(2, "0");

      data.push({
        day: d,
        dayLabel: `${d} ${monthLabel}`,
        date: `${dayPad}/${String(month).padStart(2, "0")}/${year}`,
        dayExpense,
        cumulative: Math.round(runningTotal * 100) / 100,
      });
    }

    return {
      chartData: data,
      totalCumulative: Math.round(runningTotal * 100) / 100,
      maxDay: highestDayWithTx,
    };
  }, [transactions, selectedMonth]);

  const hasData = chartData.length > 0 && totalCumulative > 0;

  return (
    <section
      data-testid="cumulative-expense-area-chart"
      className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C]" />
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#008761]">
            <TrendingUp className="w-3.5 h-3.5 text-[#00A37A]" />
            <span>Total: {totalCumulative.toFixed(2)} {currencySymbol}</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-60 sm:h-64 w-full my-3">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCumulativeExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                interval="preserveStartEnd"
                tickFormatter={(val) => `${val}`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(val) => `${val}€`}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCumulativeExpense)"
                dot={false}
                activeDot={{ r: 5, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">
              No hay gastos acumulados para este mes
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Los gastos compartidos aparecerán aquí representados cronológicamente día a día.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <span>Día 1 del mes</span>
        <span className="font-semibold text-slate-700">
          Gasto medio diario: {(chartData.length > 0 ? totalCumulative / chartData.length : 0).toFixed(2)} €/día
        </span>
        <span>Fin de mes</span>
      </div>
    </section>
  );
};

export default CumulativeExpenseAreaChart;
