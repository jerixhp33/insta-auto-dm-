/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Package, ImagePlus, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedImage {
  file: File;
  preview: string;
  path?: string;
  uploading?: boolean;
  error?: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { currency: "INR", status: "active" },
  });

  React.useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await ((supabase.from("workspace_members") as any) as any).select("workspace_id").eq("user_id", user.id).single();
      if (member) setWorkspaceId(member.workspace_id);
    };
    load();
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid file type", description: `${file.name} is not a supported image format.` });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast({ variant: "destructive", title: "File too large", description: `${file.name} exceeds 5MB limit.` });
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

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const uploadImage = async (img: UploadedImage, productId: string, idx: number, wid: string) => {
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

    setImages(prev => prev.map((i, n) => n === idx ? { ...i, uploading: false, path } : i));
    return path;
  };

  const onSubmit = async (data: ProductInput) => {
    if (!workspaceId) { toast({ variant: "destructive", title: "Not ready", description: "Please wait." }); return; }
    const supabase = createClient();

    const { data: product, error } = await (supabase.from("products") as any)
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description || null,
        price: data.price || null,
        currency: data.currency,
        url: data.url || null,
        category_id: data.category_id || null,
        status: data.status,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Failed to create product" });
      return;
    }

    // Upload images
    if (images.length > 0) {
      const uploadedPaths = await Promise.all(
        images.map((img, idx) => uploadImage(img, product.id, idx, workspaceId))
      );

      const validPaths = uploadedPaths.filter(Boolean) as string[];
      if (validPaths.length > 0) {
        await ((supabase.from("product_images") as any) as any).insert(
          validPaths.map((path, idx) => ({
            product_id: product.id,
            workspace_id: workspaceId,
            storage_path: path,
            sort_order: idx,
          }))
        );
      }
    }

    toast({ variant: "success", title: "Product created!", description: `${data.name} has been added.` });
    router.push("/dashboard/products");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
        <p className="text-sm text-slate-500 mt-0.5">Create a product to use in your automation DMs</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Image upload */}
        <Card>
          <CardHeader><CardTitle>Product Images</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                isDragging ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
              )}
            >
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP up to 5MB each · Max 5 images</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <div className="h-5 w-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                      </div>
                    )}
                    {!img.uploading && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 rounded-md bg-violet-600 px-1 py-0.5 text-[9px] font-bold text-white">
                        Main
                      </div>
                    )}
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:border-violet-300 transition-colors"
                  >
                    <ImagePlus className="h-5 w-5 text-slate-300" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product details */}
        <Card>
          <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" placeholder="e.g. Custom Photo Poster" error={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe your product..." rows={3} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" placeholder="499" min="0" step="0.01" {...register("price", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  {...register("currency")}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">Product URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="url" type="url" placeholder="https://yourshop.com/product" className="pl-9" {...register("url")} />
              </div>
              {errors.url && <p className="text-xs text-red-500">{errors.url.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            <Package className="h-4 w-4" />
            Save Product
          </Button>
        </div>
      </form>
    </div>
  );
}
