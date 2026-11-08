import { describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("App foundation", () => {
  it("GET /api/health returns a consistent success envelope", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("sets security headers and hides the framework", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers["permissions-policy"]).toContain("camera=()");
    expect(res.headers["x-request-id"]).toBeString();
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects disallowed HTTP methods", async () => {
    const res = await request(app).trace("/api/health");
    expect(res.status).toBe(405);
  });

  it("rejects malformed JSON without leaking internals", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
    expect(JSON.stringify(res.body)).not.toContain("SyntaxError");
  });

  it("rejects oversized bodies", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ data: "x".repeat(200_000) }));
    expect(res.status).toBe(413);
  });

  it("only allows CORS for the configured frontend origin", async () => {
    const good = await request(app).options("/api/health").set("Origin", "http://localhost:3000");
    expect(good.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(good.headers["access-control-allow-credentials"]).toBe("true");

    const bad = await request(app).options("/api/health").set("Origin", "https://evil.example");
    expect(bad.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });
});
