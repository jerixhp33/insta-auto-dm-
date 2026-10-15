const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[trimmed.slice(0, idx).trim()] = v;
  }
}

function decrypt(ciphertext) {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const data = Buffer.from(ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 16));
  decipher.setAuthTag(data.subarray(16, 32));
  return decipher.update(data.subarray(32), undefined, 'utf8') + decipher.final('utf8');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testSync() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('*').eq('status', 'connected');
  console.log(`Found ${accounts.length} connected accounts`);

  for (const account of accounts) {
    const token = decrypt(account.encrypted_access_token);

    const { data: automations } = await supabase
      .from('automations')
      .select('id, name, public_reply, private_message, product_id, dm_enabled, public_reply_enabled, reply_to_all, instagram_media_id, automation_keywords(keyword), products(name, price, url, currency)')
      .eq('workspace_id', account.workspace_id)
      .eq('instagram_account_id', account.id)
      .eq('status', 'active');

    console.log(`Account ${account.username} has ${automations?.length || 0} active automations:`, JSON.stringify(automations, null, 2));

    // Fetch media
    const mediaRes = await fetch(`https://graph.instagram.com/v19.0/me/media?fields=id,caption,permalink&limit=10&access_token=${token}`);
    const mediaData = await mediaRes.json();
    console.log(`Found ${mediaData.data?.length || 0} media items`);

    for (const media of mediaData.data || []) {
      const cRes = await fetch(`https://graph.instagram.com/v19.0/${media.id}/comments?fields=id,text,username,timestamp,from{id,username}&access_token=${token}`);
      const cData = await cRes.json();
      console.log(`Media ${media.id} has ${cData.data?.length || 0} comments:`, cData.data?.map(c => ({ id: c.id, text: c.text, from: c.from })));
    }
  }
}

testSync().catch(console.error);
