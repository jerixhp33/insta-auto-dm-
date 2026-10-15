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

  console.log('--- GET /me/subscribed_apps with fields ---');
  const r1 = await fetch(`https://graph.instagram.com/v19.0/me/subscribed_apps?access_token=${token}`);
  console.log(await r1.json());

  console.log('--- Checking reel comments from live API for reel 18017548511738555 ---');
  const r2 = await fetch(`https://graph.instagram.com/v19.0/18017548511738555/comments?fields=id,text,username,timestamp,from&access_token=${token}`);
  console.log(await r2.json());

  console.log('--- Testing live Vercel webhook GET handshake ---');
  const r3 = await fetch(`https://insta-auto-dm-six.vercel.app/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${env.META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=test_12345`);
  console.log('Vercel handshake response status:', r3.status, await r3.text());
}

main().catch(console.error);
