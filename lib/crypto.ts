import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DEMO_COOKIE = "timeoff_demo";

function key(secret: string): Buffer {
  return scryptSync(secret, "timeoff-refresh-v1", 32);
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(payload: string, secret: string): string {
  const buffer = Buffer.from(payload, "base64url");
  if (buffer.length < 29) throw new Error("Stored Microsoft token is unreadable.");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function sealValue(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function openValue(sealed: string, secret: string): string | null {
  const index = sealed.lastIndexOf(".");
  if (index <= 0) return null;
  const value = sealed.slice(0, index);
  const mac = sealed.slice(index + 1);
  const expected = createHmac("sha256", secret).update(value).digest("base64url");
  const actualBuffer = Buffer.from(mac);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return value;
}

export { DEMO_COOKIE };
