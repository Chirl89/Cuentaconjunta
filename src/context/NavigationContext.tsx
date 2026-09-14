"use client";

import React, { createContext, useContext, useState } from "react";

export type TabKey =
  | "resumen"
  | "movimientos"
  | "balances"
  | "cuentas"
  | "distribucion"
  | "ajustes";

interface NavigationContextType {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
