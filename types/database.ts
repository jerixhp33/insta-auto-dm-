export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type AutomationStatus = "active" | "inactive" | "draft";
export type EventStatus = "pending" | "processing" | "success" | "failed" | "retrying";
export type AccountStatus = "connected" | "disconnected" | "error" | "expired";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          owner_id: string;
          plan: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workspaces"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workspace_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
      };
      instagram_accounts: {
        Row: {
          id: string;
          workspace_id: string;
          instagram_user_id: string;
          username: string;
          name: string | null;
          profile_picture_url: string | null;
          account_type: string | null;
          encrypted_access_token: string;
          token_expires_at: string | null;
          status: AccountStatus;
          permissions: string[];
          connected_at: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["instagram_accounts"]["Row"], "id" | "connected_at" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["instagram_accounts"]["Insert"]>;
      };
      instagram_media: {
        Row: {
          id: string;
          workspace_id: string;
          instagram_account_id: string;
          instagram_media_id: string;
          media_type: string;
          media_url: string | null;
          thumbnail_url: string | null;
          permalink: string | null;
          caption: string | null;
          timestamp: string;
          like_count: number;
          comments_count: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["instagram_media"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["instagram_media"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          price: number | null;
          currency: string;
          url: string | null;
          category_id: string | null;
          status: "active" | "inactive";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          workspace_id: string;
          storage_path: string;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_images"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          image_path: string | null;
          is_global: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      automations: {
        Row: {
          id: string;
          workspace_id: string;
          instagram_account_id: string;
          instagram_media_id: string | null;
          name: string;
          status: AutomationStatus;
          public_reply: string | null;
          private_message: string | null;
          product_id: string | null;
          reply_to_all: boolean;
          dm_enabled: boolean;
          public_reply_enabled: boolean;
          trigger_count: number;
          success_count: number;
          failure_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["automations"]["Row"], "id" | "trigger_count" | "success_count" | "failure_count" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["automations"]["Insert"]>;
      };
      automation_keywords: {
        Row: {
          id: string;
          automation_id: string;
          workspace_id: string;
          keyword: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["automation_keywords"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["automation_keywords"]["Insert"]>;
      };
      automation_events: {
        Row: {
          id: string;
          workspace_id: string;
          automation_id: string;
          instagram_account_id: string;
          instagram_media_id: string | null;
          commenter_ig_id: string | null;
          commenter_username: string | null;
          comment_text: string;
          comment_ig_id: string;
          keyword_matched: string | null;
          status: EventStatus;
          public_reply_status: EventStatus | null;
          dm_status: EventStatus | null;
          retry_count: number;
          error_message: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["automation_events"]["Row"], "id" | "retry_count" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["automation_events"]["Insert"]>;
      };
      processed_events: {
        Row: {
          id: string;
          event_id: string;
          workspace_id: string;
          processed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["processed_events"]["Row"], "id" | "processed_at">;
        Update: never;
      };
      webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          payload: Json;
          status: "received" | "processing" | "processed" | "failed";
          error: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["webhook_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Insert"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          workspace_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
      oauth_states: {
        Row: {
          id: string;
          state: string;
          user_id: string;
          workspace_id: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["oauth_states"]["Row"], "id" | "created_at">;
        Update: Pick<Database["public"]["Tables"]["oauth_states"]["Row"], "used">;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_workspace_member_role: {
        Args: { p_workspace_id: string; p_user_id: string };
        Returns: WorkspaceRole | null;
      };
    };
    Enums: Record<string, never>;
  };
}
