/**
 * FitDuo / CuentaConjunta - Generate Live Enable Banking Authorization Links
 * 
 * Generates official Enable Banking PSD2 authorization links for supported banks
 * and stores them in public/data/bank-auth-links.json for instantaneous access.
 * 
 * Usage: node scripts/generate-all-auth-links.js
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');

async function main() {
  console.log('--- Generating Official Enable Banking PSD2 Auth Links ---');
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

  const banks = [
    'Revolut',
    'Bankinter',
    'BBVA',
    'Banco Santander',
    'CaixaBank',
    'ING',
    'Openbank',
    'N26',
  ];

  const links = {};

  for (const b of banks) {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: appId })
      .sign(key);

    try {
      const validUntil = new Date(Date.now() + 90 * 86400000).toISOString();
      const state = `${b.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

      const res = await fetch('https://api.enablebanking.com/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          access: {
            balances: true,
            transactions: true,
            valid_until: validUntil,
          },
          aspsp: { name: b, country: 'ES' },
          psu_type: 'personal',
          state,
          redirect_url: 'https://chirl89.github.io/Cuentaconjunta/',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        links[b] = {
          bankName: b,
          url: data.url,
          authorizationId: data.authorization_id || data.session_id || state,
          createdAt: new Date().toISOString(),
          expiresAt: validUntil,
        };
        console.log(`✅ [${b}]: ${data.url}`);
      } else {
        const err = await res.text();
        console.warn(`⚠️ [${b}] Status ${res.status}:`, err);
      }
    } catch (err) {
      console.error(`❌ [${b}]:`, err.message);
    }
  }

  const outDir = path.resolve(__dirname, '../public/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bank-auth-links.json'), JSON.stringify(links, null, 2), 'utf8');
  console.log(`\n🎉 public/data/bank-auth-links.json actualizado con éxito con ${Object.keys(links).length} entidades bancarias.`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
