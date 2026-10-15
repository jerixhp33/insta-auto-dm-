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

async function checkApp(appId, appSecret, label) {
  console.log(`\n=== Checking ${label} (${appId}) ===`);
  const appToken = `${appId}|${appSecret}`;
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${appId}/subscriptions?access_token=${appToken}`);
    const data = await res.json();
    console.log(`Subscriptions for ${appId}:`, JSON.stringify(data, null, 2));

    // Also check app details
    const appRes = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=id,name,link,app_type&access_token=${appToken}`);
    const appData = await appRes.json();
    console.log(`App info for ${appId}:`, appData);
  } catch (e) {
    console.error(`Error checking ${appId}:`, e.message);
  }
}

async function main() {
  await checkApp(env.META_APP_ID || '1506683824603194', env.META_APP_SECRET || '2b54781f08c0bc6e593b1036e1ee7b79', 'Meta App 1506683824603194');
  await checkApp(env.INSTAGRAM_APP_ID || '1647540866708249', env.INSTAGRAM_APP_SECRET || '7adc6a07016270d19df770390521a4d8', 'Instagram App 1647540866708249');
}

main().catch(console.error);
