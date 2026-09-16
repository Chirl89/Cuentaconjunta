const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

async function testTilisyFlow() {
  const appId = '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  const pem = fs.readFileSync(path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem'), 'utf8');
  const key = await importPKCS8(pem, 'RS256');
  const jwt = await new SignJWT({
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }).setProtectedHeader({ alg: 'RS256', kid: appId }).sign(key);

  const res = await fetch('https://api.enablebanking.com/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
    body: JSON.stringify({
      access: { valid_until: new Date(Date.now() + 90 * 86400000).toISOString(), balances: true, transactions: true },
      aspsp: { name: 'Bankinter', country: 'ES' },
      psu_type: 'personal',
      state: 'tilisy_' + Date.now(),
      redirect_url: 'https://chirl89.github.io/Cuentaconjunta/'
    })
  });
  const data = await res.json();
  const sessId = data.authorization_id;
  console.log('Session ID:', sessId);

  // 1. Initial cookie
  const cookie = `sessionid=${sessId}`;

  // 2. Call /ais/get_session_status
  const statusRes = await fetch('https://tilisy.enablebanking.com/ais/get_session_status', {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({})
  });
  console.log('/ais/get_session_status status:', statusRes.status);
  const statusData = await statusRes.text();
  console.log('/ais/get_session_status data:', statusData);
}

testTilisyFlow().catch(console.error);
