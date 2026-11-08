/**
 * Secure CLI bootstrap command to create the initial Administrator account.
 *
 * Usage:
 *   ADMIN_NAME="Dezaakir" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="StrongPassword!123" bun --cwd backend run create-admin
 *
 * Credentials are validated against the password policy, hashed with Argon2id,
 * and provisioned with TOTP MFA + single-use recovery codes. Never hardcode credentials.
 */
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { User } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";
import {
  buildOtpAuthUri,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashPassword,
} from "../utils/crypto.js";
import { emailSchema, passwordPolicySchema } from "../validators/auth.validator.js";

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

export async function bootstrapAdmin(input: { name: string; email: string; password: string }) {
  const email = emailSchema.parse(input.email);
  const password = passwordPolicySchema.parse(input.password);
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new Error("Admin name must be between 2 and 80 characters");
  }

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    throw new Error("An account with that email address already exists");
  }

  const passwordHash = await hashPassword(password);
  const totpSecret = generateTotpSecret();
  const secretEncrypted = encryptSecret(totpSecret);
  const { plain: recoveryCodes, hashes: recoveryCodeHashes } = generateRecoveryCodes(8);
  const otpauthUri = buildOtpAuthUri(email, totpSecret);

  const admin = await User.create({
    name,
    email,
    passwordHash,
    role: "ADMIN",
    emailVerified: true,
    status: "ACTIVE",
    mfa: {
      enabled: true,
      secretEncrypted,
      recoveryCodeHashes,
      enabledAt: new Date(),
    },
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.bootstrap",
    outcome: "SUCCESS",
    actor: admin._id,
    actorEmail: admin.email,
  });

  return {
    adminId: String(admin._id),
    email: admin.email,
    totpSecret,
    otpauthUri,
    recoveryCodes,
  };
}

async function main() {
  const name = parseArg("--name") ?? process.env.ADMIN_NAME ?? "";
  const email = parseArg("--email") ?? process.env.ADMIN_EMAIL ?? "";
  const password = parseArg("--password") ?? process.env.ADMIN_PASSWORD ?? "";

  if (!name || !email || !password) {
    console.error(
      "Usage: ADMIN_NAME=\"...\" ADMIN_EMAIL=\"...\" ADMIN_PASSWORD=\"...\" bun --cwd backend run create-admin",
    );
    process.exit(1);
  }

  await connectDatabase();
  try {
    const result = await bootstrapAdmin({ name, email, password });
    console.log("\n============================================================");
    console.log("  DEZAAKIR ADMINISTRATOR BOOTSTRAPPED SUCCESSFULLY");
    console.log("============================================================");
    console.log(`Admin ID     : ${result.adminId}`);
    console.log(`Email        : ${result.email}`);
    console.log(`TOTP Secret  : ${result.totpSecret}`);
    console.log(`OTPAuth URI  : ${result.otpauthUri}`);
    console.log("\nSingle-use MFA Recovery Codes (store offline, never commit):");
    for (const code of result.recoveryCodes) {
      console.log(`  - ${code}`);
    }
    console.log("============================================================\n");
  } finally {
    await disconnectDatabase();
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    console.error("Admin bootstrap failed:", err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  });
}
