const appId = '1506683824603194';
const oldSecret = '2b54781f08c0bc6e593b1036e1ee7b79';
const newSecret = '7adc6a07016270d19df770390521a4d8';

async function testSecret(secret, label) {
  try {
    const res = await fetch(`https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${secret}&grant_type=client_credentials`);
    const data = await res.json();
    console.log(`${label} result:`, data);
  } catch (e) {
    console.error(`${label} error:`, e.message);
  }
}

async function main() {
  await testSecret(oldSecret, 'Old Secret (2b54...)');
  await testSecret(newSecret, 'New Secret (7adc...)');

  // Also test with app ID 1647540866708249 if 1506683824603194 doesn't match
  const altAppId = '1647540866708249';
  console.log('\nTesting with Alt App ID (1647540866708249):');
  try {
    const res = await fetch(`https://graph.facebook.com/oauth/access_token?client_id=${altAppId}&client_secret=${newSecret}&grant_type=client_credentials`);
    const data = await res.json();
    console.log('Alt App ID + new secret result:', data);
  } catch (e) {
    console.error('Alt App ID error:', e.message);
  }
}

main();
