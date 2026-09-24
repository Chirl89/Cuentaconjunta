"use client";

import React from "react";

export interface CategoryPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: {
      name?: string;
      value?: number;
      color?: string;
      count?: number;
    };
  }>;
}

export const CategoryPieTooltip: React.FC<CategoryPieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const item = payload[0];
    const categoryName = item.payload?.name || item.name || "Categoría";
    const value = Number(item.value ?? item.payload?.value ?? 0).toFixed(2);
    const color = item.payload?.color || "#00D09C";

    return (
      <div
        data-testid="category-pie-tooltip"
        className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xl shadow-slate-900/10 flex items-center gap-3 z-50 pointer-events-none"
      >
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white"
          style={{ backgroundColor: color }}
        />
        <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
          <span className="text-slate-800 font-extrabold">{categoryName}:</span>
          <span className="text-slate-950 font-black">{value} €</span>
        </div>
      </div>
    );
  }
  return null;
};

export default CategoryPieTooltip;
