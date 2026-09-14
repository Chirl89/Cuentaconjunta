"use client";

import React from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import { Menu, HeartHandshake } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { memberAName, memberBName } = useUserNames();

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

      {/* Right side: Read-only Couple Badge & VersionBadge */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
          <span className="text-red-600">{memberAName}</span>
          <span className="text-slate-400">&</span>
          <span className="text-blue-600">{memberBName}</span>
        </div>
        <VersionBadge showDetails={false} />
      </div>
    </header>
  );
};

export default Header;
