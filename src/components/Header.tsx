"use client";

import React from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import { useOptionalAuth } from "@/context/AuthContext";
import { Menu, HeartHandshake, User } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { memberAName, memberBName } = useUserNames();
  const auth = useOptionalAuth();

  const activeName = auth?.activeRole === "memberB" ? memberBName : memberAName;
  const isB = auth?.activeRole === "memberB";

  const handleToggleRole = () => {
    if (auth) {
      auth.switchActiveRole(isB ? "memberA" : "memberB");
    }
  };

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 h-14 flex items-center justify-between pt-safe-top shadow-xs">
      {/* Mobile Hamburger to trigger vertical sidebar */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5 text-[#00A37A]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#00D09C] flex items-center justify-center shadow-xs">
            <HeartHandshake className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-900">Cuenta Conjunta</span>
        </div>
      </div>

      {/* Right side: Active Role Switcher Badge & VersionBadge */}
      <div className="flex items-center gap-2">
        {auth && (
          <button
            type="button"
            onClick={handleToggleRole}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              isB
                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            }`}
            title={`Actuando como ${activeName}. Toca para cambiar.`}
          >
            <span className={`w-2 h-2 rounded-full ${isB ? "bg-blue-500" : "bg-red-500"}`} />
            <span>{activeName}</span>
          </button>
        )}
        <VersionBadge showDetails={false} />
      </div>
    </header>
  );
};

export default Header;
