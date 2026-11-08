import type { RequestHandler } from "express";
import {
  deleteContactMessage,
  listContactMessages,
  submitContactMessage,
  updateContactMessageStatus,
} from "../services/contact.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import type {
  ContactSubmissionInput,
  ListMessagesQuery,
  UpdateMessageStatusInput,
} from "../validators/contact.validator.js";

export const submitContactHandler: RequestHandler = async (req, res) => {
  const result = await submitContactMessage(req.body as ContactSubmissionInput, req);
  sendSuccess(res, result, 201);
};

export const listMessagesHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const query = (req.validatedQuery ?? {}) as ListMessagesQuery;
  const { messages, meta } = await listContactMessages(query);
  sendSuccess(res, { messages }, 200, meta);
};

export const updateMessageStatusHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const message = await updateContactMessageStatus(
    String(req.params.id),
    req.body as UpdateMessageStatusInput,
    req,
  );
  sendSuccess(res, { message });
};

export const deleteMessageHandler: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const result = await deleteContactMessage(String(req.params.id), req);
  sendSuccess(res, result);
};
