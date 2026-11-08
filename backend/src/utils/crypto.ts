import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env, isTest } from "../config/env.js";

/**
 * Argon2id parameters (OWASP recommended minimum: m=19456..65536, t=2, p=1).
 * In tests we use a lighter memory cost so the suite stays fast while still
 * exercising real Argon2id hashing and verification.
 */
const ARGON_OPTIONS = {
  algorithm: "argon2id" as const,
  memoryCost: isTest ? 19456 : 65536,
  timeCost: 2,
};

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    return false;
  }
}

let cachedDummyHash: string | null = null;

/**
 * Verifies against a real Argon2id hash when a user record does not exist,
 * preventing timing side-channels from disclosing whether an email is registered.
 */
export async function verifyDummyPassword(password: string): Promise<void> {
  if (!cachedDummyHash) {
    cachedDummyHash = await hashPassword("dummy-password-for-constant-time-login");
  }
  await verifyPassword(password, cachedDummyHash);
}

/** Cryptographically secure 6-digit numeric OTP (000000–999999). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Keyed HMAC-SHA256 bound to the user id so OTP hashes are domain-separated per user. */
export function hashOtp(userId: string, code: string): string {
  return createHmac("sha256", env.OTP_HMAC_SECRET).update(`otp:${userId}:${code}`).digest("hex");
}

/** High-entropy URL-safe random token (default 256 bits). */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export type TokenPurpose = "session" | "csrf" | "password-reset" | "mfa-recovery" | "ip";

/** Domain-separated HMAC-SHA256 for session tokens, CSRF tokens, reset tokens, and recovery codes. */
export function hashToken(token: string, purpose: TokenPurpose): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`${purpose}:${token}`).digest("hex");
}

/** Constant-time string comparison for fixed-length hex/ASCII digests. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ── AES-256-GCM encryption for TOTP secrets at rest ─────────────────────────

const MFA_KEY = Buffer.from(env.MFA_ENCRYPTION_KEY, "base64");

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", MFA_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted payload");
  const iv = Buffer.from(parts[0]!, "base64");
  const tag = Buffer.from(parts[1]!, "base64");
  const ciphertext = Buffer.from(parts[2]!, "base64");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid IV or auth tag length");
  const decipher = createDecipheriv("aes-256-gcm", MFA_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── RFC 6238 TOTP (SHA-1, 6 digits, 30s period) & Base32 (RFC 4648) ─────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid Base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generates a 160-bit (20-byte) Base32 TOTP secret per RFC 4226 / RFC 6238. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildOtpAuthUri(email: string, secret: string, issuer = "Dezaakir"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function generateTotpCode(secret: string, timestampMs: number = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

/** Verifies a 6-digit TOTP code with ±window (default ±1 step = ±30s) tolerance. */
export function verifyTotpCode(secret: string, code: string, window = 1, timestampMs: number = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  for (let offset = -window; offset <= window; offset++) {
    const candidate = generateTotpCode(secret, timestampMs + offset * 30_000);
    if (safeEqual(candidate, code)) return true;
  }
  return false;
}

/** Generates human-friendly single-use recovery codes (e.g. "ABCD-EFGH"). */
export function generateRecoveryCodes(count = 8): { plain: string[]; hashes: string[] } {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    let part1 = "";
    let part2 = "";
    for (let j = 0; j < 4; j++) part1 += chars[randomInt(0, chars.length)];
    for (let j = 0; j < 4; j++) part2 += chars[randomInt(0, chars.length)];
    const formatted = `${part1}-${part2}`;
    plain.push(formatted);
    hashes.push(hashRecoveryCode(formatted));
  }
  return { plain, hashes };
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return hashToken(normalized, "mfa-recovery");
}
