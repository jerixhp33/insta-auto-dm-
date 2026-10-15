-- =============================================
-- InstaAuto Initial Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================
-- PROFILES
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =============================================
-- WORKSPACES
-- =============================================
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  plan text not null default 'free',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create index idx_workspaces_owner_id on public.workspaces(owner_id);
create index idx_workspaces_slug on public.workspaces(slug);

-- =============================================
-- WORKSPACE MEMBERS
-- =============================================
create table public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create index idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index idx_workspace_members_user_id on public.workspace_members(user_id);

-- Workspace RLS via membership
create policy "Members can view their workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
      and user_id = auth.uid()
    )
  );

create policy "Owners can update their workspaces"
  on public.workspaces for update
  using (owner_id = auth.uid());

create policy "Members can view workspace membership"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm2
      where wm2.workspace_id = workspace_members.workspace_id
      and wm2.user_id = auth.uid()
    )
  );

-- =============================================
-- INSTAGRAM ACCOUNTS
-- =============================================
create table public.instagram_accounts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_user_id text not null,
  username text not null,
  name text,
  profile_picture_url text,
  account_type text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error', 'expired')),
  permissions text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, instagram_user_id)
);

alter table public.instagram_accounts enable row level security;

create index idx_instagram_accounts_workspace_id on public.instagram_accounts(workspace_id);
create index idx_instagram_accounts_instagram_user_id on public.instagram_accounts(instagram_user_id);
create index idx_instagram_accounts_status on public.instagram_accounts(status);

create policy "Members can view their instagram accounts"
  on public.instagram_accounts for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = instagram_accounts.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- INSTAGRAM MEDIA
-- =============================================
create table public.instagram_media (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  instagram_media_id text not null,
  media_type text not null,
  media_url text,
  thumbnail_url text,
  permalink text,
  caption text,
  timestamp timestamptz,
  like_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, instagram_media_id)
);

alter table public.instagram_media enable row level security;

create index idx_instagram_media_workspace_id on public.instagram_media(workspace_id);
create index idx_instagram_media_account_id on public.instagram_media(instagram_account_id);
create index idx_instagram_media_media_id on public.instagram_media(instagram_media_id);

create policy "Members can view their instagram media"
  on public.instagram_media for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = instagram_media.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- CATEGORIES
-- =============================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  image_path text,
  is_global boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Members can view categories"
  on public.categories for select
  using (
    is_global = true
    or exists (
      select 1 from public.workspace_members
      where workspace_id = categories.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- PRODUCTS
-- =============================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2),
  currency text not null default 'INR',
  url text,
  category_id uuid references public.categories(id),
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create index idx_products_workspace_id on public.products(workspace_id);
create index idx_products_status on public.products(status);
create index idx_products_category_id on public.products(category_id);

create policy "Members can view their products"
  on public.products for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = products.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- PRODUCT IMAGES
-- =============================================
create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_images enable row level security;

create index idx_product_images_product_id on public.product_images(product_id);
create index idx_product_images_workspace_id on public.product_images(workspace_id);

create policy "Members can view their product images"
  on public.product_images for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = product_images.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- AUTOMATIONS
-- =============================================
create table public.automations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  instagram_media_id uuid references public.instagram_media(id) on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('active', 'inactive', 'draft')),
  public_reply text,
  private_message text,
  product_id uuid references public.products(id) on delete set null,
  reply_to_all boolean not null default false,
  dm_enabled boolean not null default true,
  public_reply_enabled boolean not null default true,
  trigger_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automations enable row level security;

create index idx_automations_workspace_id on public.automations(workspace_id);
create index idx_automations_instagram_account_id on public.automations(instagram_account_id);
create index idx_automations_instagram_media_id on public.automations(instagram_media_id);
create index idx_automations_status on public.automations(status);

create policy "Members can view their automations"
  on public.automations for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = automations.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- AUTOMATION KEYWORDS
