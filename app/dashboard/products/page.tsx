/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, MoreVertical, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberRecord } = await (supabase
    .from("workspace_members") as any)
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  
  const workspaceId = (memberRecord as any)?.workspace_id;

  const { data: products } = await supabase
    .from("products")
    .select("*, product_images(storage_path, sort_order)")
    .eq("workspace_id", workspaceId || "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products?.length || 0} products</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {products?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product: any) => {
            const images = product.product_images as { storage_path: string; sort_order: number }[] | null;
            const firstImage = images?.sort((a, b) => a.sort_order - b.sort_order)[0];

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Product image */}
                <div className="aspect-square bg-slate-100 relative">
                  {firstImage ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage.storage_path}`}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                  <Badge
                    variant={product.status === "active" ? "success" : "secondary"}
                    className="absolute top-2 right-2"
                  >
                    {product.status}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{product.name}</h3>
                    <Button variant="ghost" size="icon-sm" className="shrink-0 -mr-1">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  {product.price && (
                    <p className="text-sm font-bold text-violet-600">
                      {product.currency === "INR" ? "₹" : "$"}{product.price}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/products/${product.id}`}>Edit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No products yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Add products to include in your automation DMs with name, price, and a direct link.
            </p>
            <Button asChild>
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4" />
                Add Your First Product
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
