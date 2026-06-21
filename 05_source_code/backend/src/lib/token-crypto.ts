import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY ?? "local-dev-token-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(value: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(value: string): string {
  const [ivHex, encryptedHex] = value.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted token format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
