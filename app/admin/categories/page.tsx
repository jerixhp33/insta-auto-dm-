import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree, Package, Plus, Globe, Building2 } from "lucide-react";

export default async function AdminCategoriesPage() {
  const supabase = await createServiceClient();

  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, name, description, is_global, created_at,
      workspaces:workspace_id(name),
      products(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage global and workspace catalog categories</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories && categories.length > 0 ? (
          categories.map((cat: any) => {
            const productCount = cat.products?.[0]?.count || 0;
            const dateStr = new Date(cat.created_at).toLocaleDateString();

            return (
              <Card key={cat.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                        <FolderTree className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                    </div>
                    <Badge variant={cat.is_global ? "default" : "secondary"} className="text-xs">
                      {cat.is_global ? "Global" : "Workspace"}
                    </Badge>
                  </div>
                  {cat.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {cat.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Package className="h-3.5 w-3.5 text-violet-500" /> {productCount} products
                    </span>
                    <span>Created: {dateStr}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full p-12 text-center text-slate-400">
            No categories created yet. Categories help organize products in automations.
          </Card>
        )}
      </div>
    </div>
  );
}
