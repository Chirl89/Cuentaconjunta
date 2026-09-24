"use client";

import React, { useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  ArrowRight,
  HandCoins,
} from "lucide-react";

export interface LiveBalanceCardProps {
  balanceData: {
    paidByA: number;
    paidByB: number;
    debtor: "memberA" | "memberB" | "none";
    debtorName: string;
    creditorName: string;
    netDebt: number;
    netDebtToJoint?: number;
  };
  memberAName: string;
  memberBName: string;
  hasActiveSettlement: boolean;
  lastSettlementInfo?: {
    amount: number;
    debtorName: string;
    creditorName: string;
    date: string;
    method?: string;
  } | null;
  onSettleDebt: (method?: "direct" | "joint") => void;
  onResetSettlement: () => void;
  onOpenManualModal?: () => void;
}

export const LiveBalanceCard: React.FC<LiveBalanceCardProps> = ({
  balanceData,
  memberAName,
  memberBName,
  hasActiveSettlement,
  lastSettlementInfo,
  onSettleDebt,
  onResetSettlement,
  onOpenManualModal,
}) => {
  const [showConfirmSettle, setShowConfirmSettle] = useState(false);

  const { paidByA, paidByB, debtor, debtorName, creditorName, netDebt } = balanceData;

  const handleConfirmSettle = () => {
    onSettleDebt("direct");
    setShowConfirmSettle(false);
  };

  const isBalanced = debtor === "none" || netDebt < 0.01;

  return (
    <section
      data-testid="live-balance-card"
      className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#00D09C]/10 to-transparent pointer-events-none rounded-full blur-2xl -mr-16 -mt-16" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A37A] shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Balance Neto en Vivo</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                50/50
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Estado de cuentas compartidas entre {memberAName} y {memberBName}
            </p>
          </div>
        </div>

        {/* Quick Action: Gasto Manual */}
        {onOpenManualModal && (
          <button
            type="button"
            onClick={onOpenManualModal}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            title="Añadir gasto en efectivo o manual"
          >
            <Plus className="w-3.5 h-3.5 text-[#00D09C]" />
            <span>+ Gasto Manual / Ajuste</span>
          </button>
        )}
      </div>

      {/* Main Status Display */}
      <div className="my-5">
        {hasActiveSettlement ? (
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00D09C] flex items-center justify-center text-white shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  ¡Cuentas Saldadas!
                </span>
                <span className="text-[11px] text-emerald-700">
                  {lastSettlementInfo
                    ? `${lastSettlementInfo.debtorName} saldó ${lastSettlementInfo.amount.toFixed(2)} € a ${lastSettlementInfo.creditorName} (${lastSettlementInfo.date})`
                    : "La liquidación está registrada correctamente."}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onResetSettlement}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer self-end sm:self-center shrink-0"
              title="Deshacer liquidación para recalcular"
            >
              Reabrir cuentas
            </button>
          </div>
        ) : isBalanced ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#00A37A]" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  ¡Cuentas al Día!
                </span>
                <span className="text-[11px] text-slate-500">
                  Ambos han aportado exactamente lo mismo al fondo común (diferencia 0,00 €).
                </span>
              </div>
            </div>
            <span className="text-lg font-black text-[#00A37A] shrink-0">0,00 €</span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#00D09C]/20 border border-[#00D09C]/40 flex items-center justify-center text-[#00D09C] shrink-0 mt-0.5">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Compensación Pendiente</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                  <span className={debtor === "memberA" ? "text-red-400" : "text-blue-400"}>
                    {debtorName}
                  </span>
                  <span className="text-slate-300 font-semibold text-sm">debe a</span>
                  <span className={debtor === "memberA" ? "text-blue-400" : "text-red-400"}>
                    {creditorName}:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-[#00D09C] ml-1">
                    {netDebt.toFixed(2)} €
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Transfiriendo esta cantidad por Bizum o cuenta personal quedáis exactamente al 50%.
                </p>
              </div>
            </div>

            {/* Settle Action Button */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {!showConfirmSettle ? (
                <button
                  type="button"
                  data-testid="settle-debt-btn"
                  onClick={() => setShowConfirmSettle(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title={`Registrar que ${debtorName} ha transferido ${netDebt.toFixed(2)} € a ${creditorName}`}
                >
                  <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                  <span>Saldar cuentas</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-700 animate-in fade-in">
                  <span className="text-[11px] text-slate-300 font-bold px-1">
                    ¿Confirmar Bizum?
                  </span>
                  <button
                    type="button"
                    data-testid="confirm-settle-btn"
                    onClick={handleConfirmSettle}
                    className="px-3 py-1.5 rounded-lg bg-[#00D09C] hover:bg-[#00B386] text-slate-950 font-black text-xs cursor-pointer shadow-xs"
                  >
                    Sí, saldar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmSettle(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Breakdown comparison of contributions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        <div className="p-3 rounded-2xl bg-red-50/50 border border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-slate-700">Aportado por {memberAName}</span>
          </div>
          <span className="text-xs font-black text-red-700">
            {paidByA.toFixed(2)} €
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-slate-700">Aportado por {memberBName}</span>
          </div>
          <span className="text-xs font-black text-blue-700">
            {paidByB.toFixed(2)} €
          </span>
        </div>
      </div>
    </section>
  );
};

export default LiveBalanceCard;
