import type { Request } from "express";
import { Blog, Category, Tag } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import type { PaginationMeta } from "../utils/apiResponse.js";
import { escapeRegex, isObjectId, normalizePage, toObjectId, trusted } from "../utils/query.js";
import { sanitizePlainText, sanitizeRichHtml } from "../utils/sanitizeHtml.js";
import { htmlToPlainText, readingTimeMinutes, slugify } from "../utils/text.js";
import type { CreateBlogInput, ListBlogsQuery, UpdateBlogInput } from "../validators/blog.validator.js";
import { recordAudit } from "./audit.service.js";

async function ensureUniqueBlogSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const candidateBase = baseSlug || "article";
  let slug = candidateBase;
  let counter = 1;

  while (true) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter._id = trusted({ $ne: toObjectId(excludeId) });
    }
    const exists = await Blog.exists(filter);
    if (!exists) return slug;
    counter += 1;
    slug = `${candidateBase.slice(0, 108)}-${counter}`;
  }
}

export async function listPublicBlogs(query: ListBlogsQuery): Promise<{
  blogs: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 50);
  const filter: Record<string, unknown> = {
    ...Blog.publicFilter(new Date()),
  };

  if (query.featured !== undefined) {
    filter.featured = query.featured;
  }

  if (query.category) {
    if (isObjectId(query.category)) {
      filter.category = toObjectId(query.category);
    } else {
      const cat = await Category.findOne({ type: "BLOG", slug: query.category.toLowerCase() }).lean();
      if (!cat) {
        return {
          blogs: [],
          categories: [],
          tags: [],
          meta: { page, limit, total: 0, totalPages: 1 },
        };
      }
      filter.category = cat._id;
    }
  }

  if (query.tag) {
    if (isObjectId(query.tag)) {
      filter.tags = toObjectId(query.tag);
    } else {
      const tagDoc = await Tag.findOne({ slug: query.tag.toLowerCase() }).lean();
      if (!tagDoc) {
        return {
          blogs: [],
          categories: [],
          tags: [],
          meta: { page, limit, total: 0, totalPages: 1 },
        };
      }
      filter.tags = tagDoc._id;
    }
  }

  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { title: trusted({ $regex: safePattern }) },
      { excerpt: trusted({ $regex: safePattern }) },
      { contentText: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs, categories, tags] = await Promise.all([
    Blog.countDocuments(filter),
    Blog.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name")
      .populate("category", "name slug type description")
      .populate("tags", "name slug"),
    Category.find({ type: "BLOG" }).sort({ name: 1 }),
    Tag.find({}).sort({ name: 1 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    blogs: docs.map((d) => d.toJSON() as unknown as Record<string, unknown>),
    categories: categories.map((c) => c.toJSON() as unknown as Record<string, unknown>),
    tags: tags.map((t) => t.toJSON() as unknown as Record<string, unknown>),
    meta: { page, limit, total, totalPages },
  };
}

export async function getPublicBlogBySlug(slug: string): Promise<{
  blog: Record<string, unknown>;
  related: Record<string, unknown>[];
}> {
  const now = new Date();
  const blog = await Blog.findOne({
    slug: slug.toLowerCase(),
    ...Blog.publicFilter(now),
  })
    .populate("author", "name")
    .populate("category", "name slug type description")
    .populate("tags", "name slug");

  if (!blog) {
    throw AppError.notFound("Article not found");
  }

  const relatedOr: Record<string, unknown>[] = [];
  if (blog.category) {
    const catId = typeof blog.category === "object" && "_id" in blog.category ? blog.category._id : blog.category;
    relatedOr.push({ category: catId });
  }
  if (blog.tags && blog.tags.length > 0) {
    const tagIds = blog.tags.map((t) => (typeof t === "object" && "_id" in t ? t._id : t));
    relatedOr.push({ tags: trusted({ $in: tagIds }) });
  }

  const relatedFilter: Record<string, unknown> = {
    _id: trusted({ $ne: blog._id }),
    ...Blog.publicFilter(now),
  };
  if (relatedOr.length > 0) {
    relatedFilter.$or = trusted(relatedOr);
  }

  const relatedDocs = await Blog.find(relatedFilter)
    .sort({ publishedAt: -1 })
    .limit(3)
    .populate("author", "name")
    .populate("category", "name slug type description")
    .populate("tags", "name slug");

  return {
    blog: blog.toJSON() as unknown as Record<string, unknown>,
    related: relatedDocs.map((r) => r.toJSON() as unknown as Record<string, unknown>),
  };
}

export async function listAdminBlogs(query: ListBlogsQuery): Promise<{
  blogs: Record<string, unknown>[];
  meta: PaginationMeta;
}> {
  const { page, limit } = normalizePage(query.page, query.limit, 50);
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.featured !== undefined) {
    filter.featured = query.featured;
  }
  if (query.search) {
    const safePattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = trusted([
      { title: trusted({ $regex: safePattern }) },
      { excerpt: trusted({ $regex: safePattern }) },
    ]);
  }

  const [total, docs] = await Promise.all([
    Blog.countDocuments(filter),
    Blog.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name email")
      .populate("category", "name slug type")
      .populate("tags", "name slug"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    blogs: docs.map((d) => d.toJSON() as unknown as Record<string, unknown>),
    meta: { page, limit, total, totalPages },
  };
}

export async function getAdminBlogById(id: string): Promise<Record<string, unknown>> {
  const blog = await Blog.findById(toObjectId(id))
    .populate("author", "name email")
    .populate("category", "name slug type")
    .populate("tags", "name slug");

  if (!blog) {
    throw AppError.notFound("Article not found");
  }
  return blog.toJSON() as unknown as Record<string, unknown>;
}

export async function createBlogArticle(
  input: CreateBlogInput,
  authorId: string,
  req?: Request,
): Promise<Record<string, unknown>> {
  const title = sanitizePlainText(input.title);
  const excerpt = sanitizePlainText(input.excerpt);
  const cleanHtml = sanitizeRichHtml(input.content);
  const contentText = htmlToPlainText(cleanHtml);
  const readingTime = readingTimeMinutes(contentText);

  const requestedSlug = input.slug || slugify(input.title, 110);
  const slug = await ensureUniqueBlogSlug(requestedSlug);

  if (input.status === "SCHEDULED" && !input.publishedAt) {
    throw AppError.badRequest("Scheduled articles require a publication date (publishedAt)");
  }

  const publishedAt =
    input.publishedAt ?? (input.status === "PUBLISHED" ? new Date() : undefined);

  const created = await Blog.create({
    title,
    slug,
    excerpt,
    content: cleanHtml,
    contentText,
    ...(input.coverImage ? { coverImage: input.coverImage } : {}),
    author: toObjectId(authorId),
    ...(input.category ? { category: toObjectId(input.category) } : {}),
    tags: (input.tags ?? []).map((t) => toObjectId(t)),
    status: input.status,
    featured: input.featured ?? false,
    readingTime,
    ...(input.seoTitle ? { seoTitle: sanitizePlainText(input.seoTitle) } : {}),
    ...(input.seoDescription ? { seoDescription: sanitizePlainText(input.seoDescription) } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  });

  await recordAudit({
    category: "ADMIN",
    action: "admin.blog_create",
    outcome: "SUCCESS",
    actor: toObjectId(authorId),
    actorEmail: req?.user?.email,
    targetType: "Blog",
    targetId: String(created._id),
    req,
    metadata: { slug: created.slug, status: created.status },
  });

  const populated = await Blog.findById(created._id)
    .populate("author", "name")
    .populate("category", "name slug type")
    .populate("tags", "name slug");

  return (populated ?? created).toJSON() as unknown as Record<string, unknown>;
}

export async function updateBlogArticle(
  id: string,
  input: UpdateBlogInput,
  req?: Request,
): Promise<Record<string, unknown>> {
  const blog = await Blog.findById(toObjectId(id));
  if (!blog) {
    throw AppError.notFound("Article not found");
  }

  if (input.title !== undefined) {
    blog.title = sanitizePlainText(input.title);
  }
  if (input.slug !== undefined && input.slug !== blog.slug) {
    blog.slug = await ensureUniqueBlogSlug(input.slug, id);
  }
  if (input.excerpt !== undefined) {
    blog.excerpt = sanitizePlainText(input.excerpt);
  }
  if (input.content !== undefined) {
    const cleanHtml = sanitizeRichHtml(input.content);
    const contentText = htmlToPlainText(cleanHtml);
    blog.content = cleanHtml;
    blog.contentText = contentText;
    blog.readingTime = readingTimeMinutes(contentText);
  }
  if (input.coverImage !== undefined) {
    blog.coverImage = input.coverImage ?? undefined;
  }
  if (input.category !== undefined) {
    blog.category = input.category ? toObjectId(input.category) : undefined;
  }
  if (input.tags !== undefined) {
    blog.tags = input.tags.map((t) => toObjectId(t));
  }
  if (input.featured !== undefined) {
    blog.featured = input.featured;
  }
  if (input.seoTitle !== undefined) {
    blog.seoTitle = input.seoTitle ? sanitizePlainText(input.seoTitle) : undefined;
  }
  if (input.seoDescription !== undefined) {
    blog.seoDescription = input.seoDescription ? sanitizePlainText(input.seoDescription) : undefined;
  }
  if (input.publishedAt !== undefined) {
    blog.publishedAt = input.publishedAt ?? undefined;
  }
  if (input.status !== undefined) {
    blog.status = input.status;
    if (input.status === "PUBLISHED" && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    if (input.status === "SCHEDULED" && !blog.publishedAt) {
      throw AppError.badRequest("Scheduled articles require a publication date (publishedAt)");
    }
  }

  await blog.save();

  await recordAudit({
    category: "ADMIN",
    action: "admin.blog_update",
    outcome: "SUCCESS",
    actor: req?.user?._id,
    actorEmail: req?.user?.email,
    targetType: "Blog",
    targetId: id,
    req,
    metadata: { slug: blog.slug, status: blog.status },
  });

  const populated = await Blog.findById(blog._id)
    .populate("author", "name")
    .populate("category", "name slug type")
    .populate("tags", "name slug");

  return (populated ?? blog).toJSON() as unknown as Record<string, unknown>;
}

export async function deleteBlogArticle(id: string, req?: Request): Promise<void> {
  const deleted = await Blog.findByIdAndDelete(toObjectId(id));
  if (!deleted) {
    throw AppError.notFound("Article not found");
  }

  await recordAudit({
    category: "ADMIN",
    action: "admin.blog_delete",
    outcome: "SUCCESS",
    actor: req?.user?._id,
    actorEmail: req?.user?.email,
    targetType: "Blog",
    targetId: id,
    req,
    metadata: { slug: deleted.slug },
  });
}
