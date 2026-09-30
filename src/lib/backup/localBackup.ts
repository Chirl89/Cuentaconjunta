/**
 * Local JSON Backup & Restore Engine
 * Proporciona exportación e importación de copias de seguridad locales
 * completas en formato JSON estructurado con verificación criptográfica SHA-256.
 */

import versionData from "../../../version.json";
import type { Transaction, BankAccount, CategoryInfo, AssignmentRule, CategoryLearningItem } from "@/context/TransactionsContext";

export interface BackupDataContent {
  transactions: Transaction[];
  accounts: BankAccount[];
  rules: AssignmentRule[];
  learnings: CategoryLearningItem[];
  categories: CategoryInfo[];
  settlements: Record<string, any>;
  userNames?: {
    memberA: string;
    memberB: string;
  };
}

export interface BackupMetadata {
  app: "Sygis";
  version: string;
  schemaVersion: 1;
  exportedAt: string;
  totalTransactions: number;
  totalAccounts: number;
  totalRules: number;
  totalLearnings: number;
  totalCategories: number;
  memberA?: string;
  memberB?: string;
}

export interface LocalBackupPayload {
  app: "Sygis";
  version: string;
  schemaVersion: 1;
  exportedAt: string;
  metadata: BackupMetadata;
  data: BackupDataContent;
  checksum: string;
}

/**
 * Serializa de forma canónica y determinista cualquier estructura JSON
 * ordenando las claves de los objetos alfabéticamente.
 */
export function canonicalJsonString(obj: any): string {
  if (obj === null || obj === undefined) {
    return "null";
  }
  if (typeof obj === "bigint") {
    return obj.toString();
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonString).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonString(obj[k])).join(",") + "}";
}

/**
 * Implementación pura en TypeScript del algoritmo FIPS 180-4 SHA-256.
 * Funciona de forma idéntica y sincrónica tanto en Node.js (Vitest)
 * como en cualquier navegador (Chrome, Edge, iOS Safari).
 */
export function sha256Hex(str: string): string {
  // Si estamos en entorno Node.js, usar módulo crypto nativo por velocidad óptima
  if (typeof process !== "undefined" && process?.versions?.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require("crypto");
      return nodeCrypto.createHash("sha256").update(str, "utf8").digest("hex");
    } catch {
      // fallback a implementación pura JS
    }
  }

  // Implementación pura JS SHA-256
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  // UTF-8 encoding
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }

  for (let i = 7; i >= 0; i--) {
    utf8.push((bitLength >>> (i * 8)) & 0xff);
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let chunk = 0; chunk < utf8.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] =
        (utf8[chunk + i * 4] << 24) |
        (utf8[chunk + i * 4 + 1] << 16) |
        (utf8[chunk + i * 4 + 2] << 8) |
        utf8[chunk + i * 4 + 3];
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

/**
 * Calcula el hash SHA-256 canónico del bloque de datos.
 */
export function calculateBackupChecksum(data: BackupDataContent): string {
  const canonicalStr = canonicalJsonString(data);
  return sha256Hex(canonicalStr);
}

/**
 * Genera la estructura completa de copia de seguridad lista para exportar.
 */
export function createLocalBackup(params: {
  transactions: Transaction[];
  accounts: BankAccount[];
  rules: AssignmentRule[];
  learnings: CategoryLearningItem[];
  categories: CategoryInfo[];
  settlements?: Record<string, any>;
  userNames?: { memberA: string; memberB: string };
  version?: string;
}): LocalBackupPayload {
  const currentVersion = params.version || versionData.version || "0.13.1";
  const now = new Date().toISOString();

  const data: BackupDataContent = {
    transactions: params.transactions || [],
    accounts: params.accounts || [],
    rules: params.rules || [],
    learnings: params.learnings || [],
    categories: params.categories || [],
    settlements: params.settlements || {},
    userNames: params.userNames,
  };

  const checksum = calculateBackupChecksum(data);

  const metadata: BackupMetadata = {
    app: "Sygis",
    version: currentVersion,
    schemaVersion: 1,
    exportedAt: now,
    totalTransactions: data.transactions.length,
    totalAccounts: data.accounts.length,
    totalRules: data.rules.length,
    totalLearnings: data.learnings.length,
    totalCategories: data.categories.length,
    memberA: params.userNames?.memberA,
    memberB: params.userNames?.memberB,
  };

  return {
    app: "Sygis",
    version: currentVersion,
    schemaVersion: 1,
    exportedAt: now,
    metadata,
    data,
    checksum,
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  payload?: LocalBackupPayload;
  warning?: string;
}

/**
 * Valida un JSON o string de copia de seguridad comprobando esquema e integridad SHA-256.
 */
export function validateLocalBackup(rawInput: string | unknown): ValidationResult {
  let parsed: any;
  if (typeof rawInput === "string") {
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      return { valid: false, error: "El archivo no contiene un JSON válido." };
    }
  } else {
    parsed = rawInput;
  }

  if (!parsed || typeof parsed !== "object") {
    return { valid: false, error: "Estructura de copia de seguridad no válida (se esperaba objeto)." };
  }

  // Comprobar app identificadora
  const appName = (parsed.app || "").toString().toLowerCase();
  if (appName !== "sygis" && appName !== "fitduo" && appName !== "cuentaconjunta") {
    return {
      valid: false,
      error: `Origen no reconocido (${parsed.app || "desconocido"}). El archivo debe ser una copia oficial de Sygis.`,
    };
  }

  if (!parsed.data || typeof parsed.data !== "object") {
    return { valid: false, error: "Falta el bloque principal 'data' con los registros a restaurar." };
  }

  if (!Array.isArray(parsed.data.transactions)) {
    return { valid: false, error: "El bloque 'data.transactions' debe ser una lista de movimientos." };
  }

  if (!Array.isArray(parsed.data.accounts)) {
    return { valid: false, error: "El bloque 'data.accounts' debe ser una lista de cuentas bancarias." };
  }

  if (!Array.isArray(parsed.data.rules)) {
    return { valid: false, error: "El bloque 'data.rules' debe ser una lista de reglas." };
  }

  if (!Array.isArray(parsed.data.learnings)) {
    return { valid: false, error: "El bloque 'data.learnings' debe ser una lista de aprendizajes IA." };
  }

  // Verificación de integridad SHA-256
  if (parsed.checksum) {
    const computedChecksum = calculateBackupChecksum(parsed.data);
    if (computedChecksum.toLowerCase() !== String(parsed.checksum).toLowerCase()) {
      return {
        valid: false,
        error: "Fallo de integridad criptográfica (SHA-256). El archivo ha sido modificado externamente o está corrupto.",
      };
    }
  }

  return {
    valid: true,
    payload: parsed as LocalBackupPayload,
  };
}

/**
 * Dispara la descarga del archivo JSON en el navegador del usuario.
 */
export function triggerBackupDownload(payload: LocalBackupPayload, customFileName?: string): string {
  if (typeof window === "undefined" || !window.document) {
    return "";
  }

  const dateStr = new Date(payload.exportedAt || Date.now())
    .toISOString()
    .slice(0, 16)
    .replace("T", "_")
    .replace(":", "-");

  const fileName = customFileName || `sygis_backup_${dateStr}_v${payload.version || "0.13.1"}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);

  let url = "";
  let isObjectUrl = false;
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
    url = URL.createObjectURL(blob);
    isObjectUrl = true;
  } else {
    url = "data:application/json;charset=utf-8," + encodeURIComponent(jsonContent);
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (isObjectUrl && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }

  return fileName;
}
