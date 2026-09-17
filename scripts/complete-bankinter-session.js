const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');
const { execSync } = require('child_process');

async function main() {
  const sessionId = process.argv[2] || '99649203-b0ad-4f69-be35-f0eb15b3283a';
  console.log(`📡 Monitoring Tilisy session: ${sessionId}...`);

  const res = await fetch('https://tilisy.enablebanking.com/ais/get_session_status', {
    headers: {
      Cookie: `sessionid=${sessionId}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const body = await res.json().catch(e => null);
  console.log('Session Status Response:', JSON.stringify(body, null, 2));

  if (!body?.response?.redirect_url) {
    console.log('Session is not yet completed or has no redirect_url.');
    return;
  }

  const redirectUrl = body.response.redirect_url;
  console.log('Redirect URL:', redirectUrl);

  const urlObj = new URL(redirectUrl);
  const code = urlObj.searchParams.get('code');
  const state = urlObj.searchParams.get('state');

  console.log('Extracted code:', code);
  console.log('Extracted state:', state);

  if (!code) {
    console.log('No code found in redirect URL.');
    return;
  }

  // Follow redirect_url if it is an auth_redirect
  if (redirectUrl.includes('/auth_redirect')) {
    console.log('Following auth_redirect to check destination...');
    const redirectRes = await fetch(redirectUrl, { redirect: 'manual' });
    console.log('auth_redirect HTTP Status:', redirectRes.status);
    const location = redirectRes.headers.get('location');
    console.log('Location header:', location);

    if (location) {
      const finalUrl = new URL(location);
      const finalCode = finalUrl.searchParams.get('code');
      const finalError = finalUrl.searchParams.get('error');

      console.log('Final code:', finalCode);
      console.log('Final error:', finalError);

      if (finalCode) {
        console.log('🎉 SUCCESS! Final Enable Banking code obtained:', finalCode);
        execSync(`node scripts/complete-auth.js --code=${finalCode} --bank=Bankinter`, { stdio: 'inherit' });
        return;
      }
    }
  }

  // Try exchanging directly
  console.log('Attempting session exchange with code:', code);
  try {
    execSync(`node scripts/complete-auth.js --code=${code} --bank=Bankinter`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Exchange failed:', err.message);
  }
}

main().catch(console.error);
