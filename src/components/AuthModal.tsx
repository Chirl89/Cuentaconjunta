"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Mail,
  Lock,
  User,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signInWithEmail, signUpWithEmail, signInWithOtp } = useAuth();

  const [mode, setMode] = useState<"magic" | "password" | "register">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === "magic") {
        if (!email.trim()) {
          setErrorMsg("Por favor, introduce tu correo electrónico.");
          setLoading(false);
          return;
        }
        const res = await signInWithOtp(email.trim());
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setInfoMsg(res.message || "¡Enlace mágico enviado! Revisa tu bandeja de entrada.");
          if (onSuccess) onSuccess("Enlace mágico enviado");
        }
      } else if (mode === "password") {
        if (!email.trim() || !password) {
          setErrorMsg("Introduce tu correo y contraseña.");
          setLoading(false);
          return;
        }
        const res = await signInWithEmail(email.trim(), password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          if (onSuccess) onSuccess("¡Sesión iniciada con éxito!");
          onClose();
        }
      } else if (mode === "register") {
        if (!email.trim() || !password || !displayName.trim()) {
          setErrorMsg("Por favor, completa todos los campos requeridos.");
          setLoading(false);
          return;
        }
        const res = await signUpWithEmail(email.trim(), password, displayName.trim(), inviteCode);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setInfoMsg(res.message || "¡Cuenta creada! Revisa tu correo o inicia sesión.");
          if (onSuccess) onSuccess("¡Cuenta registrada con éxito!");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-2xl bg-[#00D09C] flex items-center justify-center shadow-md shadow-[#00D09C]/25 shrink-0">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              {mode === "magic" && "Acceso Seguro con Enlace"}
              {mode === "password" && "Iniciar Sesión en Pareja"}
              {mode === "register" && "Crear Cuenta de Hogar"}
            </h2>
            <p className="text-xs text-slate-500">
              Sincronización multi-dispositivo con Supabase Auth
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === "magic"
                ? "bg-white text-slate-900 shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === "password"
                ? "bg-white text-slate-900 shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Contraseña
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Feedback Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tu Nombre</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ej. Carlos o Andrea"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00D09C] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-email@ejemplo.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00D09C] focus:bg-white transition-all"
              />
            </div>
          </div>

          {(mode === "password" || mode === "register") && (
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00D09C] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Código de Pareja (Opcional)</span>
                <span className="text-[10px] text-[#00A37A] font-semibold">Si tu pareja ya tiene cuenta</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ej. FITDUO"
                  maxLength={8}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs sm:text-sm font-bold uppercase tracking-wider focus:outline-none focus:border-[#00D09C] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-2xl bg-[#00D09C] hover:bg-[#00B386] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#00D09C]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Procesando...</span>
            ) : (
              <>
                <span>
                  {mode === "magic" && "Enviar Enlace Mágico"}
                  {mode === "password" && "Entrar a Cuenta Conjunta"}
                  {mode === "register" && "Registrar Hogar"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Offline Option */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cifrado PostgreSQL RLS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Continuar sin cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
