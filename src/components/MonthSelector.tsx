"use client";

import React from "react";
import { useTransactions, AVAILABLE_MONTHS } from "@/context/TransactionsContext";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export const MonthSelector: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { selectedMonth, setSelectedMonth } = useTransactions();

  const currentIndex = AVAILABLE_MONTHS.findIndex((m) => m.key === selectedMonth);
  const currentLabel = AVAILABLE_MONTHS[currentIndex]?.label || selectedMonth;

  const handlePrev = () => {
    if (currentIndex < AVAILABLE_MONTHS.length - 1) {
      setSelectedMonth(AVAILABLE_MONTHS[currentIndex + 1].key);
    }
  };

  const handleNext = () => {
    if (currentIndex > 0) {
      setSelectedMonth(AVAILABLE_MONTHS[currentIndex - 1].key);
    }
  };

  return (
    <div className={`flex items-center gap-1 bg-white border border-slate-200/80 rounded-2xl p-1 shadow-2xs shrink-0 ${className}`}>
      <button
        onClick={handlePrev}
        disabled={currentIndex >= AVAILABLE_MONTHS.length - 1}
        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
        title="Mes anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-slate-800 select-none whitespace-nowrap">
        <Calendar className="w-3 h-3 text-[#00A37A] shrink-0" />
        <span className="whitespace-nowrap">{currentLabel}</span>
      </div>

      <button
        onClick={handleNext}
        disabled={currentIndex <= 0}
        className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
        title="Mes siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default MonthSelector;
