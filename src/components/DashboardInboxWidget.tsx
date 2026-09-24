"use client";

import React, { useState } from "react";
import {
  Inbox,
  CheckCircle2,
  Sparkles,
  Ban,
  ArrowRight,
  ChevronDown,
  ArrowDownLeft,
  ShoppingCart,
  ReceiptText,
} from "lucide-react";
import { Transaction, SplitType, Category } from "@/context/TransactionsContext";

export interface DashboardInboxWidgetProps {
  pendingTransactions: Transaction[];
  memberAName: string;
  memberBName: string;
  categories: Category[];
  onTriage: (txId: string, split: SplitType, label: string) => void;
  onCategoryChange: (txId: string, category: string) => void;
  getAccountDisplay: (tx: Transaction) => string;
  onViewAllMovements?: () => void;
  maxDisplay?: number;
}

export const DashboardInboxWidget: React.FC<DashboardInboxWidgetProps> = ({
  pendingTransactions,
  memberAName,
  memberBName,
  categories,
  onTriage,
  onCategoryChange,
  getAccountDisplay,
  onViewAllMovements,
  maxDisplay = 5,
}) => {
  const pendingCount = pendingTransactions.length;
  const displayedTxs = pendingTransactions.slice(0, maxDisplay);

  if (pendingCount === 0) {
    return (
      <section
        data-testid="dashboard-inbox-empty"
        className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A37A] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Inbox al Día</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                0 pendientes
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Todos los movimientos bancarios y manuales están clasificados y asignados.
            </p>
          </div>
        </div>

        {onViewAllMovements && (
          <button
            type="button"
            onClick={onViewAllMovements}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors shrink-0"
          >
            <span>Ver historial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      data-testid="dashboard-inbox-widget"
      className="bg-white border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 relative overflow-hidden animate-in fade-in"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/80 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <Inbox className="w-5 h-5 text-amber-700 animate-bounce" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Inbox de Triage Rápido</span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Asigna en 1 clic si el gasto es común o individual para actualizar balances
            </p>
          </div>
        </div>

        {onViewAllMovements && pendingCount > maxDisplay && (
          <button
            type="button"
            onClick={onViewAllMovements}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 self-start sm:self-center transition-colors cursor-pointer"
          >
            <span>Ver los {pendingCount} movimientos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* List of Pending Transactions with Reactive Disappearance */}
      <div className="divide-y divide-amber-100">
        {displayedTxs.map((tx) => (
          <div
            key={tx.id}
            data-testid={`inbox-item-${tx.id}`}
            className="py-3 px-1 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-amber-50/50 rounded-2xl transition-all"
          >
            {/* Left info: Icon, concept, account, date, category select */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                  tx.isCredit
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-slate-100 text-slate-700"
                }`}
                style={
                  tx.isCredit
                    ? undefined
                    : { backgroundColor: `${tx.categoryColor}25`, color: tx.categoryColor }
                }
              >
                {tx.isCredit ? (
                  <ArrowDownLeft className="w-4 h-4" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-tight">
                    {tx.merchant}
                  </span>
                  {tx.isManual && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                      Manual
                    </span>
                  )}
                  {tx.isCredit && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      💰 Ingreso
                    </span>
                  )}
                </div>

                {/* Subtitle: Account + Date + Suggested Category Selector */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                  <span>{tx.date} • {getAccountDisplay(tx)}</span>
                  <span>•</span>
                  {/* Category select with IA indicator */}
                  <div className="relative inline-block">
                    <select
                      value={tx.category}
                      onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                      className="appearance-none cursor-pointer text-[10px] font-bold py-0.5 pl-2 pr-4 rounded-md border border-amber-300 bg-white text-slate-700 hover:border-amber-500 focus:outline-none leading-none"
                    >
                      {categories.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">
                      ▼
                    </span>
                  </div>
                  {tx.autoAssignedReason && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{tx.autoAssignedReason}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Amount and 1-Touch Triage Buttons with Real Names */}
            <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 shrink-0 self-stretch md:self-center">
              <span
                className={`text-sm sm:text-base font-black whitespace-nowrap text-right shrink-0 ${
                  tx.isCredit ? "text-emerald-600 font-extrabold" : "text-slate-900"
                }`}
              >
                {tx.isCredit ? `+${tx.amount.toFixed(2)} €` : `${tx.amount.toFixed(2)} €`}
              </span>

              {/* Triage Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* 50/50 Button */}
                <button
                  type="button"
                  data-testid={`triage-joint-${tx.id}`}
                  onClick={() =>
                    onTriage(
                      tx.id,
                      "50/50",
                      tx.isCredit ? "Abono 50/50 (Compartido)" : "1/2 (Compartido)"
                    )
                  }
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Marcar como gasto común al 50/50"
                >
                  <span>50/50</span>
                </button>

                {/* Member A Button */}
                <button
                  type="button"
                  data-testid={`triage-memberA-${tx.id}`}
                  onClick={() =>
                    onTriage(
                      tx.id,
                      "memberA",
                      tx.isCredit ? `Ingreso de ${memberAName}` : `Solo ${memberAName}`
                    )
                  }
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-300 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title={`Asignar exclusivamente a ${memberAName}`}
                >
                  <span>{memberAName}</span>
                </button>

                {/* Member B Button */}
                <button
                  type="button"
                  data-testid={`triage-memberB-${tx.id}`}
                  onClick={() =>
                    onTriage(
                      tx.id,
                      "memberB",
                      tx.isCredit ? `Ingreso de ${memberBName}` : `Solo ${memberBName}`
                    )
                  }
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-300 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title={`Asignar exclusivamente a ${memberBName}`}
                >
                  <span>{memberBName}</span>
                </button>

                {/* No contabilizar Button */}
                <button
                  type="button"
                  data-testid={`triage-ignore-${tx.id}`}
                  onClick={() =>
                    onTriage(
                      tx.id,
                      "ignored",
                      "No contabilizar (N/A)"
                    )
                  }
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all cursor-pointer shrink-0"
                  title="No contabilizar (excluir de balance y gastos)"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DashboardInboxWidget;
