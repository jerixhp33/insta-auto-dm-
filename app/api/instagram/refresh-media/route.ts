import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { fetchInstagramUserMedia } from "@/lib/instagram/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { account_id } = await request.json();

    if (!account_id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    // 1. Get Instagram account
    const { data: account, error: accErr } = await (serviceClient
      .from("instagram_accounts") as any)
      .select("id, workspace_id, encrypted_access_token, instagram_user_id, username")
      .eq("id", account_id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const accessToken = decrypt(account.encrypted_access_token);

    // 2. Fetch fresh media from Instagram
    const mediaRes = await fetchInstagramUserMedia(accessToken, account.instagram_user_id, 50);
    const mediaItems = mediaRes.data || [];

    // 3. Upsert into instagram_media
    let syncedCount = 0;
    for (const item of mediaItems) {
      const { error: upsertErr } = await (serviceClient.from("instagram_media") as any).upsert(
        {
          workspace_id: account.workspace_id,
          instagram_account_id: account.id,
          instagram_media_id: item.id,
          media_type: item.media_type || "UNKNOWN",
          media_url: item.media_url || null,
          thumbnail_url: item.thumbnail_url || item.media_url || null,
          permalink: item.permalink || null,
          caption: item.caption || null,
          timestamp: item.timestamp || null,
        },
        { onConflict: "workspace_id,instagram_media_id" }
      );

      if (!upsertErr) syncedCount++;
    }

    // 4. Update last_synced_at on account
    await (serviceClient.from("instagram_accounts") as any)
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: mediaItems.length,
      message: `Successfully refreshed ${syncedCount} posts and reels.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to refresh media" }, { status: 500 });
  }
}
