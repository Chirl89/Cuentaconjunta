"use client";

import React, { useState } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import { useTransactions, CATEGORIES_LIST, SplitType, PayerType } from "@/context/TransactionsContext";
import { PlusCircle, X, Check } from "lucide-react";

interface AddManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddManualExpenseModal: React.FC<AddManualExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { memberAName, memberBName } = useUserNames();
  const { addTransaction } = useTransactions();

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES_LIST[0].name);
  const [payer, setPayer] = useState<PayerType>("memberA");
  const [split, setSplit] = useState<SplitType>("50/50");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor, introduce un importe válido.");
      return;
    }

    addTransaction({
      merchant: merchant.trim() || "Gasto en Efectivo",
      amount: numAmount,
      category,
      payer,
      split,
    });

    onSuccess(`Gasto de ${numAmount.toFixed(2)} € añadido correctamente.`);
    setMerchant("");
    setAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E6FAF4] text-[#00A37A] flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Añadir Gasto Manual</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Concepto / Comercio:
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="ej. Panadería, Cena, Farmacia..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Importe (€ redondos):
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ej. 20"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoría:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#00D09C]"
              >
                {CATEGORIES_LIST.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagado por */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ¿Quién pagó el dinero?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayer("memberA")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  payer === "memberA"
                    ? "bg-[#E6FAF4] text-[#008761] border-[#00D09C] shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {memberAName}
              </button>
              <button
                type="button"
                onClick={() => setPayer("memberB")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  payer === "memberB"
                    ? "bg-rose-50 text-rose-600 border-rose-300 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {memberBName}
              </button>
            </div>
          </div>

          {/* Reparto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de reparto:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSplit("50/50")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                  split === "50/50"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                50 / 50
              </button>
              <button
                type="button"
                onClick={() => setSplit("memberA")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                  split === "memberA"
                    ? "bg-[#00D09C] text-white border-[#00D09C] shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Solo {memberAName}
              </button>
              <button
                type="button"
                onClick={() => setSplit("memberB")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                  split === "memberB"
                    ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Solo {memberBName}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/25 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Gasto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManualExpenseModal;
