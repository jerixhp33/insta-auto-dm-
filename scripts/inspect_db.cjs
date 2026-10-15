const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('--- LATEST 10 AUTOMATION EVENTS ---');
  const { data: events, error: errEvents } = await supabase
    .from('automation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (errEvents) console.error('Error fetching events:', errEvents);
  else console.log(JSON.stringify(events, null, 2));

  console.log('\n--- AUTOMATIONS ---');
  const { data: autos, error: errAutos } = await supabase
    .from('automations')
    .select('*');
  if (errAutos) console.error('Error fetching automations:', errAutos);
  else console.log(JSON.stringify(autos, null, 2));

  console.log('\n--- INSTAGRAM ACCOUNTS ---');
  const { data: accounts, error: errAccounts } = await supabase
    .from('instagram_accounts')
    .select('*');
  if (errAccounts) console.error('Error fetching accounts:', errAccounts);
  else console.log(JSON.stringify(accounts, null, 2));

  console.log('\n--- INSTAGRAM MEDIA ---');
  const { data: media, error: errMedia } = await supabase
    .from('instagram_media')
    .select('id, instagram_media_id, caption, permalink, media_type')
    .limit(5);
  if (errMedia) console.error('Error fetching media:', errMedia);
  else console.log(JSON.stringify(media, null, 2));
}

main().catch(console.error);
