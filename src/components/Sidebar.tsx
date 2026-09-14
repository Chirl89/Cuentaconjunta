"use client";

import React, { useState } from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import {
  LayoutDashboard,
  Inbox,
  ArrowRightLeft,
  Landmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PieChart,
  HeartHandshake,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { memberAName, memberBName } = useUserNames();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: "Resumen Gastos", icon: LayoutDashboard, href: "#", active: true },
    { name: "Inbox de Triage", icon: Inbox, href: "#", badge: "3" },
    { name: "Balances & Deuda", icon: ArrowRightLeft, href: "#" },
    { name: "Cuentas Bancarias", icon: Landmark, href: "#" },
    { name: "Distribución IA", icon: PieChart, href: "#" },
    { name: "Configuración", icon: Settings, href: "#" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Vertical Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800/80 transition-all duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 min-w-[40px] rounded-2xl bg-gradient-to-tr from-[#00D09C] to-teal-400 flex items-center justify-center shadow-lg shadow-[#00D09C]/20">
              <HeartHandshake className="w-5 h-5 text-slate-950" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Cuenta Conjunta
                </span>
                <span className="text-[10px] font-semibold text-[#00D09C] uppercase tracking-wider">
                  Fintonic Edition
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Couple Profile Card (NO edit button) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">
              Miembros del Hogar
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#00D09C]">
                <span className="w-2 h-2 rounded-full bg-[#00D09C]" />
                <span className="truncate max-w-[85px]">{memberAName}</span>
              </span>
              <span className="text-slate-600 text-[10px]">&</span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="truncate max-w-[85px]">{memberBName}</span>
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items (Vertical list) */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  item.active
                    ? "bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/25 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                title={isCollapsed && !isMobileOpen ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 min-w-[20px] transition-colors ${
                    item.active ? "text-[#00D09C]" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="flex-1 truncate">{item.name}</span>
                )}
                {(!isCollapsed || isMobileOpen) && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#00D09C] text-slate-950">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer: Version Badge & Desktop Collapse Button */}
        <div className="p-3 border-t border-slate-800/80 flex flex-col gap-2">
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-full py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition-colors"
            title={isCollapsed ? "Expandir menú lateral" : "Plegar menú lateral"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Plegar barra lateral</span>
              </span>
            )}
          </button>

          {/* Mandatory FitDuo Version Badge */}
          <div className="flex items-center justify-center pt-1">
            <VersionBadge showDetails={!isCollapsed || isMobileOpen} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
