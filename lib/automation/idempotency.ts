import { createServiceClient } from "@/lib/supabase/server";

/**
 * Idempotency guard for webhook events.
 * Uses database unique constraint to prevent duplicate processing,
 * safe under concurrent requests.
 */
export async function checkAndMarkProcessed(
  eventId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createServiceClient();

  // Attempt atomic insert — fails with unique constraint if already processed
  const { error } = await supabase.from("processed_events").insert({
    event_id: eventId,
    workspace_id: workspaceId,
  } as never);

  if (error) {
    // Unique constraint violation = already processed
    if (error.code === "23505") return false;
    // Unexpected error — rethrow
    throw error;
  }

  return true; // Successfully marked — proceed with processing
}

export async function isAlreadyProcessed(
  eventId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("processed_events")
    .select("id")
    .eq("event_id", eventId)
    .eq("workspace_id", workspaceId)
    .single();
  return !!data;
}
