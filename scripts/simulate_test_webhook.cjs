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

async function main() {
  const payload = {
    object: "instagram",
    entry: [
      {
        id: "17841451251258608",
        time: Date.now(),
        changes: [
          {
            field: "comments",
            value: {
              id: "test_comment_" + Date.now(),
              text: "link please",
              from: {
                id: "1234567890_test",
                username: "wtfs_jeri"
              },
              media: {
                id: "18017548511738555"
              }
            }
          }
        ]
      }
    ]
  };

  const rawBody = JSON.stringify(payload);
  const secret = env.META_APP_SECRET || "2b54781f08c0bc6e593b1036e1ee7b79";
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  console.log("Sending signed test webhook to Vercel...");
  const res = await fetch("https://insta-auto-dm-six.vercel.app/api/webhooks/instagram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature
    },
    body: rawBody
  });

  console.log("Vercel HTTP Status:", res.status);
  console.log("Vercel Response:", await res.text());
}

main().catch(console.error);
