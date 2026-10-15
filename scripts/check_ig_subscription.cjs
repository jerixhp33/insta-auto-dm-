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
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

function decrypt(ciphertext) {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('*');
  const account = accounts[0];
  const token = decrypt(account.encrypted_access_token);
  console.log('Account username:', account.username);
  console.log('IG user id:', account.instagram_user_id);
  console.log('Token starts with:', token.slice(0, 15) + '...');

  // 1. Inspect me
  const meRes = await fetch(`https://graph.instagram.com/v19.0/me?fields=id,username,account_type&access_token=${token}`);
  const meData = await meRes.json();
  console.log('\n--- GET /me ---');
  console.log(meData);

  // 2. Check subscribed_apps on graph.instagram.com
  const subRes = await fetch(`https://graph.instagram.com/v19.0/${account.instagram_user_id}/subscribed_apps?access_token=${token}`);
  const subData = await subRes.json();
  console.log('\n--- GET /${id}/subscribed_apps (graph.instagram.com) ---');
  console.log(subData);

  // Try POST subscribed_apps on graph.instagram.com
  const postSubRes = await fetch(`https://graph.instagram.com/v19.0/${account.instagram_user_id}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, subscribed_fields: ['comments', 'messages', 'messaging_postbacks'] })
  });
  const postSubData = await postSubRes.json();
  console.log('\n--- POST /${id}/subscribed_apps (graph.instagram.com) ---');
  console.log(postSubData);

  // Try on graph.facebook.com
  const fbSubRes = await fetch(`https://graph.facebook.com/v19.0/${account.instagram_user_id}/subscribed_apps?access_token=${token}`);
  const fbSubData = await fbSubRes.json();
  console.log('\n--- GET /${id}/subscribed_apps (graph.facebook.com) ---');
  console.log(fbSubData);

  const fbPostSubRes = await fetch(`https://graph.facebook.com/v19.0/${account.instagram_user_id}/subscribed_apps?subscribed_fields=comments,messages&access_token=${token}`, {
    method: 'POST'
  });
  const fbPostSubData = await fbPostSubRes.json();
  console.log('\n--- POST /${id}/subscribed_apps (graph.facebook.com) ---');
  console.log(fbPostSubData);

  // Check recent comments on media
  const mediaRes = await fetch(`https://graph.instagram.com/v19.0/18017548511738555/comments?fields=id,text,username,timestamp,from&access_token=${token}`);
  const mediaData = await mediaRes.json();
  console.log('\n--- RECENT COMMENTS ON REEL 18017548511738555 ---');
  console.log(JSON.stringify(mediaData, null, 2));
}

main().catch(console.error);
