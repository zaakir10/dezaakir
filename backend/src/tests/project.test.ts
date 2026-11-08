import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { resetRateLimits } from "../middleware/rateLimit.js";
import { bootstrapAdmin } from "../scripts/create-admin.js";
import { clearCapturedEmails, getCapturedEmails } from "../services/email.service.js";
import { generateTotpCode } from "../utils/crypto.js";
import { clearTestDatabase, startTestDatabase, stopTestDatabase } from "./helpers/db.js";

const app = createApp();

beforeAll(startTestDatabase, 300_000);
afterEach(async () => {
  resetRateLimits();
  clearCapturedEmails();
  await clearTestDatabase();
});
afterAll(stopTestDatabase);

// Minimal valid 1x1 PNG binary (67 bytes, starts with \x89PNG\r\n\x1a\n)
const VALID_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function registerRegularUser() {
  const credentials = {
    name: "Regular Visitor",
    email: "visitor@example.com",
    password: "VisitorStrongPassword!123",
    confirmPassword: "VisitorStrongPassword!123",
  };
  await request(app).post("/api/auth/register").send(credentials);
  const otp = getCapturedEmails()[0]!.meta?.codeOrToken!;
  await request(app).post("/api/auth/verify-email").send({ email: credentials.email, code: otp });
  const loginRes = await request(app).post("/api/auth/login").send({
    email: credentials.email,
    password: credentials.password,
  });
  return {
    cookie: loginRes.headers["set-cookie"]![0]!.split(";")[0]!,
    csrfToken: loginRes.body.data.csrfToken as string,
  };
}

async function loginAdmin() {
  const credentials = {
    name: "Dezaakir",
    email: "admin@dezaakir.com",
    password: "AdminStrongPassword!123",
  };
  const bootstrapped = await bootstrapAdmin(credentials);
  const totpCode = generateTotpCode(bootstrapped.totpSecret);
  const loginRes = await request(app).post("/api/auth/login").send({
    email: credentials.email,
    password: credentials.password,
    totpCode,
  });
  return {
    cookie: loginRes.headers["set-cookie"]![0]!.split(";")[0]!,
    csrfToken: loginRes.body.data.csrfToken as string,
  };
}

