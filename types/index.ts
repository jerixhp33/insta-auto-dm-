export type { Database, WorkspaceRole, AutomationStatus, EventStatus, AccountStatus } from "./database";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface WorkspaceContext {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: import("./database").WorkspaceRole;
}

export interface DashboardStats {
  totalComments: number;
  repliesSent: number;
  dmsSent: number;
  activeAutomations: number;
  commentsGrowth: number;
  repliesGrowth: number;
  dmsGrowth: number;
}
