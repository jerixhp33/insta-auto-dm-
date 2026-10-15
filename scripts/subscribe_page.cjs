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

async function subscribePage() {
  const appId = env.META_APP_ID || '1506683824603194';
  const appSecret = env.META_APP_SECRET || '2b54781f08c0bc6e593b1036e1ee7b79';
  const appToken = `${appId}|${appSecret}`;
  const callbackUrl = 'https://insta-auto-dm-six.vercel.app/api/webhooks/instagram';
  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN || 'autome_webhook_verify_token_98741';

  console.log('Subscribing Meta App to Page feed webhooks...');
  const params = new URLSearchParams({
    object: 'page',
    callback_url: callbackUrl,
    fields: 'feed,mention',
    verify_token: verifyToken,
    access_token: appToken,
  });

  const res = await fetch(`https://graph.facebook.com/v19.0/${appId}/subscriptions`, {
    method: 'POST',
    body: params,
  });

  const data = await res.json();
  console.log('Subscribe Page response:', data);
}

subscribePage().catch(console.error);
