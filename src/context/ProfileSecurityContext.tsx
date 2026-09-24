"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ProfileRole, getUnlockedProfile, setUnlockedProfile } from "@/lib/security/profilePin";
import { useOptionalAuth } from "@/context/AuthContext";
import { ProfilePinModal } from "@/components/ProfilePinModal";

interface ProfileSecurityContextType {
  unlockedRole: ProfileRole | null;
  isUnlocked: boolean;
  requestSwitchProfile: (targetRole: ProfileRole) => void;
  openChangePinModal: () => void;
  lockProfile: () => void;
}

const ProfileSecurityContext = createContext<ProfileSecurityContextType | undefined>(undefined);

export function ProfileSecurityProvider({ children }: { children: React.ReactNode }) {
  const auth = useOptionalAuth();
  const [unlockedRole, setUnlockedRoleState] = useState<ProfileRole | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "login" | "switch" | "change_pin";
    targetRole: ProfileRole;
    canCancel: boolean;
  }>({
    isOpen: false,
    mode: "login",
    targetRole: "memberA",
    canCancel: false,
  });

  // Check stored unlocked profile on mount
  useEffect(() => {
    const stored = getUnlockedProfile();
    if (stored) {
      setUnlockedRoleState(stored);
      if (auth && auth.activeRole !== stored) {
        auth.switchActiveRole(stored);
      }
    } else {
      // First login / locked: show modal
      setModalState({
        isOpen: true,
        mode: "login",
        targetRole: (auth?.activeRole as ProfileRole) || "memberA",
        canCancel: false,
      });
    }
    setIsInitialized(true);
  }, []);

  const requestSwitchProfile = useCallback((targetRole: ProfileRole) => {
    setModalState({
      isOpen: true,
      mode: "switch",
      targetRole,
      canCancel: true,
    });
  }, []);

  const openChangePinModal = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "change_pin",
      targetRole: unlockedRole || (auth?.activeRole as ProfileRole) || "memberA",
      canCancel: true,
    });
  }, [unlockedRole, auth?.activeRole]);

  const lockProfile = useCallback(() => {
    setUnlockedProfile(null);
    setUnlockedRoleState(null);
    setModalState({
      isOpen: true,
      mode: "login",
      targetRole: (auth?.activeRole as ProfileRole) || "memberA",
      canCancel: false,
    });
  }, [auth?.activeRole]);

  const handleModalSuccess = (role: ProfileRole) => {
    if (modalState.mode === "login" || modalState.mode === "switch") {
      setUnlockedRoleState(role);
      setUnlockedProfile(role);
      if (auth && auth.activeRole !== role) {
        auth.switchActiveRole(role);
      }
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleModalClose = () => {
    if (modalState.canCancel) {
      setModalState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <ProfileSecurityContext.Provider
      value={{
        unlockedRole,
        isUnlocked: !!unlockedRole,
        requestSwitchProfile,
        openChangePinModal,
        lockProfile,
      }}
    >
      {children}
      <ProfilePinModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        targetRole={modalState.targetRole}
        canCancel={modalState.canCancel}
        onSuccess={handleModalSuccess}
        onClose={handleModalClose}
      />
    </ProfileSecurityContext.Provider>
  );
}

const DEFAULT_PROFILE_SECURITY: ProfileSecurityContextType = {
  unlockedRole: "memberA",
  isUnlocked: true,
  requestSwitchProfile: () => {},
  openChangePinModal: () => {},
  lockProfile: () => {},
};

export function useProfileSecurity() {
  const context = useContext(ProfileSecurityContext);
  return context || DEFAULT_PROFILE_SECURITY;
}
