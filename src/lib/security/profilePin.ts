/**
 * Profile PIN security management for Carlos and Andrea
 * Default PINs:
 * - Carlos (memberA): 608137
 * - Andrea (memberB): 050994
 */

export type ProfileRole = "memberA" | "memberB";

export const DEFAULT_PINS: Record<ProfileRole, string> = {
  memberA: "608137", // Carlos
  memberB: "050994", // Andrea
};

const PIN_STORAGE_PREFIX = "cuentaconjunta_pin_";
const UNLOCKED_PROFILE_KEY = "cuentaconjunta_unlocked_profile";

export function getProfilePin(role: ProfileRole): string {
  if (typeof window === "undefined") return DEFAULT_PINS[role];
  try {
    const stored = localStorage.getItem(`${PIN_STORAGE_PREFIX}${role}`);
    if (stored && /^\d{6}$/.test(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_PINS[role];
}

export function setProfilePin(role: ProfileRole, newPin: string): boolean {
  if (!/^\d{6}$/.test(newPin)) return false;
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(`${PIN_STORAGE_PREFIX}${role}`, newPin);
    return true;
  } catch {
    return false;
  }
}

export function verifyProfilePin(role: ProfileRole, pinAttempt: string): boolean {
  const currentPin = getProfilePin(role);
  return currentPin === pinAttempt.trim();
}

export function getUnlockedProfile(): ProfileRole | null {
  if (typeof window === "undefined") return null;
  try {
    const role = localStorage.getItem(UNLOCKED_PROFILE_KEY);
    if (role === "memberA" || role === "memberB") {
      return role;
    }
  } catch {
    // Ignore
  }
  return null;
}

export function setUnlockedProfile(role: ProfileRole | null): void {
  if (typeof window === "undefined") return;
  try {
    if (role) {
      localStorage.setItem(UNLOCKED_PROFILE_KEY, role);
    } else {
      localStorage.removeItem(UNLOCKED_PROFILE_KEY);
    }
  } catch {
    // Ignore
  }
}

export function changeProfilePin(
  role: ProfileRole,
  currentPin: string,
  newPin: string
): { success: boolean; error?: string } {
  if (!verifyProfilePin(role, currentPin)) {
    return { success: false, error: "El PIN actual introducido no es correcto." };
  }
  if (!/^\d{6}$/.test(newPin)) {
    return { success: false, error: "El nuevo PIN debe contener exactamente 6 dígitos numéricos." };
  }
  if (currentPin === newPin) {
    return { success: false, error: "El nuevo PIN no puede ser idéntico al PIN actual." };
  }
  const saved = setProfilePin(role, newPin);
  if (!saved) {
    return { success: false, error: "Error al guardar el nuevo PIN en el almacenamiento." };
  }
  return { success: true };
}
