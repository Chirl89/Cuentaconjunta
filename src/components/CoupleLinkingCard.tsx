"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserNames } from "@/context/UserNamesContext";
import {
  HeartHandshake,
  Copy,
  Check,
  RefreshCw,
  User,
  ShieldCheck,
  KeyRound,
  Link2,
} from "lucide-react";

interface CoupleLinkingCardProps {
  onToast: (msg: string) => void;
}

export const CoupleLinkingCard: React.FC<CoupleLinkingCardProps> = ({ onToast }) => {
  const {
    household,
    activeRole,
    switchActiveRole,
    joinHouseholdByCode,
    generateNewInviteCode,
  } = useAuth();

  const { memberAName, memberBName } = useUserNames();

  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState(false);

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      onToast(`Código ${household.inviteCode} copiado al portapapeles`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setLinking(true);
    const res = await joinHouseholdByCode(inputCode);
    setLinking(false);
    if (res.success) {
      onToast("¡Hogar de pareja vinculado con éxito!");
      setInputCode("");
    } else {
      alert(res.error || "Error al vincular el código.");
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Household Banner (Sin interfaz de login ni credenciales) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/70 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#00D09C] flex items-center justify-center shadow-lg shadow-[#00D09C]/25 shrink-0">
              <HeartHandshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {household.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00D09C] text-white">
                  {household.isPartnerLinked ? "2 Miembros Vinculados" : "1 Miembro Vinculado"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Sincronización en segundo plano activa • Sin necesidad de credenciales</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active Role & Profile Selector (Carlos / Andrea en 1 clic) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#00A37A]" />
            <span>Perfil Activo en este Dispositivo</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Cambia quién visualiza o registra los gastos al instante
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Member A Card */}
          <div
            onClick={() => switchActiveRole("memberA")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              activeRole === "memberA"
                ? "bg-red-50/70 border-red-300 ring-2 ring-red-400 ring-offset-2 shadow-xs"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {memberAName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>{memberAName}</span>
                  {activeRole === "memberA" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Tú (Activo)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Miembro A (Acento Rojo)</span>
              </div>
            </div>

            {activeRole === "memberA" ? (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                Seleccionar
              </span>
            )}
          </div>

          {/* Member B Card */}
          <div
            onClick={() => switchActiveRole("memberB")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              activeRole === "memberB"
                ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-400 ring-offset-2 shadow-xs"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {memberBName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>{memberBName}</span>
                  {activeRole === "memberB" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Tú (Activo)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Miembro B (Acento Azul)</span>
              </div>
            </div>

            {activeRole === "memberB" ? (
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                Seleccionar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Partner Pairing & Invite Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box A: My Household Invite Code */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#00A37A]" />
              Código de Invitación del Hogar
            </span>
            <button
              type="button"
              onClick={() => {
                const code = generateNewInviteCode();
                onToast(`Nuevo código generado: ${code}`);
              }}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
              title="Generar nuevo código aleatorio"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Comparte este código con tu pareja para vincular ambos dispositivos al mismo hogar compartido.
          </p>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-mono text-lg font-black tracking-widest text-slate-900 flex-1 text-center">
              {household.inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Box B: Join Existing Partner Code */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-[#00A37A]" />
            Unirme al Hogar de mi Pareja
          </span>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Si tu pareja ya tiene un código de hogar, introdúcelo aquí para emparejar ambos dispositivos.
          </p>

          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="ej. FITDUO"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-[#00D09C] focus:bg-white"
            />
            <button
              type="submit"
              disabled={linking || !inputCode.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              {linking ? "Vinculando..." : "Vincular"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoupleLinkingCard;
