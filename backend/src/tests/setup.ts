// Test-only configuration. Values are random/dummy and never used outside `bun test`.
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL ??= "http://localhost:3000";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/dezaakir_test";
process.env.SESSION_SECRET ??= "test-session-secret-0123456789-abcdefghijklmnop";
process.env.OTP_HMAC_SECRET ??= "test-otp-hmac-secret-0123456789-abcdefghijklmn";
process.env.MFA_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
