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

async function main() {
  const { data } = await supabase.from('processed_events').select('*').eq('event_id', 'comment:18635697478006861');
  console.log('Is 18635697478006861 in processed_events:', data);
  const { data: d2 } = await supabase.from('processed_events').select('*').eq('event_id', 'comment:18095560442137345');
  console.log('Is 18095560442137345 in processed_events:', d2);
}

main().catch(console.error);
