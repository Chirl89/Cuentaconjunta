import React from "react";
import { CategoryInfo, CATEGORIES_LIST } from "@/context/TransactionsContext";

export interface CategorySelectProps {
  value: string;
  onChange: (newCategory: string) => void;
  categories?: CategoryInfo[];
  className?: string;
  theme?: "emerald" | "indigo" | "red" | "blue" | "default";
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  className = "",
  theme = "default",
}) => {
  const catList = categories && categories.length > 0 ? categories : CATEGORIES_LIST;
  const isCustomOrMissing = value && !catList.some((c) => c.name.toLowerCase() === value.toLowerCase());

  const getBorderHover = () => {
    switch (theme) {
      case "indigo":
        return "hover:border-indigo-400 focus:border-indigo-500";
      case "red":
        return "hover:border-red-400 focus:border-red-500";
      case "blue":
        return "hover:border-blue-400 focus:border-blue-500";
      case "emerald":
        return "hover:border-[#00D09C] focus:border-[#00A37A]";
      case "default":
      default:
        return "hover:border-slate-400 focus:border-slate-500";
    }
  };

  return (
    <div
      className={`relative inline-block w-fit max-w-[170px] sm:max-w-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none cursor-pointer text-[10px] font-bold py-0.5 pl-2 pr-4 rounded-md border border-slate-200 bg-white text-slate-700 ${getBorderHover()} focus:outline-none leading-none w-full block truncate shadow-2xs transition-colors`}
        title="Cambiar categoría del movimiento"
        aria-label="Seleccionar categoría"
      >
        {isCustomOrMissing && (
          <option value={value}>
            {value}
          </option>
        )}
        {catList.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
        ▼
      </span>
    </div>
  );
};
