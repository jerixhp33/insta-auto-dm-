async function testIG(appId, appSecret, label) {
  try {
    const formData = new URLSearchParams();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', 'https://insta-auto-dm-six.vercel.app/api/instagram/callback');
    formData.append('code', 'dummy_code');

    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log(`${label} (${appId} + ${appSecret.slice(0, 6)}...):`, data);
  } catch (e) {
    console.error(label, e.message);
  }
}

async function main() {
  await testIG('1647540866708249', '7adc6a07016270d19df770390521a4d8', 'Pair 1');
  await testIG('1506683824603194', '7adc6a07016270d19df770390521a4d8', 'Pair 2');
  await testIG('1647540866708249', '2b54781f08c0bc6e593b1036e1ee7b79', 'Pair 3');
  await testIG('1506683824603194', '2b54781f08c0bc6e593b1036e1ee7b79', 'Pair 4');
}

main();