-- =============================================
create table public.automation_keywords (
  id uuid primary key default uuid_generate_v4(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (automation_id, keyword)
);

alter table public.automation_keywords enable row level security;

create index idx_automation_keywords_automation_id on public.automation_keywords(automation_id);
create index idx_automation_keywords_workspace_id on public.automation_keywords(workspace_id);

create policy "Members can view their automation keywords"
  on public.automation_keywords for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = automation_keywords.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- AUTOMATION EVENTS
-- =============================================
create table public.automation_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id),
  instagram_media_id uuid references public.instagram_media(id),
  commenter_ig_id text,
  commenter_username text,
  comment_text text not null,
  comment_ig_id text not null,
  keyword_matched text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'retrying')),
  public_reply_status text
    check (public_reply_status in ('pending', 'processing', 'success', 'failed', 'retrying')),
  dm_status text
    check (dm_status in ('pending', 'processing', 'success', 'failed', 'retrying')),
  retry_count integer not null default 0,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_events enable row level security;

create index idx_automation_events_workspace_id on public.automation_events(workspace_id);
create index idx_automation_events_automation_id on public.automation_events(automation_id);
create index idx_automation_events_status on public.automation_events(status);
create index idx_automation_events_created_at on public.automation_events(created_at desc);
create index idx_automation_events_comment_ig_id on public.automation_events(comment_ig_id);

create policy "Members can view their automation events"
  on public.automation_events for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = automation_events.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- PROCESSED EVENTS (Idempotency)
-- =============================================
create table public.processed_events (
  id uuid primary key default uuid_generate_v4(),
  event_id text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  processed_at timestamptz not null default now(),
  unique (event_id, workspace_id)
);

create index idx_processed_events_event_id on public.processed_events(event_id);
create index idx_processed_events_workspace_id on public.processed_events(workspace_id);

-- No RLS needed — only service role writes to this table

-- =============================================
-- WEBHOOK EVENTS
-- =============================================
create table public.webhook_events (
  id uuid primary key default uuid_generate_v4(),
  event_id text,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index idx_webhook_events_event_id on public.webhook_events(event_id);
create index idx_webhook_events_status on public.webhook_events(status);
create index idx_webhook_events_created_at on public.webhook_events(created_at desc);

-- =============================================
-- OAUTH STATES
-- =============================================
create table public.oauth_states (
  id uuid primary key default uuid_generate_v4(),
  state text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_oauth_states_state on public.oauth_states(state);
create index idx_oauth_states_expires_at on public.oauth_states(expires_at);

-- =============================================
-- ACTIVITY LOGS
-- =============================================
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create index idx_activity_logs_workspace_id on public.activity_logs(workspace_id);
create index idx_activity_logs_user_id on public.activity_logs(user_id);
create index idx_activity_logs_created_at on public.activity_logs(created_at desc);

create policy "Members can view their activity logs"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = activity_logs.workspace_id
      and user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTION: Get workspace member role
-- =============================================
create or replace function public.get_workspace_member_role(
  p_workspace_id uuid,
  p_user_id uuid
) returns text as $$
  select role from public.workspace_members
  where workspace_id = p_workspace_id
  and user_id = p_user_id
  limit 1;
$$ language sql security definer stable;

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- TRIGGER: updated_at timestamps
-- =============================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_workspaces_updated_at before update on public.workspaces
  for each row execute procedure public.set_updated_at();
create trigger set_instagram_accounts_updated_at before update on public.instagram_accounts
  for each row execute procedure public.set_updated_at();
create trigger set_products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
create trigger set_automations_updated_at before update on public.automations
  for each row execute procedure public.set_updated_at();
create trigger set_automation_events_updated_at before update on public.automation_events
  for each row execute procedure public.set_updated_at();

-- =============================================
-- SEED: Global categories
-- =============================================
insert into public.categories (name, description, is_global) values
  ('Posters', 'Print and digital posters', true),
  ('Apparel', 'Clothing and accessories', true),
  ('Digital Products', 'Digital downloads and files', true),
  ('Home Decor', 'Home decoration items', true),
  ('Art', 'Original artwork and prints', true);
