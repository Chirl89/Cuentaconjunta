/**
 * FitDuo / CuentaConjunta - Generate Bank Authorization Link
 * 
 * Generates an official Enable Banking authorization URL for any supported bank.
 * Usage: node scripts/generate-auth-link.js [BankName]
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

async function main() {
  const bankName = process.argv[2] || 'Bankinter';
  const appId = process.env.ENABLEBANKING_APP_ID || '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  
  let privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;
  if (!privateKey) {
    const keyFile = path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem');
    if (fs.existsSync(keyFile)) {
      privateKey = fs.readFileSync(keyFile, 'utf8');
    }
  }

  if (!privateKey) {
    console.error('❌ No se encontró la clave RSA privada (.pem)');
    process.exit(1);
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

  const res = await fetch('https://api.enablebanking.com/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      access: {
        valid_until: new Date(Date.now() + 90 * 86400000).toISOString(),
        accounts: [{ iban: 'ES9301280082940100030803' }],
        balances: true,
        transactions: true,
      },
      aspsp: { name: bankName, country: 'ES' },
      psu_type: 'personal',
      state: `${bankName.toLowerCase()}_${Date.now()}`,
      redirect_url: 'https://chirl89.github.io/Cuentaconjunta/',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ Error ${res.status} al solicitar enlace para ${bankName}:`, errText);
    process.exit(1);
  }

  const data = await res.json();
  console.log('----------------------------------------------------');
  console.log(`🏦 Entidad Bancaria: ${bankName}`);
  console.log(`🔗 Enlace oficial de autorización (PSD2):`);
  console.log(data.url);
  console.log('----------------------------------------------------');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
