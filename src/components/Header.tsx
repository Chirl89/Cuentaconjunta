"use client";

import React, { useState } from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import { WalletCards, Users, Edit3, X, Check } from "lucide-react";

export const Header: React.FC = () => {
  const { memberAName, memberBName, setMemberAName, setMemberBName } = useUserNames();
  const [isEditing, setIsEditing] = useState(false);
  const [tempA, setTempA] = useState(memberAName);
  const [tempB, setTempB] = useState(memberBName);

  const handleOpenEdit = () => {
    setTempA(memberAName);
    setTempB(memberBName);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempA.trim()) setMemberAName(tempA.trim());
    if (tempB.trim()) setMemberBName(tempB.trim());
    setIsEditing(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe-top">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <WalletCards className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">FitDuo</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 hidden sm:inline-block">
                  Fintech
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">Cuenta Conjunta</p>
            </div>
          </div>

          {/* Center / Right: Names & Version Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Couple names interactive pill */}
            <button
              onClick={handleOpenEdit}
              title="Haz clic para personalizar los nombres de la pareja"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-medium transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">{memberAName}</span>
              <span className="text-slate-500">&</span>
              <span className="text-rose-400 font-semibold">{memberBName}</span>
              <Edit3 className="w-3 h-3 text-slate-400 ml-1 opacity-70" />
            </button>

            {/* Version Badge - mandatory by FitDuo standard */}
            <VersionBadge showDetails={false} />
          </div>
        </div>
      </header>

      {/* Edit Names Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Nombres de la Pareja
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Miembro A (ej. Carlos):
                </label>
                <input
                  type="text"
                  value={tempA}
                  onChange={(e) => setTempA(e.target.value)}
                  placeholder="Persona A"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Miembro B (ej. Laura):
                </label>
                <input
                  type="text"
                  value={tempB}
                  onChange={(e) => setTempB(e.target.value)}
                  placeholder="Persona B"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="text-[11px] text-slate-400 leading-tight">
                ⚡ Los cambios se sincronizan en tiempo real en todas tus pantallas y pestañas abiertas.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Guardar Nombres
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
