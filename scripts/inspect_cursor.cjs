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

  console.log('--- Fetching with before cursor ---');
  const beforeCursor = 'QVFIVHdnNWZAtYWdTcld5UlRwdXRNbW05Yi1nSkttUy0wemlROE5sREc3a3pLb2ViR3I5aDFnMkNSQ0F5bDl1VTNzb1h3aFFIVS00cHFTTDBiMUNYUGRQTUx3';
  const r1 = await fetch(`https://graph.instagram.com/v19.0/18017548511738555/comments?before=${beforeCursor}&fields=id,text,timestamp,username&access_token=${token}`);
  console.log('Cursor before:', await r1.json());

  console.log('--- Subscribed fields details on app ---');
  const r2 = await fetch(`https://graph.instagram.com/v19.0/me/subscribed_apps?fields=id,name,subscribed_fields&access_token=${token}`);
  console.log('Subscribed apps detail:', JSON.stringify(await r2.json(), null, 2));
}

main().catch(console.error);
