import { Router } from "express";
import {
  createCategoryHandler,
  createTagHandler,
  deleteCategoryHandler,
  deleteTagHandler,
  listCategoriesHandler,
  listTagsHandler,
} from "../controllers/taxonomy.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  CreateCategorySchema,
  CreateTagSchema,
  ListCategoriesQuerySchema,
  ObjectIdParamSchema,
} from "../validators/taxonomy.validator.js";

export const categoriesRouter = Router();
export const tagsRouter = Router();

categoriesRouter.get("/", validate({ query: ListCategoriesQuerySchema }), listCategoriesHandler);
categoriesRouter.post("/", requireAdmin, validate({ body: CreateCategorySchema }), createCategoryHandler);
categoriesRouter.delete("/:id", requireAdmin, validate({ params: ObjectIdParamSchema }), deleteCategoryHandler);

tagsRouter.get("/", listTagsHandler);
tagsRouter.post("/", requireAdmin, validate({ body: CreateTagSchema }), createTagHandler);
tagsRouter.delete("/:id", requireAdmin, validate({ params: ObjectIdParamSchema }), deleteTagHandler);
