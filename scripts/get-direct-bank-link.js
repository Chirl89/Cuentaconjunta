/**
 * FitDuo / CuentaConjunta - Get Direct Bank Redsys OAuth URL
 * 
 * Bypasses Tilisy's client-side cookie hurdles by completing the consent
 * handshake server-side and returning the DIRECT Bankinter/BBVA/etc. OAuth URL.
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

function normalizeBankName(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('revolut')) return 'Revolut';
  if (lower.includes('bankinter')) return 'Bankinter';
  if (lower.includes('santander')) return 'Banco Santander';
  if (lower.includes('bbva')) return 'BBVA';
  if (lower.includes('caixa')) return 'CaixaBank';
  if (lower.includes('ing')) return 'ING';
  if (lower.includes('sabadell')) return 'Banco Sabadell';
  if (lower.includes('openbank')) return 'Openbank';
  if (lower.includes('n26')) return 'N26';
  return name;
}

async function getDirectBankLink(bankName = 'Bankinter') {
  const aspspName = normalizeBankName(bankName);
  const appId = process.env.ENABLEBANKING_APP_ID || '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  let privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;
  if (!privateKey) {
    const keyFile = path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem');
    if (fs.existsSync(keyFile)) {
      privateKey = fs.readFileSync(keyFile, 'utf8');
    }
  }

  let cleanPem = privateKey.replace(/\\n/g, '\n').trim();
  if (!cleanPem.includes('-----BEGIN')) {
    cleanPem = `-----BEGIN PRIVATE KEY-----\n${cleanPem}\n-----END PRIVATE KEY-----`;
  }
  const key = await importPKCS8(cleanPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: appId })
    .sign(key);

  // 1. Create auth session (all accounts and cards)
  const accessObj = {
    valid_until: new Date(Date.now() + 90 * 86400000).toISOString(),
    balances: true,
    transactions: true,
  };

  const res = await fetch('https://api.enablebanking.com/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      access: accessObj,
      aspsp: { name: aspspName, country: 'ES' },
      psu_type: 'personal',
      state: `${aspspName.toLowerCase()}_${Date.now()}`,
      redirect_url: 'https://chirl89.github.io/Cuentaconjunta/',
    }),
  });

  const data = await res.json();
  const sessId = data.authorization_id;
  const cookie = `sessionid=${sessId}`;

  // 2. Automatically confirm data sharing consent
  await fetch('https://tilisy.enablebanking.com/ais/confirm_data_sharing_consent', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({}),
  });

  // 3. Start authorization
  await fetch('https://tilisy.enablebanking.com/ais/start_authorization', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({}),
  });

  // 4. Retrieve direct bank redirect_url
  const statusRes = await fetch('https://tilisy.enablebanking.com/ais/get_session_status', {
    headers: {
      Cookie: cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const statusJson = await statusRes.json();
  const directBankUrl = statusJson?.response?.redirect_url;

  console.log('================================================================');
  console.log(`🏦 BANCO: ${bankName}`);
  console.log(`🔑 SESSION ID: ${sessId}`);
  if (directBankUrl) {
    console.log(`🔗 ENLACE DIRECTO A LA PASARELA DE ${bankName.toUpperCase()}:`);
    console.log(directBankUrl);
  } else {
    console.log(`🔗 ENLACE DE ACCESO:`);
    console.log(data.url);
  }
  console.log('================================================================');

  return { sessId, directBankUrl: directBankUrl || data.url };
}

if (require.main === module) {
  const targetBank = process.argv[2] || 'Bankinter';
  getDirectBankLink(targetBank).catch(console.error);
}

module.exports = { getDirectBankLink };
