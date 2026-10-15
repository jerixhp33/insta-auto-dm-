const { Client } = require('pg');

const connectionString = 'postgresql://postgres.wxagcyiuijjaenokdnwr:manikandan17@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Connected to Postgres.');

  const sql = `
    -- Helper function to check member role
    create or replace function public.is_workspace_editor(ws_id uuid)
    returns boolean as $$
      select exists (
        select 1 from public.workspace_members
        where workspace_id = ws_id
        and user_id = auth.uid()
        and role in ('owner', 'admin', 'editor')
      );
    $$ language sql security definer;

    -- PRODUCTS
    drop policy if exists "Members can insert products" on public.products;
    create policy "Members can insert products" on public.products
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update products" on public.products;
    create policy "Members can update products" on public.products
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete products" on public.products;
    create policy "Members can delete products" on public.products
      for delete using (public.is_workspace_editor(workspace_id));

    -- PRODUCT IMAGES
    drop policy if exists "Members can insert product images" on public.product_images;
    create policy "Members can insert product images" on public.product_images
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update product images" on public.product_images;
    create policy "Members can update product images" on public.product_images
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete product images" on public.product_images;
    create policy "Members can delete product images" on public.product_images
      for delete using (public.is_workspace_editor(workspace_id));

    -- CATEGORIES
    drop policy if exists "Members can insert categories" on public.categories;
    create policy "Members can insert categories" on public.categories
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update categories" on public.categories;
    create policy "Members can update categories" on public.categories
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete categories" on public.categories;
    create policy "Members can delete categories" on public.categories
      for delete using (public.is_workspace_editor(workspace_id));

    -- AUTOMATIONS
    drop policy if exists "Members can insert automations" on public.automations;
    create policy "Members can insert automations" on public.automations
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update automations" on public.automations;
    create policy "Members can update automations" on public.automations
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete automations" on public.automations;
    create policy "Members can delete automations" on public.automations
      for delete using (public.is_workspace_editor(workspace_id));

    -- AUTOMATION KEYWORDS
    drop policy if exists "Members can insert automation keywords" on public.automation_keywords;
    create policy "Members can insert automation keywords" on public.automation_keywords
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update automation keywords" on public.automation_keywords;
    create policy "Members can update automation keywords" on public.automation_keywords
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete automation keywords" on public.automation_keywords;
    create policy "Members can delete automation keywords" on public.automation_keywords
      for delete using (public.is_workspace_editor(workspace_id));

    -- INSTAGRAM ACCOUNTS
    drop policy if exists "Members can insert instagram accounts" on public.instagram_accounts;
    create policy "Members can insert instagram accounts" on public.instagram_accounts
      for insert with check (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can update instagram accounts" on public.instagram_accounts;
    create policy "Members can update instagram accounts" on public.instagram_accounts
      for update using (public.is_workspace_editor(workspace_id));

    drop policy if exists "Members can delete instagram accounts" on public.instagram_accounts;
    create policy "Members can delete instagram accounts" on public.instagram_accounts
      for delete using (public.is_workspace_editor(workspace_id));
  `;

  await client.query(sql);
  console.log('All CRUD policies applied successfully!');

  await client.end();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
