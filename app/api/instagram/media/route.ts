/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { fetchInstagramUserMedia, InstagramMediaItem } from "@/lib/instagram/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get("account_id");
    if (!accountId) {
      return NextResponse.json({ error: "Missing account_id parameter" }, { status: 400 });
    }

    // Retrieve account details
    const { data: rawAccount, error: accError } = await (supabase.from("instagram_accounts") as any)
      .select("id, workspace_id, encrypted_access_token, status, username")
      .eq("id", accountId)
      .maybeSingle();

    if (accError || !rawAccount) {
      return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });
    }

    // Check user membership in the account's workspace
    const { data: member } = await (supabase.from("workspace_members") as any)
      .select("workspace_id")
      .eq("workspace_id", rawAccount.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Forbidden: Not a member of this workspace" }, { status: 403 });
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decrypt(rawAccount.encrypted_access_token);
    } catch {
      return NextResponse.json({ error: "Failed to decrypt Instagram access token" }, { status: 500 });
    }

    // Fetch media from Instagram Graph API
    let metaMedia: InstagramMediaItem[] = [];
    try {
      const response = await fetchInstagramUserMedia(accessToken, rawAccount.instagram_user_id, 50);
      metaMedia = response?.data || [];
      console.log(`[Media API] Live media fetched for @${rawAccount.username}: ${metaMedia.length} items`);
    } catch (fetchErr: any) {
      console.warn("[Media API] Live Instagram media fetch failed, falling back to cache:", fetchErr?.message || fetchErr);
    }

    // Upsert into Supabase database
    if (metaMedia.length > 0) {
      const upsertRows = metaMedia.map(item => ({
        workspace_id: rawAccount.workspace_id,
        instagram_account_id: rawAccount.id,
        instagram_media_id: item.id,
        media_type: item.media_type || "IMAGE",
        media_url: item.media_url || null,
        thumbnail_url: item.thumbnail_url || item.media_url || null,
        permalink: item.permalink || null,
        caption: item.caption || null,
        timestamp: item.timestamp || new Date().toISOString(),
        like_count: item.like_count || 0,
        comments_count: item.comments_count || 0,
      }));

      await (supabase.from("instagram_media") as any).upsert(upsertRows, {
        onConflict: "workspace_id,instagram_media_id",
      });
    }

    // Query all synced media from database
    const { data: mediaList, error: queryError } = await (supabase.from("instagram_media") as any)
      .select("id, instagram_media_id, media_type, media_url, thumbnail_url, permalink, caption, timestamp, like_count, comments_count")
      .eq("instagram_account_id", rawAccount.id)
      .order("timestamp", { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json({ media: mediaList || [] });
  } catch (err) {
    console.error("[Media API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
