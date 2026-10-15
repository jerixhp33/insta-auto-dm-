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
  const account = accounts[0];
  const token = decrypt(account.encrypted_access_token);

  const { data: automations } = await supabase
    .from('automations')
    .select('*, automation_keywords(keyword), products(*)')
    .eq('workspace_id', account.workspace_id)
    .eq('instagram_account_id', account.id)
    .eq('status', 'active');

  console.log(`Active automations:`, automations.map(a => a.name));

  const mediaRes = await fetch(`https://graph.instagram.com/v19.0/me/media?fields=id,caption,permalink&limit=10&access_token=${token}`);
  const mediaList = (await mediaRes.json()).data || [];

  for (const media of mediaList) {
    const cRes = await fetch(`https://graph.instagram.com/v19.0/${media.id}/comments?fields=id,text,username,timestamp,from{id,username}&access_token=${token}`);
    const comments = (await cRes.json()).data || [];

    for (const comment of comments) {
      const commentId = comment.id;
      const text = comment.text;
      const username = comment.from?.username || comment.username;
      const fromId = comment.from?.id;

      // Check if processed
      const { data: existing } = await supabase.from('processed_events').select('id').eq('event_id', `comment:${commentId}`).maybeSingle();
      if (existing) {
        // already processed
        continue;
      }

      console.log(`\n>>> FOUND UNPROCESSED COMMENT! ID: ${commentId}, Text: "${text}", From: @${username} (${fromId}) on media ${media.id}`);

      for (const auto of automations) {
        const keywords = (auto.automation_keywords || []).map(k => k.keyword.toLowerCase());
        const matched = keywords.some(k => text.toLowerCase().includes(k));
        if (!matched) continue;

        console.log(`Matched automation "${auto.name}" with keyword! Executing...`);

        // Mark processed
        await supabase.from('processed_events').insert({ event_id: `comment:${commentId}`, workspace_id: account.workspace_id });

        // 1. Public reply
        const replyRes = await fetch(`https://graph.instagram.com/v19.0/${commentId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ message: auto.public_reply || "Thanks! Check your DM." })
        });
        const replyData = await replyRes.json();
        console.log('Public reply response:', replyData);

        // 2. DM
        const isSelf = username && username.toLowerCase() === account.username.toLowerCase();
        let dmData = null;
        if (!isSelf) {
          const dmRes = await fetch(`https://graph.instagram.com/v19.0/me/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              recipient: { comment_id: commentId },
              message: { text: "Hi " + (username?.split('_')[0] || "there") + " 👋\nHere's the product link you asked about! Tap below to view details." }
            })
          });
          dmData = await dmRes.json();
          console.log('DM response:', dmData);
        }

        // 3. Like
        await fetch(`https://graph.instagram.com/v19.0/${commentId}/likes`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null);

        // 4. Save event
        await supabase.from('automation_events').insert({
          workspace_id: account.workspace_id,
          automation_id: auto.id,
          instagram_account_id: account.id,
          commenter_ig_id: fromId || null,
          commenter_username: username || null,
          comment_text: text,
          comment_ig_id: commentId,
          keyword_matched: 'link',
          status: 'success',
          public_reply_status: replyData.id ? 'success' : 'failed',
          dm_status: dmData?.message_id ? 'success' : 'failed',
          processed_at: new Date().toISOString()
        });

        // 5. Update counts
        await supabase.from('automations').update({
          trigger_count: (auto.trigger_count || 0) + 1,
          success_count: (auto.success_count || 0) + 1
        }).eq('id', auto.id);

        console.log(`Successfully processed comment ${commentId}!`);
        break;
      }
    }
  }
}

testSync().catch(console.error);
