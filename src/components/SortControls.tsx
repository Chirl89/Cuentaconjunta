import React from "react";
import { Calendar, ArrowUpDown, Tag } from "lucide-react";
import { SortCriterion, SortDirection } from "@/lib/sorting";

export interface SortControlsProps {
  criterion: SortCriterion;
  direction: SortDirection;
  onSortClick: (criterion: SortCriterion) => void;
  className?: string;
  theme?: "emerald" | "indigo" | "red" | "blue";
  size?: "sm" | "md";
}

export const SortControls: React.FC<SortControlsProps> = ({
  criterion,
  direction,
  onSortClick,
  className = "",
  theme = "emerald",
  size = "md",
}) => {
  const getThemeClasses = () => {
    switch (theme) {
      case "indigo":
        return {
          active: "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200 shadow-xs",
          icon: "text-indigo-600",
          arrow: "text-indigo-700",
        };
      case "red":
        return {
          active: "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200 shadow-xs",
          icon: "text-red-600",
          arrow: "text-red-700",
        };
      case "blue":
        return {
          active: "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200 shadow-xs",
          icon: "text-blue-600",
          arrow: "text-blue-700",
        };
      case "emerald":
      default:
        return {
          active: "bg-[#00D09C]/10 text-[#008761] border-[#00D09C] shadow-xs ring-1 ring-[#00D09C]/20",
          icon: "text-[#00A37A]",
          arrow: "text-[#008761]",
        };
    }
  };

  const currentTheme = getThemeClasses();
  const btnPadding = size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="text-[11px] font-bold text-slate-400 mr-0.5 hidden sm:inline">
        Ordenar:
      </span>

      {/* 1. Fecha */}
      <button
        type="button"
        onClick={() => onSortClick("fecha")}
        className={`${btnPadding} rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
          criterion === "fecha"
            ? currentTheme.active
            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
        }`}
        title={
          criterion === "fecha"
            ? direction === "desc"
              ? "Orden: Más nuevo a más viejo (Pulsar para más viejo primero)"
              : "Orden: Más viejo a más nuevo (Pulsar para más nuevo primero)"
            : "Ordenar por fecha"
        }
      >
        <Calendar className={`${iconSize} ${currentTheme.icon}`} />
        <span>Fecha</span>
        {criterion === "fecha" && (
          <span className={`text-[11px] font-black ${currentTheme.arrow} ml-0.5`}>
            {direction === "desc" ? "↓" : "↑"}
          </span>
        )}
      </button>

      {/* 2. Importe */}
      <button
        type="button"
        onClick={() => onSortClick("importe")}
        className={`${btnPadding} rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
          criterion === "importe"
            ? currentTheme.active
            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
        }`}
        title={
          criterion === "importe"
            ? direction === "desc"
              ? "Orden: Mayor a menor importe (Pulsar para menor a mayor)"
              : "Orden: Menor a mayor importe (Pulsar para mayor a menor)"
            : "Ordenar por importe"
        }
      >
        <ArrowUpDown className={`${iconSize} ${currentTheme.icon}`} />
        <span>Importe</span>
        {criterion === "importe" && (
          <span className={`text-[11px] font-black ${currentTheme.arrow} ml-0.5`}>
            {direction === "desc" ? "↓" : "↑"}
          </span>
        )}
      </button>

      {/* 3. Categoría */}
      <button
        type="button"
        onClick={() => onSortClick("categoria")}
        className={`${btnPadding} rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
          criterion === "categoria"
            ? currentTheme.active
            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
        }`}
        title={
          criterion === "categoria"
            ? direction === "asc"
              ? "Orden: Categoría de la A a la Z (Pulsar para Z a A)"
              : "Orden: Categoría de la Z a la A (Pulsar para A a Z)"
            : "Ordenar por categoría"
        }
      >
        <Tag className={`${iconSize} ${currentTheme.icon}`} />
        <span>Categoría</span>
        {criterion === "categoria" && (
          <span className={`text-[10px] font-black ${currentTheme.arrow} ml-0.5`}>
            {direction === "asc" ? "A→Z" : "Z→A"}
          </span>
        )}
      </button>
    </div>
  );
};
