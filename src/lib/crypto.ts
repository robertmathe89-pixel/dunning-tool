import crypto from "crypto";

/**
 * Encrypt sensitive data using AES-256-GCM.
 * Requires STRIPE_ENCRYPTION_KEY env var (64 hex chars = 256-bit key).
 */
export function encryptData(plaintext: string): string {
  const key = process.env.STRIPE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("STRIPE_ENCRYPTION_KEY must be 64 hex chars (256-bit)");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    iv
  );

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Store as: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encryptData().
 */
export function decryptData(ciphertext: string): string {
  const key = process.env.STRIPE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("STRIPE_ENCRYPTION_KEY must be 64 hex chars (256-bit)");
  }

  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random 256-bit encryption key.
 * Run once and store in env vars.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
