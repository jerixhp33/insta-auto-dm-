import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/security/rate-limit";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/schemas";

const ALLOWED_BUCKETS = ["product-images", "workspace-assets", "category-images"];

// Validate actual file magic bytes (not just MIME from client)
async function validateImageBytes(buffer: ArrayBuffer): Promise<boolean> {
  const bytes = new Uint8Array(buffer).slice(0, 12);
  const signatures: [number[], string][] = [
    [[0xFF, 0xD8, 0xFF], "jpeg"],
    [[0x89, 0x50, 0x4E, 0x47], "png"],
    [[0x52, 0x49, 0x46, 0x46], "webp"], // RIFF....WEBP
  ];
  return signatures.some(([sig]) => sig.every((byte, i) => bytes[i] === byte));
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = rateLimit(getRateLimitKey("upload", ip), 20, 60_000);
  if (!limited.success) {
    return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many uploads." } }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as string | null;
  const path = formData.get("path") as string | null;

  if (!file || !bucket || !path) {
    return NextResponse.json({ success: false, error: { code: "MISSING_FIELDS", message: "file, bucket and path are required." } }, { status: 400 });
  }

  // Validate bucket is allowed
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_BUCKET", message: "Invalid storage bucket." } }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_TYPE", message: "Only JPG, PNG, and WEBP images are allowed." } }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ success: false, error: { code: "FILE_TOO_LARGE", message: "File must be under 5MB." } }, { status: 400 });
  }

  // Validate path doesn't contain traversal
  if (path.includes("..") || path.includes("//")) {
    return NextResponse.json({ success: false, error: { code: "INVALID_PATH", message: "Invalid path." } }, { status: 400 });
  }

  // Validate actual file bytes
  const arrayBuffer = await file.arrayBuffer();
  const isValidImage = await validateImageBytes(arrayBuffer);
  if (!isValidImage) {
    return NextResponse.json({ success: false, error: { code: "INVALID_IMAGE", message: "File does not appear to be a valid image." } }, { status: 400 });
  }

  // Use service client to upload (we've validated auth above)
  const serviceClient = await createServiceClient();
  const { error } = await serviceClient.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[Upload] Storage error:", error.message);
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: "Upload failed. Please try again." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { path } });
}
