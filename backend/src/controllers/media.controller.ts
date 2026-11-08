import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  createSignedCloudinaryParams,
  uploadAndRegisterImage,
  listMediaAssets,
  deleteMediaAsset,
} from "../services/media.service.js";
import type {
  signUploadSchema,
  uploadMediaSchema,
  listMediaQuerySchema,
} from "../validators/media.validator.js";
import type { z } from "zod";

export async function signMediaUploadHandler(req: Request, res: Response): Promise<void> {
  const { folder } = req.body as z.infer<typeof signUploadSchema>;
  const signed = createSignedCloudinaryParams(folder);
  sendSuccess(res, { signed }, 200);
}

export async function uploadMediaHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof uploadMediaSchema>;
  const media = await uploadAndRegisterImage(
    {
      fileBase64: body.fileBase64,
      mimeType: body.mimeType ?? body.claimedMimeType,
      folder: body.folder,
      alt: body.alt,
      caption: body.caption,
    },
    String(req.user!._id),
    req
  );
  sendSuccess(res, { media }, 201);
}

export async function listMediaHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listMediaQuerySchema>;
  const result = await listMediaAssets(query);
  sendSuccess(res, { media: result.media }, 200, result.meta);
}

export async function deleteMediaHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  await deleteMediaAsset(id, req);
  sendSuccess(res, { deleted: true, id }, 200);
}
