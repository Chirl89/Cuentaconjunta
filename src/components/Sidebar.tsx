"use client";

import React, { useState } from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import { useOptionalAuth } from "@/context/AuthContext";
import { useNavigation, TabKey } from "@/context/NavigationContext";
import { useTransactions } from "@/context/TransactionsContext";
import {
  Users,
  User,
  ReceiptText,
  ArrowRightLeft,
  Landmark,
  Settings,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  HeartHandshake,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { memberAName, memberBName } = useUserNames();
  const auth = useOptionalAuth();
  const { activeTab, setActiveTab } = useNavigation();
  const { pendingTransactions } = useTransactions();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const pendingCount = pendingTransactions.length;

  const graphItems: {
    key: TabKey;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    activeClass: string;
  }[] = [
    {
      key: "resumen_conjunta",
      name: "Gastos Conjuntos",
      icon: Users,
      color: "text-[#00A37A]",
      activeClass: "bg-emerald-50 text-emerald-700 font-bold shadow-xs border border-emerald-200",
    },
    {
      key: "resumen_carlos",
      name: `Gastos de ${memberAName}`,
      icon: User,
      color: "text-red-500",
      activeClass: "bg-red-50 text-red-700 font-bold shadow-xs border border-red-200",
    },
    {
      key: "resumen_andrea",
      name: `Gastos de ${memberBName}`,
      icon: User,
      color: "text-blue-500",
      activeClass: "bg-blue-50 text-blue-700 font-bold shadow-xs border border-blue-200",
    },
  ];

  const managementItems: {
    key: TabKey;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      key: "movimientos",
      name: "Movimientos",
      icon: ReceiptText,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    { key: "balances", name: "Balances & Deuda", icon: ArrowRightLeft },
    { key: "cuentas", name: "Cuentas Bancarias", icon: Landmark },
    { key: "categorias", name: "Categorías", icon: Tag },
    { key: "ajustes", name: "Configuración", icon: Settings },
  ];

  const handleSelectTab = (key: TabKey) => {
    setActiveTab(key);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Vertical Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/90 shadow-sm transition-all duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Brand Header without "estilo fintonic" */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 min-w-[40px] rounded-2xl bg-[#00D09C] flex items-center justify-center shadow-md shadow-[#00D09C]/25">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                  Cuenta Conjunta
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Finanzas en Pareja
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Couple Header Badge & Active Profile Switcher */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3.5 py-2.5 mx-3 mt-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Hogar
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="truncate max-w-[85px]">{memberAName}</span>
              </span>
              <span className="text-slate-300 text-[10px]">&</span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="truncate max-w-[85px]">{memberBName}</span>
              </span>
            </div>

            {auth && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Activo:</span>
                <button
                  type="button"
                  onClick={() =>
                    auth.switchActiveRole(auth.activeRole === "memberA" ? "memberB" : "memberA")
                  }
                  className={`font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    auth.activeRole === "memberB"
                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  }`}
                  title="Cambiar perfil activo en este dispositivo"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      auth.activeRole === "memberB" ? "bg-blue-500" : "bg-red-500"
                    }`}
                  />
                  <span>{auth.activeRole === "memberB" ? memberBName : memberAName}</span>
                  <span className="text-[9px] opacity-60">⇄</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {/* Section 1: GRÁFICAS */}
          <div className="space-y-1">
            {(!isCollapsed || isMobileOpen) && (
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Gráficas & Análisis
              </div>
            )}
            {graphItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                    isActive
                      ? item.activeClass
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                  title={isCollapsed && !isMobileOpen ? item.name : undefined}
                >
                  <Icon
                    className={`w-4 h-4 min-w-[16px] transition-colors ${
                      isActive ? item.color : "text-slate-400"
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section 2: GESTIÓN */}
          <div className="space-y-1">
            {(!isCollapsed || isMobileOpen) && (
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Gestión
              </div>
            )}
            {managementItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                    isActive
                      ? "bg-[#E6FAF4] text-[#008761] font-bold shadow-xs border border-[#00D09C]/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                  title={isCollapsed && !isMobileOpen ? item.name : undefined}
                >
                  <Icon
                    className={`w-4 h-4 min-w-[16px] transition-colors ${
                      isActive ? "text-[#00A37A]" : "text-slate-400"
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {(!isCollapsed || isMobileOpen) && item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#00D09C] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer: Version Badge & Desktop Collapse Button */}
        <div className="p-3 border-t border-slate-100 flex flex-col gap-2 bg-white">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-full py-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            title={isCollapsed ? "Expandir barra lateral" : "Plegar barra lateral"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="flex items-center gap-2 text-slate-500">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Plegar menú</span>
              </span>
            )}
          </button>

          <div className="flex items-center justify-center pt-1">
            <VersionBadge showDetails={!isCollapsed || isMobileOpen} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
