/**
 * AES-GCM secret helpers used to protect persisted NewsPub destination credentials.
 */

import crypto from "node:crypto";

import { env } from "@/lib/env/server";

function createEncryptionKey(secret = env.destinations.encryptionKey) {
  return crypto.createHash("sha256").update(secret).digest();
}
/**
 * Encrypts a secret value before NewsPub persists it to the database.
 */

export function encryptSecretValue(value, secret) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    return {
      ciphertext: null,
      iv: null,
      tag: null,
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", createEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(normalizedValue, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
  };
}
/**
 * Decrypts a secret value previously persisted by NewsPub.
 */

export function decryptSecretValue(input, secret) {
  if (!input?.ciphertext || !input?.iv || !input?.tag) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    createEncryptionKey(secret),
    Buffer.from(input.iv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(input.tag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
