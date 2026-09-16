const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

async function testTilisySession(bankName = 'Bankinter') {
  const appId = '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  const pem = fs.readFileSync(path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem'), 'utf8');
  const key = await importPKCS8(pem, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600
  }).setProtectedHeader({ alg: 'RS256', kid: appId }).sign(key);

  const res = await fetch('https://api.enablebanking.com/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
    body: JSON.stringify({
      access: { valid_until: new Date(Date.now() + 90 * 86400000).toISOString(), balances: true, transactions: true },
      aspsp: { name: bankName, country: 'ES' },
      psu_type: 'personal',
      state: 'tilisy_debug_' + Date.now(),
      redirect_url: 'https://chirl89.github.io/Cuentaconjunta/'
    })
  });
  const data = await res.json();
  const sessId = data.authorization_id;
  console.log(`[${bankName}] Session ID:`, sessId);

  const getSess = await fetch('https://tilisy.enablebanking.com/ais/get_session', {
    headers: {
      Cookie: 'sessionid=' + sessId,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log(`[${bankName}] /ais/get_session status:`, getSess.status);
  const sessData = await getSess.json().catch(e => null);
  console.log(`[${bankName}] Session Data:`, JSON.stringify(sessData, null, 2));
}

async function run() {
  await testTilisySession('Bankinter');
  await testTilisySession('BBVA');
}

run().catch(console.error);
