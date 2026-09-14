"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { UserNames } from "@/types";

const STORAGE_KEY = "fitduo_user_names";
const CHANNEL_NAME = "fitduo_names_sync";

const DEFAULT_NAMES: UserNames = {
  memberA: "Persona A",
  memberB: "Persona B",
};

interface UserNamesContextType {
  names: UserNames;
  memberAName: string;
  memberBName: string;
  setMemberAName: (name: string) => void;
  setMemberBName: (name: string) => void;
  setNames: (names: Partial<UserNames>) => void;
  resetNames: () => void;
  isHydrated: boolean;
}

const UserNamesContext = createContext<UserNamesContextType | undefined>(undefined);

export function UserNamesProvider({
  children,
  initialNames,
}: {
  children: React.ReactNode;
  initialNames?: Partial<UserNames>;
}) {
  const [names, setNamesState] = useState<UserNames>(() => ({
    memberA: initialNames?.memberA?.trim() || DEFAULT_NAMES.memberA,
    memberB: initialNames?.memberB?.trim() || DEFAULT_NAMES.memberB,
  }));
  const [isHydrated, setIsHydrated] = useState(false);

  // Sync state to local storage and broadcast to other tabs
  const broadcastAndStore = useCallback((newNames: UserNames) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNames));
      if (window.BroadcastChannel) {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage(newNames);
        bc.close();
      }
    } catch {
      // Ignore storage errors (private mode, quota)
    }
  }, []);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserNames>;
        if (parsed && (parsed.memberA || parsed.memberB)) {
          setNamesState({
            memberA: parsed.memberA?.trim() || DEFAULT_NAMES.memberA,
            memberB: parsed.memberB?.trim() || DEFAULT_NAMES.memberB,
          });
        }
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Listen for multi-window / multi-tab changes via BroadcastChannel and storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      const handleMessage = (event: MessageEvent<UserNames>) => {
        if (event.data && typeof event.data === "object") {
          setNamesState((prev) => ({
            memberA: event.data.memberA?.trim() || prev.memberA,
            memberB: event.data.memberB?.trim() || prev.memberB,
          }));
        }
      };
      bc.onmessage = handleMessage;
      if (bc.addEventListener) {
        bc.addEventListener("message", handleMessage as EventListener);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as Partial<UserNames>;
          setNamesState((prev) => ({
            memberA: parsed.memberA?.trim() || prev.memberA,
            memberB: parsed.memberB?.trim() || prev.memberB,
          }));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setNames = useCallback(
    (newPartial: Partial<UserNames>) => {
      setNamesState((prev) => {
        const updated: UserNames = {
          memberA: newPartial.memberA !== undefined ? newPartial.memberA.trim() || DEFAULT_NAMES.memberA : prev.memberA,
          memberB: newPartial.memberB !== undefined ? newPartial.memberB.trim() || DEFAULT_NAMES.memberB : prev.memberB,
        };
        broadcastAndStore(updated);
        return updated;
      });
    },
    [broadcastAndStore]
  );

  const setMemberAName = useCallback(
    (name: string) => {
      setNames({ memberA: name });
    },
    [setNames]
  );

  const setMemberBName = useCallback(
    (name: string) => {
      setNames({ memberB: name });
    },
    [setNames]
  );

  const resetNames = useCallback(() => {
    setNamesState(DEFAULT_NAMES);
    broadcastAndStore(DEFAULT_NAMES);
  }, [broadcastAndStore]);

  const value = useMemo(
    () => ({
      names,
      memberAName: names.memberA,
      memberBName: names.memberB,
      setMemberAName,
      setMemberBName,
      setNames,
      resetNames,
      isHydrated,
    }),
    [names, setMemberAName, setMemberBName, setNames, resetNames, isHydrated]
  );

  return <UserNamesContext.Provider value={value}>{children}</UserNamesContext.Provider>;
}

export function useUserNames(): UserNamesContextType {
  const context = useContext(UserNamesContext);
  if (!context) {
    throw new Error("useUserNames must be used within a UserNamesProvider");
  }
  return context;
}
