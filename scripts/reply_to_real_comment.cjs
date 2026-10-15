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

  const commentId = '18207775555369362'; // wtfs_jeri's comment "link"
  console.log(`Processing comment ${commentId}...`);

  // 1. Send public reply
  console.log('Sending public reply to comment ' + commentId + '...');
  const replyRes = await fetch(`https://graph.instagram.com/v19.0/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ message: "Thanks ❤️ I've sent you the details in DM!" })
  });
  const replyData = await replyRes.json();
  console.log('Public reply response:', replyData);

  // 2. Send private DM
  console.log('Sending private DM for comment ' + commentId + '...');
  const dmRes = await fetch(`https://graph.instagram.com/v19.0/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: "Hi 👋 Here's the product link you asked about! Tap below to view details." }
    })
  });
  const dmData = await dmRes.json();
  console.log('Private DM response:', dmData);

  // 3. Like comment
  console.log('Liking comment ' + commentId + '...');
  const likeRes = await fetch(`https://graph.instagram.com/v19.0/${commentId}/likes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Like response:', await likeRes.json());
}

main().catch(console.error);
