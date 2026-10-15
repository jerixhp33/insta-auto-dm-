import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 capitalize">templates</h1>
      <Card>
        <CardContent className="flex flex-col items-center py-14 text-center">
          <Construction className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
