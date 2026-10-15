import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Coming Soon</h1>
      <Card><CardContent className="flex flex-col items-center py-14 text-center"><Construction className="h-10 w-10 text-slate-300 mb-3" /><p className="text-slate-500">This section is under construction</p></CardContent></Card>
    </div>
  );
}
