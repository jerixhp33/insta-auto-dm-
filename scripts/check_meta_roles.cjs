const fs = require('fs');
const path = require('path');

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

async function main() {
  const appId = env.META_APP_ID || '1506683824603194';
  const appSecret = env.META_APP_SECRET || '2b54781f08c0bc6e593b1036e1ee7b79';
  const appToken = `${appId}|${appSecret}`;

  const res = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=id,name,link,app_type,category&access_token=${appToken}`);
  console.log('App details:', await res.json());

  // Check roles on this app
  const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/roles?access_token=${appToken}`);
  console.log('App Roles:', await rolesRes.json());
}

main().catch(console.error);
