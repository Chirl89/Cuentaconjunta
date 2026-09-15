"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { HouseholdRow, UserRow } from "@/types/database";

const AUTH_STORAGE_KEY = "fitduo_active_role";
const AUTH_CHANNEL_NAME = "fitduo_auth_sync";
const LOCAL_HOUSEHOLD_KEY = "fitduo_local_household";

export type ActiveRole = "memberA" | "memberB";

export interface CoupleHousehold {
  id: string;
  name: string;
  memberAName: string;
  memberBName: string;
  inviteCode: string;
  memberAId: string | null;
  memberBId: string | null;
  isPartnerLinked: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserRow | null;
  household: CoupleHousehold;
  activeRole: ActiveRole;
  isDemoMode: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    inviteCode?: string
  ) => Promise<{ error?: string; message?: string }>;
  signInWithOtp: (email: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  switchActiveRole: (role: ActiveRole) => void;
  joinHouseholdByCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  updateHouseholdNames: (nameA: string, nameB: string) => Promise<void>;
  generateNewInviteCode: () => string;
}

const DEFAULT_HOUSEHOLD: CoupleHousehold = {
  id: "local-household-1",
  name: "Hogar Común",
  memberAName: "Carlos",
  memberBName: "Andrea",
  inviteCode: "FITDUO",
  memberAId: "user-carlos-1",
  memberBId: "user-andrea-2",
  isPartnerLinked: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [household, setHousehold] = useState<CoupleHousehold>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_HOUSEHOLD_KEY);
        if (saved) {
          return { ...DEFAULT_HOUSEHOLD, ...JSON.parse(saved) };
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_HOUSEHOLD;
  });

  const [activeRole, setActiveRole] = useState<ActiveRole>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved === "memberA" || saved === "memberB") return saved;
      } catch {
        // Ignore
      }
    }
    return "memberA";
  });

  const [isLoading, setIsLoading] = useState(true);
  const isDemoMode = !user;

  // Persist and broadcast role changes
  const switchActiveRole = useCallback((role: ActiveRole) => {
    setActiveRole(role);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, role);
        if (window.BroadcastChannel) {
          const bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
          bc.postMessage({ type: "ROLE_CHANGE", role });
          bc.close();
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  // Listen for multi-tab role or household updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
      bc.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "ROLE_CHANGE" && event.data.role) {
          setActiveRole(event.data.role);
        } else if (event.data?.type === "HOUSEHOLD_CHANGE" && event.data.household) {
          setHousehold(event.data.household);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY && (e.newValue === "memberA" || e.newValue === "memberB")) {
        setActiveRole(e.newValue);
      } else if (e.key === LOCAL_HOUSEHOLD_KEY && e.newValue) {
        try {
          setHousehold(JSON.parse(e.newValue));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Helper to persist household changes locally and broadcast
  const saveHouseholdLocally = useCallback((updated: CoupleHousehold) => {
    setHousehold(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_HOUSEHOLD_KEY, JSON.stringify(updated));
        if (window.BroadcastChannel) {
          const bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
          bc.postMessage({ type: "HOUSEHOLD_CHANGE", household: updated });
          bc.close();
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  // Fetch Supabase Profile and Household
  const fetchCloudProfileAndHousehold = useCallback(
    async (supabaseUser: User) => {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data: userProfileRaw, error: profileErr } = await supabase
          .from("users")
          .select("*")
          .eq("id", supabaseUser.id)
          .maybeSingle();

        if (profileErr) {
          console.warn("Error fetching Supabase user profile:", profileErr);
          return;
        }

        const userProfile = userProfileRaw as UserRow | null;

        if (userProfile) {
          setProfile(userProfile);

          if (userProfile.role_in_household === "MEMBER_B") {
            setActiveRole("memberB");
          } else {
            setActiveRole("memberA");
          }

          if (userProfile.household_id) {
            const { data: householdDataRaw, error: houseErr } = await supabase
              .from("households")
              .select("*")
              .eq("id", userProfile.household_id)
              .maybeSingle();

            const householdData = householdDataRaw as HouseholdRow | null;

            if (!houseErr && householdData) {
              const updatedHousehold: CoupleHousehold = {
                id: householdData.id,
                name: householdData.name,
                memberAName: householdData.member_a_name,
                memberBName: householdData.member_b_name,
                inviteCode: householdData.invite_code,
                memberAId: householdData.member_a_id,
                memberBId: householdData.member_b_id,
                isPartnerLinked: Boolean(householdData.member_a_id && householdData.member_b_id),
              };
              saveHouseholdLocally(updatedHousehold);
            }
          }
        }
      } catch (err) {
        console.warn("Supabase fetch failed, running in local resilience mode:", err);
      }
    },
    [saveHouseholdLocally]
  );

  // Initialize Supabase Auth state & Realtime subscriptions
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    // Check existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          fetchCloudProfileAndHousehold(currentSession.user);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // Listen to Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchCloudProfileAndHousehold(newSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchCloudProfileAndHousehold]);

  // Realtime subscription for household changes
  useEffect(() => {
    if (!household.id || household.id.startsWith("local-")) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`household:${household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "households",
          filter: `id=eq.${household.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const h = payload.new as HouseholdRow;
            setHousehold((prev) => {
              const updated: CoupleHousehold = {
                ...prev,
                name: h.name,
                memberAName: h.member_a_name,
                memberBName: h.member_b_name,
                inviteCode: h.invite_code,
                memberAId: h.member_a_id,
                memberBId: h.member_b_id,
                isPartnerLinked: Boolean(h.member_a_id && h.member_b_id),
              };
              saveHouseholdLocally(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household.id, saveHouseholdLocally]);

  // Auth Operations
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string, inviteCode?: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            invite_code: inviteCode?.trim()?.toUpperCase() || null,
          },
        },
      });
      if (error) return { error: error.message };
      return { message: "Registro completado. Por favor, verifica tu correo si está habilitado." };
    },
    []
  );

  const signInWithOtp = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { error: error.message };
    return { message: "Enlace de acceso mágico enviado a tu correo electrónico." };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  // Household Joining & Invite Code
  const joinHouseholdByCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed || trimmed.length < 4) {
        return { success: false, error: "El código debe tener al menos 4 caracteres." };
      }

      // If connected to Supabase
      if (user) {
        const supabase = getSupabaseBrowserClient();
        const { data: targetHouseholdRaw, error: searchErr } = await supabase
          .from("households")
          .select("*")
          .eq("invite_code", trimmed)
          .maybeSingle();

        const targetHousehold = targetHouseholdRaw as HouseholdRow | null;

        if (searchErr || !targetHousehold) {
          return {
            success: false,
            error: "No se ha encontrado ningún hogar con ese código de invitación.",
          };
        }

        // Link current user as member B (or A if empty)
        const isBEmpty = !targetHousehold.member_b_id;
        const targetRole = isBEmpty ? "MEMBER_B" : "MEMBER_A";
        const userName = profile?.display_name || user.email?.split("@")[0] || "Usuario";

        if (isBEmpty) {
          await (supabase.from("households") as any)
            .update({ member_b_id: user.id, member_b_name: userName })
            .eq("id", targetHousehold.id);
        } else {
          await (supabase.from("households") as any)
            .update({ member_a_id: user.id, member_a_name: userName })
            .eq("id", targetHousehold.id);
        }

        await (supabase.from("users") as any)
          .update({
            household_id: targetHousehold.id,
            role_in_household: targetRole,
          })
          .eq("id", user.id);

        await fetchCloudProfileAndHousehold(user);
        return { success: true };
      }

      // Local / Offline mode simulation
      const updated: CoupleHousehold = {
        ...household,
        inviteCode: trimmed,
        isPartnerLinked: true,
      };
      saveHouseholdLocally(updated);
      return { success: true };
    },
    [user, profile, fetchCloudProfileAndHousehold, household, saveHouseholdLocally]
  );

  const generateNewInviteCode = useCallback((): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const updated: CoupleHousehold = {
      ...household,
      inviteCode: result,
    };
    saveHouseholdLocally(updated);

    if (user && household.id && !household.id.startsWith("local-")) {
      const supabase = getSupabaseBrowserClient();
      (supabase.from("households") as any)
        .update({ invite_code: result })
        .eq("id", household.id)
        .then(() => {});
    }
    return result;
  }, [household, saveHouseholdLocally, user]);

  const updateHouseholdNames = useCallback(
    async (nameA: string, nameB: string) => {
      const updated: CoupleHousehold = {
        ...household,
        memberAName: nameA.trim() || household.memberAName,
        memberBName: nameB.trim() || household.memberBName,
      };
      saveHouseholdLocally(updated);

      if (user && household.id && !household.id.startsWith("local-")) {
        const supabase = getSupabaseBrowserClient();
        await (supabase.from("households") as any)
          .update({
            member_a_name: updated.memberAName,
            member_b_name: updated.memberBName,
          })
          .eq("id", household.id);
      }
    },
    [household, saveHouseholdLocally, user]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      household,
      activeRole,
      isDemoMode,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithOtp,
      signOut,
      switchActiveRole,
      joinHouseholdByCode,
      updateHouseholdNames,
      generateNewInviteCode,
    }),
    [
      user,
      session,
      profile,
      household,
      activeRole,
      isDemoMode,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithOtp,
      signOut,
      switchActiveRole,
      joinHouseholdByCode,
      updateHouseholdNames,
      generateNewInviteCode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) || null;
}
