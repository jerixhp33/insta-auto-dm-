/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Plus, RefreshCw, Unlink, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AccountCardActions } from "@/components/instagram/account-card-actions";

interface Props {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function InstagramPage(props: Props) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberRecord } = await (supabase
    .from("workspace_members") as any)
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  
  let workspaceId = (memberRecord as any)?.workspace_id;

  if (!workspaceId) {
    const { data: wsRecord } = await (supabase
      .from("workspaces") as any)
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (wsRecord?.id) {
      workspaceId = wsRecord.id;
    } else {
      redirect("/onboarding");
    }
  }

  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("workspace_id", workspaceId || "")
    .order("created_at", { ascending: false });

  const statusConfig = {
    connected: { variant: "success" as const, icon: CheckCircle, label: "Connected" },
    disconnected: { variant: "secondary" as const, icon: AlertCircle, label: "Disconnected" },
    error: { variant: "destructive" as const, icon: AlertCircle, label: "Error" },
    expired: { variant: "warning" as const, icon: AlertCircle, label: "Token Expired" },
  };

  const errorMessageMap: Record<string, string> = {
    oauth_denied: "Access was denied. Please allow requested permissions to connect your Instagram account.",
    invalid_callback: "Invalid authentication callback received.",
    invalid_state: "Authentication session expired. Please try connecting again.",
    no_instagram_account: "No Instagram Professional (Business or Creator) account was detected.",
    connection_failed: "Failed to connect to Instagram. Please check your Meta developer settings or try connecting via Facebook.",
  };

  return (
    <div className="space-y-6">
      {searchParams?.success === "connected" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Instagram account successfully connected and synced!</span>
        </div>
      )}

      {searchParams?.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{errorMessageMap[searchParams.error] || "An error occurred while connecting your account."}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instagram Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your connected Instagram professional accounts</p>
        </div>
        <Button asChild>
          <a href={`/api/instagram/connect?workspace_id=${workspaceId}`}>
            <Plus className="h-4 w-4" />
            Connect Account
          </a>
        </Button>
      </div>

      {accounts?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: any) => {
            const config = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.disconnected;
            const StatusIcon = config.icon;
            return (
              <Card key={account.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {account.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">@{account.username}</p>
                      <p className="text-xs text-slate-500 truncate">{account.name || "Instagram Account"}</p>
                    </div>
                    <Badge variant={config.variant} className="shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <AccountCardActions
                    accountId={account.id}
                    username={account.username}
                    status={account.status}
                    workspaceId={workspaceId}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 mb-5">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect your Instagram</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Connect your Instagram Business or Creator account to start automating comment replies and DMs.
            </p>
            <div className="flex flex-col gap-2 items-center text-xs text-slate-400 mb-6">
              <p>✓ Uses Meta&apos;s official API — no passwords required</p>
              <p>✓ Secure OAuth authentication</p>
              <p>✓ Your data stays private</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:opacity-90 text-white font-medium px-6 py-3 rounded-xl shadow-md">
                <a href={`/api/instagram/connect?workspace_id=${workspaceId}`}>
                  <Camera className="h-5 w-5 mr-2" />
                  Connect with Instagram
                </a>
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-4 max-w-md text-center leading-relaxed">
              Log in directly with your Instagram Business or Creator account to grant permissions for DM automation and comment replies.
            </p>
          </CardContent>
        </Card>
      )}

      {/* API info card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">About Instagram Connection</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            InstaAuto uses Meta&apos;s official Instagram Graph API. We never ask for your Instagram password.
            You authorize access through Meta&apos;s secure official login screen. You can disconnect at any time,
            and revoke access directly from your Instagram Settings → Apps and Websites.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
