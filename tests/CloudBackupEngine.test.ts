import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  performCloudBackup,
  verifySnapshotIntegrity,
  calculateSha256,
  TABLES,
} from "../scripts/cloud-backup.js";

describe("Cloud Backup & Snapshot Engine", () => {
  it("includes critical household_state table in backup schema", () => {
    expect(TABLES).toContain("household_state");
  });

  it("calculates deterministic SHA-256 checksum", () => {
    const dataA = { b: 2, a: 1 };
    const dataB = { a: 1, b: 2 };
    expect(calculateSha256(dataA)).toBe(calculateSha256(dataB));
  });

  it("creates a valid snapshot and verifies integrity", async () => {
    const tempDir = path.join(process.cwd(), "data", "test-backups");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      const res = await performCloudBackup({ outputDir: tempDir });
      expect(res.success).toBe(true);
      expect(res.checksum).toBeDefined();
      expect(fs.existsSync(res.filePath)).toBe(true);

      const fileContent = JSON.parse(fs.readFileSync(res.filePath, "utf8"));
      const verification = verifySnapshotIntegrity(fileContent);
      expect(verification.valid).toBe(true);
      expect(verification.calculated).toBe(res.checksum);
    } finally {
      // Clean up test dir
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("detects tampered snapshots as invalid", () => {
    const validSnapshot = {
      snapshot_id: "test-id",
      checksum_sha256: calculateSha256({ household_state: [{ id: 1 }] }),
      data: { household_state: [{ id: 1 }] },
    };

    const validResult = verifySnapshotIntegrity(validSnapshot);
    expect(validResult.valid).toBe(true);

    const tamperedSnapshot = {
      ...validSnapshot,
      data: { household_state: [{ id: 999 }] },
    };
    const tamperedResult = verifySnapshotIntegrity(tamperedSnapshot);
    expect(tamperedResult.valid).toBe(false);
  });
});
