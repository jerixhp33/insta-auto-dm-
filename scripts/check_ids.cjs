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

  console.log('--- Checking ID 17841451251258608 ---');
  const r1 = await fetch(`https://graph.instagram.com/v19.0/17841451251258608?fields=id,username&access_token=${token}`);
  console.log(await r1.json());

  console.log('--- Checking ID 28862108093474388 ---');
  const r2 = await fetch(`https://graph.instagram.com/v19.0/28862108093474388?fields=id,username&access_token=${token}`);
  console.log(await r2.json());

  console.log('--- Checking subscribed apps on 17841451251258608 ---');
  const s1 = await fetch(`https://graph.instagram.com/v19.0/17841451251258608/subscribed_apps?access_token=${token}`);
  console.log(await s1.json());

  console.log('--- Checking subscribed apps on 28862108093474388 ---');
  const s2 = await fetch(`https://graph.instagram.com/v19.0/28862108093474388/subscribed_apps?access_token=${token}`);
  console.log(await s2.json());

  console.log('--- Subscribing 28862108093474388 ---');
  const sub2 = await fetch(`https://graph.instagram.com/v19.0/28862108093474388/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, subscribed_fields: ['comments', 'messages'] })
  });
  console.log(await sub2.json());
}

main().catch(console.error);