describe("Phase 7: Project Management & Secure Media Uploads", () => {
  it("rejects SVG, executable binaries, PHP/HTML polyglots, and MIME mismatches while accepting valid PNG magic bytes (Test Case #13)", async () => {
    const admin = await loginAdmin();

    // 1. Reject SVG masquerading as image/png
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const svgRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: svgBuffer.toString("base64"),
        claimedMimeType: "image/png",
        originalFilename: "malicious.svg",
      });
    expect(svgRes.status).toBe(400);
    expect(svgRes.body.error.code).toBe("INVALID_FILE_SIGNATURE");

    // 2. Reject Windows PE executable (MZ header)
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
    const exeRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: exeBuffer.toString("base64"),
        claimedMimeType: "image/png",
        originalFilename: "payload.exe",
      });
    expect(exeRes.status).toBe(400);

    // 3. Reject PNG with embedded <script> tag (polyglot XSS attempt)
    const pngBytes = Buffer.from(VALID_PNG_BASE64, "base64");
    const polyglotBytes = Buffer.concat([pngBytes, Buffer.from("<script>alert('xss')</script>")]);
    const polyglotRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: polyglotBytes.toString("base64"),
        claimedMimeType: "image/png",
        originalFilename: "polyglot.png",
      });
    expect(polyglotRes.status).toBe(400);
    expect(polyglotRes.body.error.code).toBe("UNSAFE_FILE_CONTENT");

    // 4. Reject valid PNG when claimedMimeType is image/jpeg (MIME mismatch)
    const mismatchRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: VALID_PNG_BASE64,
        claimedMimeType: "image/jpeg",
        originalFilename: "mismatch.jpg",
      });
    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.error.code).toBe("MIME_SIGNATURE_MISMATCH");

    // 5. Accept genuine PNG binary and register in Media collection
    const validRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: VALID_PNG_BASE64,
        claimedMimeType: "image/png",
        originalFilename: "architecture-diagram.png",
        folder: "dezaakir/projects",
        alt: "System Architecture Diagram",
        width: 1200,
        height: 630,
      });
    expect(validRes.status).toBe(201);
    expect(validRes.body.data.media.format).toBe("png");
    expect(validRes.body.data.media.folder).toBe("dezaakir/projects");
    expect(validRes.body.data.media.url).toMatch(/^https:\/\//);
  });

  it("rejects unauthorized project creation, update, and deletion (Test Case #14)", async () => {
    const payload = {
      title: "Unauthorized Project",
      summary: "Should not be created by unauthenticated or regular users.",
      description: "<p>Full description</p>",
      status: "PUBLISHED",
    };

    const unauth = await request(app).post("/api/projects").send(payload);
    expect(unauth.status).toBe(401);

    const visitor = await registerRegularUser();
    const forbidden = await request(app)
      .post("/api/projects")
      .set("Cookie", visitor.cookie)
      .set("X-CSRF-Token", visitor.csrfToken)
      .send(payload);
    expect(forbidden.status).toBe(403);
  });

  it("supports full admin project lifecycle, sanitizes HTML descriptions, hides drafts publicly, and protects in-use media", async () => {
    const admin = await loginAdmin();

    // 1. Upload a cover image
    const uploadRes = await request(app)
      .post("/api/admin/media/upload")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        fileBase64: VALID_PNG_BASE64,
        claimedMimeType: "image/png",
        originalFilename: "cover.png",
        folder: "dezaakir/projects",
        alt: "Project Cover",
      });
    expect(uploadRes.status).toBe(201);
    const media = uploadRes.body.data.media;

    // 2. Create a PROJECT category
    const catRes = await request(app)
      .post("/api/categories")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ name: "AI & Distributed Systems", type: "PROJECT" });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.category.id as string;

    // 3. Create a DRAFT project with XSS payload in description
    const createRes = await request(app)
      .post("/api/projects")
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        title: "Dezaakir Neural Inference Engine",
        summary: "Low-latency TypeScript & Rust inference gateway with deterministic routing.",
        description:
          '<h2>Architecture</h2><p>Built for zero-trust workloads.</p><script>window.pwned=true</script><img src="https://res.cloudinary.com/demo/image/upload/sample.png" onerror="alert(1)" />',
        coverImage: {
          url: media.url,
          publicId: media.publicId,
          alt: "Neural Inference Cover",
        },
        technologies: ["TypeScript", "Bun", "MongoDB"],
        githubUrl: "https://github.com/dezaakir/neural-inference",
        liveUrl: "https://dezaakir.com",
        category: categoryId,
        featured: true,
        status: "DRAFT",
      });
    expect(createRes.status).toBe(201);
    const project = createRes.body.data.project;
    expect(project.slug).toBe("dezaakir-neural-inference-engine");
    expect(project.description).not.toContain("<script>");
    expect(project.description).not.toContain("onerror");

    // 4. Draft project must NOT appear in public list or public slug detail
    const publicListDraft = await request(app).get("/api/projects");
    expect(publicListDraft.status).toBe(200);
    expect(publicListDraft.body.data.projects).toHaveLength(0);

    const publicSlugDraft = await request(app).get(`/api/projects/${project.slug}`);
    expect(publicSlugDraft.status).toBe(404);

    // 5. Attempting to delete media referenced by the project is blocked with 409 CONFLICT
    const deleteInUseMedia = await request(app)
      .delete(`/api/admin/media/${media.id}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(deleteInUseMedia.status).toBe(409);
    expect(deleteInUseMedia.body.error.code).toBe("CONFLICT");

    // 6. Publish the project via PUT /api/projects/:id
    const publishRes = await request(app)
      .put(`/api/projects/${project._id}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ status: "PUBLISHED" });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.project.status).toBe("PUBLISHED");

    // 7. Public list & slug route now return the published project
    const publicListPub = await request(app).get("/api/projects?featured=true");
    expect(publicListPub.status).toBe(200);
    expect(publicListPub.body.data.projects).toHaveLength(1);
    expect(publicListPub.body.data.projects[0].title).toBe("Dezaakir Neural Inference Engine");

    const publicSlugPub = await request(app).get(`/api/projects/${project.slug}`);
    expect(publicSlugPub.status).toBe(200);
    expect(publicSlugPub.body.data.project.githubUrl).toBe("https://github.com/dezaakir/neural-inference");

    // 8. Delete the project, then verify the media asset can now be deleted
    const delProj = await request(app)
      .delete(`/api/projects/${project._id}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(delProj.status).toBe(200);

    const delMediaAfter = await request(app)
      .delete(`/api/admin/media/${media.id}`)
      .set("Cookie", admin.cookie)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(delMediaAfter.status).toBe(200);
    expect(delMediaAfter.body.data.deleted).toBe(true);
  });
});
