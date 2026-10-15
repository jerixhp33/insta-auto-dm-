import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(100),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().default("INR"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category_id: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const automationSchema = z.object({
  name: z.string().min(1, "Automation name is required").max(200),
  instagram_media_id: z.string().optional(),
  public_reply: z.string().max(2200).optional(),
  private_message: z.string().max(1000).optional(),
  product_id: z.string().uuid().optional(),
  dm_enabled: z.boolean().default(true),
  public_reply_enabled: z.boolean().default(true),
  keywords: z.array(z.string().min(1).max(100)).min(1, "At least one keyword required"),
});

export const imageUploadSchema = z.object({
  alt_text: z.string().max(500).optional(),
  entity_type: z.enum(["product", "category", "banner", "workspace"]),
  entity_id: z.string(),
});

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type WorkspaceInput = z.infer<typeof workspaceSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type AutomationInput = z.infer<typeof automationSchema>;
