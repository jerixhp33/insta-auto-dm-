import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MoreVertical, ImageIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProductRow {
  id: string; name: string; price: number | null; currency: string;
  status: string; created_at: string;
  workspaces: { name: string } | null;
  product_images: { storage_path: string; sort_order: number }[];
}

export default async function AdminProductsPage() {
  const supabase = await createServiceClient();
  const { data: rawProducts } = await supabase
    .from("products")
    .select("id, name, price, currency, status, created_at, workspaces(name), product_images(storage_path, sort_order)")
    .order("created_at", { ascending: false }).limit(100);
  const products = (rawProducts || []) as unknown as ProductRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="text-sm text-slate-500 mt-0.5">{products.length} total products</p>
      </div>
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Product","Workspace","Price","Status","Created",""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(product => {
                  const firstImage = product.product_images?.sort((a,b) => a.sort_order - b.sort_order)[0];
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {firstImage ? (
                              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage.storage_path}`} alt={product.name} className="h-full w-full object-cover" />
                            ) : <ImageIcon className="h-5 w-5 text-slate-300" />}
                          </div>
                          <span className="font-medium text-slate-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.workspaces?.name || "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{product.price ? `${product.currency === "INR" ? "₹" : "$"}${product.price}` : "—"}</td>
                      <td className="px-4 py-3"><Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge></td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(product.created_at)}</td>
                      <td className="px-4 py-3"><Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="lg:hidden grid gap-4 sm:grid-cols-2">
        {products.map(product => {
          const firstImage = product.product_images?.sort((a,b) => a.sort_order - b.sort_order)[0];
          return (
            <Card key={product.id}>
              <CardContent className="p-4 flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {firstImage ? <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage.storage_path}`} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500 truncate">{product.workspaces?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.price && <span className="text-sm font-bold text-violet-600">{product.currency === "INR" ? "₹" : "$"}{product.price}</span>}
                    <Badge variant={product.status === "active" ? "success" : "secondary"} className="text-[10px]">{product.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!products.length && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Package className="h-10 w-10 text-slate-200 mb-2" />
            <p className="text-slate-500">No products yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
