/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import React, { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Package, ImagePlus, Link as LinkIcon, Trash2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UploadedImage {
  file?: File;
  preview: string;
  path?: string;
  id?: string;
  uploading?: boolean;
  error?: string;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { currency: "INR", status: "active" },
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: member } = await (supabase.from("workspace_members") as any)
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;
      const wid = member.workspace_id;
      setWorkspaceId(wid);

      // Fetch product and categories in parallel
      const [{ data: prod, error }, { data: cats }] = await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(id, storage_path, sort_order)")
          .eq("id", productId)
          .eq("workspace_id", wid)
          .single(),
        supabase
          .from("categories")
          .select("id, name")
          .or(`workspace_id.eq.${wid},is_global.eq.true`),
      ]);

      if (error || !prod) {
        toast({ variant: "destructive", title: "Product not found" });
        router.push("/dashboard/products");
        return;
      }

      const p = prod as any;
      setCategories((cats || []) as { id: string; name: string }[]);

      // Populate form
      reset({
        name: p.name,
        description: p.description || "",
        price: p.price ? Number(p.price) : undefined,
        currency: p.currency || "INR",
        url: p.url || "",
        category_id: p.category_id || undefined,
        status: (p.status as "active" | "inactive") || "active",
      });

      // Populate existing images
      if (p.product_images && Array.isArray(p.product_images)) {
        const sorted = (p.product_images as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order);
        setImages(
          sorted.map((img: any) => ({
            id: img.id,
            path: img.storage_path,
            preview: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.storage_path}`,
          }))
        );
      }

      setIsLoading(false);
    };

    load();
  }, [productId, reset, router]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid file type", description: `${file.name} is not a supported format.` });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast({ variant: "destructive", title: "File too large", description: `${file.name} exceeds 5MB.` });
        continue;
      }
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages(prev => [...prev, ...newImages].slice(0, 5));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeImage = async (idx: number) => {
    const target = images[idx];
    if (target.id) {
      // Delete existing image record from DB
      const supabase = createClient();
      await (supabase.from("product_images") as any).delete().eq("id", target.id);
    }
    setImages(prev => {
      const next = [...prev];
      if (next[idx].file) {
        URL.revokeObjectURL(next[idx].preview);
      }
      next.splice(idx, 1);
      return next;
    });
  };

  const uploadImage = async (img: UploadedImage, idx: number, wid: string) => {
    if (img.path && !img.file) return img.path; // already uploaded
    if (!img.file) return null;

    const supabase = createClient();
    const ext = img.file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${wid}/products/${productId}/${crypto.randomUUID()}.${ext}`;

    setImages(prev => prev.map((i, n) => n === idx ? { ...i, uploading: true } : i));

    const { error } = await supabase.storage.from("product-images").upload(path, img.file, {
      contentType: img.file.type,
      upsert: false,
    });

    if (error) {
      setImages(prev => prev.map((i, n) => n === idx ? { ...i, uploading: false, error: "Upload failed" } : i));
      return null;
    }

    // Insert image reference
    await (supabase.from("product_images") as any).insert({
      product_id: productId,
      workspace_id: wid,
      storage_path: path,
      sort_order: idx,
    });

    setImages(prev => prev.map((i, n) => n === idx ? { ...i, uploading: false, path } : i));
    return path;
  };

  const onSubmit = async (data: ProductInput) => {
    if (!workspaceId) return;

    try {
      const supabase = createClient();

      // 1. Update product
      const { error: prodErr } = await (supabase.from("products") as any)
        .update({
          name: data.name,
          description: data.description || null,
          price: data.price ? Number(data.price) : null,
          currency: data.currency,
          url: data.url || null,
          category_id: data.category_id || null,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (prodErr) throw prodErr;

      // 2. Upload any new images
      for (let i = 0; i < images.length; i++) {
        if (images[i].file) {
          await uploadImage(images[i], i, workspaceId);
        }
      }

      toast({ variant: "success", title: "Product updated", description: "Changes saved successfully." });
      router.push("/dashboard/products");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save product", description: err?.message || "Something went wrong." });
    }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? Automations referencing it will keep their custom reply copy.")) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("products") as any).delete().eq("id", productId);
      if (error) throw error;

      toast({ variant: "success", title: "Product deleted" });
      router.push("/dashboard/products");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to delete product", description: err?.message || "Something went wrong." });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
            <p className="text-sm text-slate-500 mt-0.5">Update product details, pricing, and links</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Images</CardTitle>
            <CardDescription>Upload up to 5 images. The first image will be used as the thumbnail.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors",
                isDragging ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-slate-50/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-violet-50 rounded-2xl text-violet-600">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-500">JPG, PNG, WebP up to 5MB each (Max 5 images)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                    <img src={img.preview} alt="preview" className="h-full w-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-opacity opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" placeholder="e.g. Vintage Anime Poster" error={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe the product..." rows={3} {...register("description")} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <div className="flex gap-2">
                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                    {...register("currency")}
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="499"
                    className="flex-1"
                    {...register("price", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                  {...register("category_id")}
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">Direct Purchase / Info Link</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://yourshop.com/product"
                  className="pl-9"
                  error={!!errors.url}
                  {...register("url")}
                />
              </div>
              <p className="text-xs text-slate-400">This URL will be dynamically inserted into DMs when using the {"{{product_url}}"} variable.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Product Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                {...register("status")}
              >
                <option value="active">Active (Available for Automations)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/products">Cancel</Link>
          </Button>
          <Button type="submit" loading={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
