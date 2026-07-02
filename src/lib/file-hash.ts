import crypto from "crypto";

/** SHA-256 hash of file bytes, used to detect identical uploads across users/companies. */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
