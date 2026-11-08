/**
 * Local CLI helper for Administrator TOTP MFA setup & verification.
 *
 * Usage:
 *   bun --cwd backend run mfa-code [email]
 *
 * If the admin account does not have a TOTP secret yet, it provisions one.
 * Prints the Base32 secret (for Google Authenticator / Authy / 1Password)
 * AND the current valid 6-digit TOTP code so you can verify immediately.
 */
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { User } from "../models/index.js";
import {
  buildOtpAuthUri,
  decryptSecret,
  encryptSecret,
  generateTotpCode,
  generateTotpSecret,
} from "../utils/crypto.js";

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  await connectDatabase();
  try {
    const query = emailArg ? { email: emailArg } : { role: "ADMIN" };
    const user = await User.findOne(query).select("+mfa.secretEncrypted");

    if (!user) {
      console.error("No matching user found.");
      process.exit(1);
    }

    let secret: string;
    if (user.mfa?.secretEncrypted) {
      secret = decryptSecret(user.mfa.secretEncrypted);
    } else {
      secret = generateTotpSecret();
      user.mfa = {
        enabled: false,
        secretEncrypted: encryptSecret(secret),
        recoveryCodeHashes: [],
      };
      await user.save();
    }

    const code = generateTotpCode(secret);
    const otpauthUri = buildOtpAuthUri(user.email, secret);
    const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

    console.log("\n============================================================");
    console.log("  DEZAAKIR TOTP AUTHENTICATOR HELPER");
    console.log("============================================================");
    console.log(`Account Email       : ${user.email} (${user.role})`);
    console.log(`MFA Enabled Status  : ${user.mfa?.enabled ? "ENABLED" : "PENDING VERIFICATION"}`);
    console.log(`Base32 Secret Key   : ${secret}`);
    console.log(`OTPAuth URI         : ${otpauthUri}`);
    console.log("------------------------------------------------------------");
    console.log(`Current 6-Digit Code: ${code}  (valid for ~${secondsRemaining}s)`);
    console.log("============================================================\n");
  } finally {
    await disconnectDatabase();
  }
}

void main();
