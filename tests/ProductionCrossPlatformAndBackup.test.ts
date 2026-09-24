import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Paso 11: Despliegue en Producción, Verificación Cross-Platform, Cron Jobs y Respaldo Continuo", () => {
  const rootDir = path.resolve(__dirname, "..");

  describe("1. Vercel Configuration & Cron Jobs (vercel.json)", () => {
    const vercelConfigPath = path.join(rootDir, "vercel.json");

    it("exists and is valid JSON", () => {
      expect(fs.existsSync(vercelConfigPath)).toBe(true);
      const raw = fs.readFileSync(vercelConfigPath, "utf8");
      const config = JSON.parse(raw);
      expect(config).toBeDefined();
    });

    it("configures Vercel Cron jobs for twice-daily bank sync (madrugada y mediodía)", () => {
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));
      expect(config.crons).toBeDefined();
      expect(Array.isArray(config.crons)).toBe(true);
      expect(config.crons.length).toBeGreaterThanOrEqual(2);

      const paths = config.crons.map((c: any) => c.path);
      expect(paths).toContain("/api/bank/sync");

      const schedules = config.crons.map((c: any) => c.schedule);
      expect(schedules).toContain("0 3 * * *");
      expect(schedules).toContain("0 14 * * *");
    });

    it("configures essential security and cache-control headers", () => {
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));
      expect(config.headers).toBeDefined();

      const globalHeader = config.headers.find((h: any) => h.source === "/(.*)");
      expect(globalHeader).toBeDefined();
      const headerKeys = globalHeader.headers.map((h: any) => h.key);
      expect(headerKeys).toContain("X-Content-Type-Options");
      expect(headerKeys).toContain("X-Frame-Options");
      expect(headerKeys).toContain("X-XSS-Protection");

      const versionHeader = config.headers.find((h: any) => h.source === "/version.json");
      expect(versionHeader).toBeDefined();
      const versionCacheControl = versionHeader.headers.find((h: any) => h.key === "Cache-Control");
      expect(versionCacheControl.value).toContain("no-cache");
    });
  });

  describe("2. Continuous Cloud Backup & Snapshot Engine (scripts/cloud-backup.js)", () => {
    const backupScript = require("../scripts/cloud-backup.js");

    it("exports calculation, backup and verification utilities", () => {
      expect(typeof backupScript.performCloudBackup).toBe("function");
      expect(typeof backupScript.verifySnapshotIntegrity).toBe("function");
      expect(typeof backupScript.calculateSha256).toBe("function");
      expect(Array.isArray(backupScript.TABLES)).toBe(true);
      expect(backupScript.TABLES).toContain("transactions");
      expect(backupScript.TABLES).toContain("households");
      expect(backupScript.TABLES).toContain("settlements");
    });

    it("verifies snapshot integrity and detects tampering via SHA-256", () => {
      const mockData = {
        households: [{ id: "h1", name: "FitDuo" }],
        transactions: [{ id: "t1", amount: -45.5, description: "Mercadona" }],
      };
      const checksum = backupScript.calculateSha256(mockData);

      const validSnapshot = {
        snapshot_id: "test-uuid-1",
        data: mockData,
        checksum_sha256: checksum,
      };

      const verification = backupScript.verifySnapshotIntegrity(validSnapshot);
      expect(verification.valid).toBe(true);
      expect(verification.calculated).toBe(checksum);

      // Tampered snapshot
      const tamperedSnapshot = {
        snapshot_id: "test-uuid-2",
        data: {
          ...mockData,
          transactions: [{ id: "t1", amount: -1000.0, description: "Mercadona Tampered" }],
        },
        checksum_sha256: checksum,
      };

      const tamperedVerification = backupScript.verifySnapshotIntegrity(tamperedSnapshot);
      expect(tamperedVerification.valid).toBe(false);
      expect(tamperedVerification.reason).toContain("no coincide");
    });
  });

  describe("3. Nightly Cloud Backup Workflow (.github/workflows/cloud-backup.yml)", () => {
    const workflowPath = path.join(rootDir, ".github", "workflows", "cloud-backup.yml");

    it("exists and is scheduled nocturnally at 02:00 UTC", () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
      const content = fs.readFileSync(workflowPath, "utf8");
      expect(content).toContain("0 2 * * *");
      expect(content).toContain("scripts/cloud-backup.js");
      expect(content).toContain("--verify");
      expect(content).toContain("retention-days: 90");
    });
  });

  describe("4. PITR Policy & Cloud Architecture (supabase/PITR_AND_BACKUP_POLICY.md)", () => {
    const policyPath = path.join(rootDir, "supabase", "PITR_AND_BACKUP_POLICY.md");

    it("exists and details multi-layer backup, PITR WAL, RPO, and RTO", () => {
      expect(fs.existsSync(policyPath)).toBe(true);
      const content = fs.readFileSync(policyPath, "utf8");
      expect(content).toContain("Point-in-Time Recovery");
      expect(content).toContain("Write-Ahead Logging");
      expect(content).toContain("RPO");
      expect(content).toContain("RTO");
      expect(content).toContain("SHA-256");
    });
  });

  describe("5. PWA Manifest & Cross-Platform Parity", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.json");

    it("contains valid PWA manifest with shortcuts and standalone display", () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      expect(manifest.display).toBe("standalone");
      expect(manifest.orientation).toBe("portrait");
      expect(manifest.icons.length).toBeGreaterThan(0);
      expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("6. End-User Walkthrough & Documentation (WALKTHROUGH.md)", () => {
    const walkthroughPath = path.join(rootDir, "WALKTHROUGH.md");

    it("provides complete step-by-step instructions for iOS, PC, PINs, and operations", () => {
      expect(fs.existsSync(walkthroughPath)).toBe(true);
      const content = fs.readFileSync(walkthroughPath, "utf8");
      expect(content).toContain("iOS");
      expect(content).toContain("Añadir a pantalla de inicio");
      expect(content).toContain("608137"); // Carlos PIN
      expect(content).toContain("050994"); // Andrea PIN
      expect(content).toContain("50/50");
      expect(content).toContain("Donut");
    });
  });
});
