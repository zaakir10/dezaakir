import { createHash, randomBytes } from "node:crypto";
import type { Request } from "express";
import { env, isProduction, isTest } from "../config/env.js";
import { Blog, Media, Project } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import type { PaginationMeta } from "../utils/apiResponse.js";
import { verifyUploadedImage } from "../utils/fileValidation.js";
import { escapeRegex, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { sanitizePlainText } from "../utils/sanitizeHtml.js";
import { recordAudit } from "./audit.service.js";

const ALLOWED_FOLDERS = new Set(["dezaakir/blogs", "dezaakir/projects", "dezaakir/profile", "dezaakir/general"]);

export function assertAllowedFolder(folder: string): string {
  const clean = folder.trim().toLowerCase();
  if (!ALLOWED_FOLDERS.has(clean)) {
    throw AppError.badRequest("Disallowed upload folder");
  }
  return clean;
}

/**
 * Generates signed Cloudinary upload parameters (`signature`, `timestamp`, `publicId`, `folder`, `apiKey`, `cloudName`).
 * Never exposes `CLOUDINARY_API_SECRET` to the client.
 */
export function createSignedCloudinaryParams(folderInput = "dezaakir/general"): {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId: string;
  timestamp: number;
  signature: string;
} {
  const folder = assertAllowedFolder(folderInput);
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `img_${randomBytes(16).toString("hex")}`;

  const secret = env.CLOUDINARY_API_SECRET || (isTest ? "test-cloudinary-secret" : "");
  const cloudName = env.CLOUDINARY_CLOUD_NAME || (isTest ? "dezaakir-test" : "");
  const apiKey = env.CLOUDINARY_API_KEY || (isTest ? "test-cloudinary-key" : "");

  if (!secret || !cloudName || !apiKey) {
    if (isProduction) {
      throw new AppError(503, "MEDIA_UNCONFIGURED", "Cloudinary storage is not configured");
    }
  }

  // Cloudinary parameter string sorted alphabetically: folder, public_id, timestamp
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${secret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  return {
    cloudName,
    apiKey,
    folder,
    publicId,
    timestamp,
    signature,
  };
}

export interface UploadImageInput {
  /** Base64-encoded binary content (or data URI `data:image/png;base64,...`). */
  fileBase64: string;
  mimeType?: string;
  folder?: string;
  alt?: string;
  caption?: string;
}

/**
 * Validates the uploaded image's magic-byte signature, size, and polyglot safety on the server,
 * uploads it to Cloudinary using signed parameters (or stores a deterministic Cloudinary asset
 * reference in test/dev mode when Cloudinary credentials are not set), and registers a `Media` document.
 */
export async function uploadAndRegisterImage(
  input: UploadImageInput,
  uploadedByUserId: string,
  req?: Request,
): Promise<Record<string, unknown>> {
  const folder = assertAllowedFolder(input.folder ?? "dezaakir/general");

  let rawBase64 = input.fileBase64.trim();
  let declaredMime = input.mimeType;

  const dataUriMatch = /^data:([^;]+);base64,([\s\S]+)$/i.exec(rawBase64);
  if (dataUriMatch) {
    declaredMime = declaredMime ?? dataUriMatch[1];
    rawBase64 = dataUriMatch[2]!;
  }

  const buffer = Buffer.from(rawBase64, "base64");
  const verified = verifyUploadedImage(buffer, declaredMime);
  const signed = createSignedCloudinaryParams(folder);

  let secureUrl: string;
  const fullPublicId = `${folder}/${signed.publicId}`;

  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET && !isTest) {
    const form = new FormData();
    form.append("file", `data:${verified.mimeType};base64,${buffer.toString("base64")}`);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("folder", signed.folder);
    form.append("public_id", signed.publicId);
    form.append("signature", signed.signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
      { method: "POST", body: form },
    );

    if (!uploadRes.ok) {
      throw new AppError(502, "CLOUDINARY_UPLOAD_FAILED", "Image storage provider rejected the upload");
    }

    const cloudData = (await uploadRes.json()) as {
      secure_url?: string;
      public_id?: string;
      width?: number;
      height?: number;
      bytes?: number;
    };
    if (!cloudData.secure_url) {
      throw new AppError(502, "CLOUDINARY_UPLOAD_FAILED", "Invalid response from image storage provider");
    }
    secureUrl = cloudData.secure_url;
    verified.width = cloudData.width ?? verified.width;
    verified.height = cloudData.height ?? verified.height;
  } else {
    const cloud = signed.cloudName || "dezaakir";
    secureUrl = `https://res.cloudinary.com/${cloud}/image/upload/${fullPublicId}.${verified.format}`;
  }

  const mediaDoc = await Media.create({
    publicId: fullPublicId,
    url: secureUrl,
    format: verified.format,
    bytes: verified.bytes,
    ...(verified.width ? { width: verified.width } : {}),
    ...(verified.height ? { height: verified.height } : {}),
    alt: input.alt ? sanitizePlainText(input.alt) : "",
    ...(input.caption ? { caption: sanitizePlainText(input.caption) } : {}),
    folder,
    uploadedBy: toObjectId(uploadedByUserId),
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.media_upload",
    outcome: "SUCCESS",
    actor: toObjectId(uploadedByUserId),
    actorEmail: req?.user?.email,
    targetType: "Media",
    targetId: String(mediaDoc._id),
    req,
    metadata: { format: verified.format, bytes: verified.bytes, folder },
  });

  return mediaDoc.toJSON() as unknown as Record<string, unknown>;
}

export async function listMediaAssets(query: { page?: number; limit?: number; folder?: string; search?: string }): Promise<{
  media: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 50);
  const filter: Record<string, unknown> = {};
  if (query.folder) {
    filter.folder = assertAllowedFolder(query.folder);
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { publicId: trusted({ $regex: safePattern }) },
      { alt: trusted({ $regex: safePattern }) },
      { caption: trusted({ $regex: safePattern }) },
      { format: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    Media.countDocuments(filter),
    Media.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    media: docs.map((d) => d.toJSON() as unknown as Record<string, unknown>),
    meta: { page, limit, total, totalPages },
  };
}

export async function deleteMediaAsset(id: string, req?: Request): Promise<void> {
  const mediaId = toObjectId(id);
  const media = await Media.findById(mediaId);
  if (!media) {
    throw AppError.notFound("Media asset not found");
  }

  // Prevent accidental deletion if referenced by a Blog or Project coverImage
  const [inBlog, inProject] = await Promise.all([
    Blog.exists({ "coverImage.publicId": media.publicId }),
    Project.exists({ "coverImage.publicId": media.publicId }),
  ]);

  if (inBlog || inProject) {
    throw AppError.conflict("Media asset is currently referenced by a blog post or project");
  }

  await Media.deleteOne({ _id: media._id });

  await recordAudit({
    category: "ADMIN",
    action: "admin.media_delete",
    outcome: "SUCCESS",
    actor: req?.user?._id,
    actorEmail: req?.user?.email,
    targetType: "Media",
    targetId: id,
    req,
    metadata: { publicId: media.publicId },
  });
}
