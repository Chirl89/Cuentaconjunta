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
import { PlusCircle, Pencil, X, Check, Trash2, Users, Landmark, ShoppingBag, ArrowRight } from "lucide-react";

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

  const [movementType, setMovementType] = useState<"expense" | "transfer_to_joint">("expense");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES_LIST[0].name);
  const [payer, setPayer] = useState<PayerType>("joint");
  const [split, setSplit] = useState<SplitType>("50/50");

  const isEditing = !!transactionToEdit;

  useEffect(() => {
    if (transactionToEdit) {
      setMovementType(
        transactionToEdit.movementType === "transfer_to_joint"
          ? "transfer_to_joint"
          : "expense"
      );
      setMerchant(transactionToEdit.merchant);
      setAmount(String(transactionToEdit.amount));
      setCategory(transactionToEdit.category);
      setPayer(transactionToEdit.payer);
      setSplit(transactionToEdit.split);
    } else {
      setMovementType("expense");
      setMerchant("");
      setAmount("");
      setCategory(CATEGORIES_LIST[0].name);
      setPayer("joint");
      setSplit("50/50");
    }
  }, [transactionToEdit, isOpen]);

  // When switching movement type in creation mode
  const handleTypeChange = (type: "expense" | "transfer_to_joint") => {
    setMovementType(type);
    if (type === "transfer_to_joint") {
      setMerchant("Aportación Cuenta Conjunta");
      setCategory("Aportación Conjunta");
      setPayer("memberA");
      setSplit("50/50");
    } else {
      setMerchant("");
      setCategory(CATEGORIES_LIST[0].name);
      setPayer("joint");
      setSplit("50/50");
    }
  };

  if (!isOpen) return null;

  // If attempting to edit a non-manual bank transaction, block it
  if (isEditing && transactionToEdit && !transactionToEdit.isManual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">Movimiento Bancario</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
            <p className="font-bold">⚠️ Este movimiento se importó automáticamente del banco.</p>
            <p>
              Por seguridad contable, los importes y la cuenta pagadora de movimientos bancarios reales no se pueden alterar ni eliminar.
              Puedes reclasificar el reparto (1/2, Carlos, Andrea) o la categoría directamente en la lista.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor, introduce un importe válido.");
      return;
    }

    if (isEditing && transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        merchant: merchant.trim() || (movementType === "transfer_to_joint" ? "Aportación Cuenta Conjunta" : "Gasto"),
        amount: numAmount,
        category: movementType === "transfer_to_joint" ? "Aportación Conjunta" : category,
        payer,
        split: movementType === "transfer_to_joint" ? "50/50" : split,
      });
      onSuccess(`Movimiento "${merchant.trim() || "Gasto"}" actualizado correctamente.`);
    } else {
      addTransaction({
        merchant: merchant.trim() || (movementType === "transfer_to_joint" ? "Aportación Cuenta Conjunta" : "Gasto Manual"),
        amount: numAmount,
        category: movementType === "transfer_to_joint" ? "Aportación Conjunta" : category,
        payer,
        split: movementType === "transfer_to_joint" ? "50/50" : split,
        movementType,
      });
      if (movementType === "transfer_to_joint") {
        onSuccess(`Aportación de ${numAmount.toFixed(2)} € a la Cuenta Conjunta registrada con éxito.`);
      } else {
        onSuccess(`Gasto de ${numAmount.toFixed(2)} € añadido correctamente.`);
      }
    }

    onClose();
  };

  const handleDelete = () => {
    if (!transactionToEdit) return;
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este movimiento manual?");
    if (confirmed) {
      deleteTransaction(transactionToEdit.id);
      onSuccess(`Gasto "${transactionToEdit.merchant}" eliminado correctamente.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isEditing
                  ? "bg-amber-50 text-amber-600"
                  : movementType === "transfer_to_joint"
                  ? "bg-emerald-50 text-[#00A37A]"
                  : "bg-[#E6FAF4] text-[#00A37A]"
              }`}
            >
              {isEditing ? (
                <Pencil className="w-4 h-4" />
              ) : movementType === "transfer_to_joint" ? (
                <Landmark className="w-4 h-4" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {isEditing
                ? "Editar Movimiento Manual"
                : movementType === "transfer_to_joint"
                ? "Aportar a Cuenta Conjunta"
                : "Añadir Gasto Manual"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Movement Type Switcher (only in create mode) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                movementType === "expense"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Gasto Habitual</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("transfer_to_joint")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                movementType === "transfer_to_joint"
                  ? "bg-white text-[#008761] shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Aportar a Conjunta</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Concepto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {movementType === "transfer_to_joint" ? "Concepto de la transferencia:" : "Concepto / Comercio:"}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={movementType === "transfer_to_joint" ? "ej. Aportación nómina, fondo común..." : "ej. Panadería, Cena, Farmacia..."}
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]"
              autoFocus
              required
            />
          </div>

          {/* Importe y Categoría */}
          <div className={movementType === "transfer_to_joint" ? "space-y-3" : "grid grid-cols-2 gap-3"}>
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
                placeholder="ej. 100"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:border-[#00D09C] focus:ring-1 focus:ring-[#00D09C]"
                required
              />
            </div>

            {movementType === "expense" && (
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
            )}
          </div>

          {/* ¿Quién pagó / aportó el dinero? */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {movementType === "transfer_to_joint" ? "¿Quién ingresa el dinero a la cuenta conjunta?" : "¿Quién pagó el dinero? (Origen de cuenta)"}
            </label>

            {movementType === "transfer_to_joint" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayer("memberA")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
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
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    payer === "memberB"
                      ? "bg-blue-50 text-blue-600 border-blue-300 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {memberBName}
                </button>
              </div>
            ) : (
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
            )}
          </div>

          {/* Explicación de impacto o Tipo de reparto */}
          {movementType === "transfer_to_joint" ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[#008761]">
                <Check className="w-3.5 h-3.5" />
                <span>Impacto en balances y opciones de neteo:</span>
              </div>
              <p>
                Si {payer === "memberA" ? memberAName : memberBName} ingresa {amount ? `${amount} €` : "este dinero"} a la Cuenta Conjunta:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>
                  <strong className="text-slate-800">Neteo directo:</strong> {payer === "memberA" ? memberBName : memberAName} le deberá{" "}
                  <strong>{amount ? `${(parseFloat(amount) / 2 || 0).toFixed(2)} €` : "la mitad"}</strong>.
                </li>
                <li>
                  <strong className="text-slate-800">Neteo con la Conjunta:</strong> {payer === "memberA" ? memberBName : memberAName} deberá ingresar{" "}
                  <strong>{amount ? `${(parseFloat(amount) || 0).toFixed(2)} €` : "el total"}</strong> a la Cuenta Conjunta para igualar aportaciones.
                </li>
              </ul>
            </div>
          ) : (
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
                  1/2 (50%)
                </button>

                {payer === "memberA" && (
                  <>
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
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      Para {memberBName} (100%)
                    </button>
                  </>
                )}

                {payer === "memberB" && (
                  <>
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
                    <button
                      type="button"
                      onClick={() => setSplit("memberA")}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                        split === "memberA"
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      Para {memberAName} (100%)
                    </button>
                  </>
                )}

                {payer === "joint" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSplit("memberA")}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                        split === "memberA"
                          ? "bg-red-500 text-white border-red-500 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Para {memberAName}
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
                      Para {memberBName}
                    </button>
                  </>
                )}
              </div>

              {/* Explicación de compra para la pareja (100% deuda) */}
              {payer === "memberA" && split === "memberB" && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
                  <span className="text-blue-600 font-bold shrink-0">💳 100% Deuda:</span>
                  <span>
                    Has pagado tú una compra exclusiva para {memberBName}. {memberBName} te deberá el <strong>100% del importe ({amount ? `${amount} €` : "del gasto"})</strong>.
                  </span>
                </div>
              )}

              {payer === "memberB" && split === "memberA" && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200/80 text-[11px] text-red-900 flex items-start gap-2">
                  <span className="text-red-600 font-bold shrink-0">💳 100% Deuda:</span>
                  <span>
                    Ha pagado {memberBName} una compra exclusiva para {memberAName}. {memberAName} le deberá el <strong>100% del importe ({amount ? `${amount} €` : "del gasto"})</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

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
                <span>{isEditing ? "Guardar Cambios" : movementType === "transfer_to_joint" ? "Registrar Aportación" : "Guardar Gasto"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManualExpenseModal;
