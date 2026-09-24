"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, ShieldCheck, KeyRound, X, AlertCircle, CheckCircle2, User, ArrowRight } from "lucide-react";
import {
  ProfileRole,
  verifyProfilePin,
  setUnlockedProfile,
  changeProfilePin,
} from "@/lib/security/profilePin";
import { useUserNames } from "@/context/UserNamesContext";

export interface ProfilePinModalProps {
  isOpen: boolean;
  mode: "login" | "switch" | "change_pin";
  targetRole?: ProfileRole;
  onSuccess: (role: ProfileRole) => void;
  onClose?: () => void;
  canCancel?: boolean;
}

export const ProfilePinModal: React.FC<ProfilePinModalProps> = ({
  isOpen,
  mode,
  targetRole = "memberA",
  onSuccess,
  onClose,
  canCancel = true,
}) => {
  const { memberAName, memberBName } = useUserNames();
  const [selectedRole, setSelectedRole] = useState<ProfileRole>(targetRole);
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [step, setStep] = useState<"enter_pin" | "new_pin" | "confirm_pin">("enter_pin");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(targetRole);
      setPin("");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setStep("enter_pin");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, targetRole]);

  if (!isOpen) return null;

  const currentRoleName = selectedRole === "memberA" ? memberAName : memberBName;

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (mode === "login" || mode === "switch") {
      if (pin.length !== 6) {
        setErrorMsg("El PIN debe tener 6 dígitos.");
        return;
      }

      const isValid = verifyProfilePin(selectedRole, pin);
      if (isValid) {
        setUnlockedProfile(selectedRole);
        setSuccessMsg(`¡Bienvenido/a, ${currentRoleName}!`);
        setTimeout(() => {
          onSuccess(selectedRole);
        }, 300);
      } else {
        setErrorMsg("PIN incorrecto. Inténtalo de nuevo.");
        setPin("");
      }
    } else if (mode === "change_pin") {
      if (step === "enter_pin") {
        if (!verifyProfilePin(selectedRole, currentPin)) {
          setErrorMsg("El PIN actual no es correcto.");
          setCurrentPin("");
          return;
        }
        setStep("new_pin");
        setErrorMsg(null);
      } else if (step === "new_pin") {
        if (!/^\d{6}$/.test(newPin)) {
          setErrorMsg("El nuevo PIN debe tener exactamente 6 dígitos numéricos.");
          return;
        }
        if (newPin === currentPin) {
          setErrorMsg("El nuevo PIN no puede ser idéntico al actual.");
          return;
        }
        setStep("confirm_pin");
        setErrorMsg(null);
      } else if (step === "confirm_pin") {
        if (confirmPin !== newPin) {
          setErrorMsg("Los PINs no coinciden. Introduce de nuevo la confirmación.");
          setConfirmPin("");
          return;
        }
        const result = changeProfilePin(selectedRole, currentPin, newPin);
        if (result.success) {
          setSuccessMsg("¡PIN modificado con éxito!");
          setTimeout(() => {
            onSuccess(selectedRole);
          }, 800);
        } else {
          setErrorMsg(result.error || "Error al cambiar el PIN.");
        }
      }
    }
  };

  const handleDigitInput = (value: string) => {
    const cleanDigits = value.replace(/\D/g, "").slice(0, 6);
    if (mode === "change_pin") {
      if (step === "enter_pin") {
        setCurrentPin(cleanDigits);
        if (cleanDigits.length === 6) {
          if (verifyProfilePin(selectedRole, cleanDigits)) {
            setStep("new_pin");
            setErrorMsg(null);
          } else {
            setErrorMsg("El PIN actual no es correcto.");
          }
        }
      } else if (step === "new_pin") {
        setNewPin(cleanDigits);
        if (cleanDigits.length === 6) {
          setStep("confirm_pin");
          setErrorMsg(null);
        }
      } else if (step === "confirm_pin") {
        setConfirmPin(cleanDigits);
        if (cleanDigits.length === 6) {
          if (cleanDigits === newPin) {
            const res = changeProfilePin(selectedRole, currentPin, newPin);
            if (res.success) {
              setSuccessMsg("¡PIN modificado con éxito!");
              setTimeout(() => onSuccess(selectedRole), 800);
            } else {
              setErrorMsg(res.error || "Error al actualizar PIN.");
            }
          } else {
            setErrorMsg("Los PINs no coinciden.");
          }
        }
      }
    } else {
      setPin(cleanDigits);
      if (cleanDigits.length === 6) {
        const isValid = verifyProfilePin(selectedRole, cleanDigits);
        if (isValid) {
          setUnlockedProfile(selectedRole);
          setSuccessMsg(`¡Acceso concedido!`);
          setTimeout(() => onSuccess(selectedRole), 300);
        } else {
          setErrorMsg("PIN incorrecto. Inténtalo de nuevo.");
          setPin("");
        }
      }
    }
  };

  const activeInputDigits =
    mode === "change_pin"
      ? step === "enter_pin"
        ? currentPin
        : step === "new_pin"
        ? newPin
        : confirmPin
      : pin;

  return (
    <div
      data-testid="profile-pin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Close button if allowed */}
        {canCancel && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A37A] shadow-xs">
            {mode === "change_pin" ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {mode === "change_pin"
              ? `Cambiar PIN de ${currentRoleName}`
              : mode === "switch"
              ? `Acceder como ${currentRoleName}`
              : "Selecciona tu perfil"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {mode === "change_pin"
              ? step === "enter_pin"
                ? "Introduce tu PIN actual de 6 dígitos"
                : step === "new_pin"
                ? "Introduce tu NUEVO PIN de 6 dígitos"
                : "Confirma tu NUEVO PIN de 6 dígitos"
              : `Introduce el código de 6 dígitos para proteger la privacidad`}
          </p>
        </div>

        {/* Mode: Login Profile Picker (Carlos vs Andrea) */}
        {mode === "login" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("memberA");
                setPin("");
                setErrorMsg(null);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                selectedRole === "memberA"
                  ? "border-red-500 bg-red-50/70 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  selectedRole === "memberA" ? "bg-red-500 text-white" : "bg-red-100 text-red-600"
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800">{memberAName}</span>
              <span className="text-[10px] text-slate-400 font-medium">Perfil A</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole("memberB");
                setPin("");
                setErrorMsg(null);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                selectedRole === "memberB"
                  ? "border-blue-500 bg-blue-50/70 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  selectedRole === "memberB" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-600"
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800">{memberBName}</span>
              <span className="text-[10px] text-slate-400 font-medium">Perfil B</span>
            </button>
          </div>
        )}

        {/* PIN 6-Boxes Indicator & Real Hidden Input */}
        <div className="space-y-3">
          <form onSubmit={handlePinSubmit}>
            <div className="relative flex justify-center items-center">
              {/* Invisible full-width input to handle mobile typing and paste */}
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={activeInputDigits}
                onChange={(e) => handleDigitInput(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                aria-label="Código PIN de 6 dígitos"
                autoFocus
              />

              {/* 6 Visual digit boxes */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = activeInputDigits[index];
                  const isCurrent = activeInputDigits.length === index;
                  return (
                    <div
                      key={index}
                      className={`w-11 h-12 sm:w-12 sm:h-13 rounded-2xl border-2 flex items-center justify-center text-lg sm:text-xl font-mono font-black transition-all ${
                        digit
                          ? selectedRole === "memberA"
                            ? "border-red-500 bg-red-50/40 text-red-700"
                            : "border-blue-500 bg-blue-50/40 text-blue-700"
                          : isCurrent
                          ? "border-slate-700 bg-slate-50 ring-2 ring-slate-200"
                          : "border-slate-200 bg-slate-50/50 text-slate-300"
                      }`}
                    >
                      {digit ? "•" : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          {/* Feedback messages */}
          {errorMsg && (
            <div
              data-testid="pin-error"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 py-1.5 px-3 rounded-xl animate-shake"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              data-testid="pin-success"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handlePinSubmit()}
            disabled={activeInputDigits.length !== 6}
            className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedRole === "memberA"
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
            }`}
          >
            <span>
              {mode === "change_pin"
                ? step === "confirm_pin"
                  ? "Guardar nuevo PIN"
                  : "Continuar"
                : `Desbloquear ${currentRoleName}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice / Hint */}
        <div className="border-t border-slate-100 pt-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Privacidad protegida: Cada miembro solo ve sus finanzas y las comunes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePinModal;
