"use client";

import React, { useState, useEffect } from "react";
import { useUserNames } from "@/context/UserNamesContext";
import {
  useTransactions,
  CATEGORIES_LIST,
  SplitType,
  PayerType,
  Transaction,
} from "@/context/TransactionsContext";
import { PlusCircle, Pencil, X, Check, Trash2, Users } from "lucide-react";

interface AddManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  transactionToEdit?: Transaction | null;
}

export const AddManualExpenseModal: React.FC<AddManualExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const { memberAName, memberBName } = useUserNames();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES_LIST[0].name);
  const [payer, setPayer] = useState<PayerType>("joint");
  const [split, setSplit] = useState<SplitType>("50/50");

  const isEditing = !!transactionToEdit;

  useEffect(() => {
    if (transactionToEdit) {
      setMerchant(transactionToEdit.merchant);
      setAmount(String(transactionToEdit.amount));
      setCategory(transactionToEdit.category);
      setPayer(transactionToEdit.payer);
      setSplit(transactionToEdit.split);
    } else {
      setMerchant("");
      setAmount("");
      setCategory(CATEGORIES_LIST[0].name);
      setPayer("joint");
      setSplit("50/50");
    }
  }, [transactionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor, introduce un importe válido.");
      return;
    }

    if (isEditing && transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        merchant: merchant.trim() || "Gasto",
        amount: numAmount,
        category,
        payer,
        split,
      });
      onSuccess(`Gasto "${merchant.trim() || "Gasto"}" actualizado correctamente.`);
    } else {
      addTransaction({
        merchant: merchant.trim() || "Gasto en Efectivo",
        amount: numAmount,
        category,
        payer,
        split,
      });
      onSuccess(`Gasto de ${numAmount.toFixed(2)} € añadido correctamente.`);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!transactionToEdit) return;
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este gasto?");
    if (confirmed) {
      deleteTransaction(transactionToEdit.id);
      onSuccess(`Gasto "${transactionToEdit.merchant}" eliminado correctamente.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isEditing
                  ? "bg-amber-50 text-amber-600"
                  : "bg-[#E6FAF4] text-[#00A37A]"
              }`}
            >
              {isEditing ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {isEditing ? "Editar Gasto" : "Añadir Gasto Manual"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Concepto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Concepto / Comercio:
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="ej. Panadería, Restaurante, Mercadona..."
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]"
              autoFocus
              required
            />
          </div>

          {/* Importe y Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Importe (€):
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

          {/* ¿Quién pagó el dinero? (Cuenta Conjunta, Carlos, Andrea) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ¿Quién pagó el dinero? (Origen de cuenta)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayer("joint")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                  payer === "joint"
                    ? "bg-emerald-50 text-[#008761] border-[#00D09C] shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Conjunta</span>
              </button>

              <button
                type="button"
                onClick={() => setPayer("memberA")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                  payer === "memberA"
                    ? "bg-red-50 text-red-600 border-red-300 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {memberAName}
              </button>

              <button
                type="button"
                onClick={() => setPayer("memberB")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                  payer === "memberB"
                    ? "bg-blue-50 text-blue-600 border-blue-300 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {memberBName}
              </button>
            </div>
          </div>

          {/* Tipo de reparto */}
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
                1/2
              </button>
              <button
                type="button"
                onClick={() => setSplit("memberA")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                  split === "memberA"
                    ? "bg-red-500 text-white border-red-500 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Solo {memberAName}
              </button>
              <button
                type="button"
                onClick={() => setSplit("memberB")}
                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                  split === "memberB"
                    ? "bg-blue-500 text-white border-blue-500 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Solo {memberBName}
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold shadow-md shadow-[#00D09C]/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? "Guardar Cambios" : "Guardar Gasto"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManualExpenseModal;
