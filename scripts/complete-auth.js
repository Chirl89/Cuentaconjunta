/**
 * FitDuo / CuentaConjunta - Complete Bank Authorization Script
 * 
 * Exchanges authorization code returned by the bank after user consent
 * for a permanent 90-day AIS session in Enable Banking, saves the session
 * into data/bank-connections.json, and triggers synchronization.
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');
const { execSync } = require('child_process');

async function main() {
  const args = process.argv.slice(2);
  let code = null;
  let bankName = 'Bankinter';

  let psuIp = null;
  let psuUserAgent = null;

  for (const arg of args) {
    if (arg.startsWith('--code=')) code = arg.replace('--code=', '').trim();
    if (arg.startsWith('--bank=')) bankName = arg.replace('--bank=', '').trim();
    if (arg.startsWith('--psu-ip=')) psuIp = arg.replace('--psu-ip=', '').trim();
    if (arg.startsWith('--psu-ua=')) psuUserAgent = decodeURIComponent(arg.replace('--psu-ua=', '').trim());
  }

  if (!code && process.env.AUTH_CODE) {
    code = process.env.AUTH_CODE.trim();
  }
  if (process.env.BANK_NAME) {
    bankName = process.env.BANK_NAME.trim();
  }

  if (!code) {
    console.error('❌ Error: Falta el parámetro --code=XXX (o variable AUTH_CODE)');
    console.log('Uso: node scripts/complete-auth.js --code=TU_CODIGO [--bank=Bankinter]');
    process.exit(1);
  }

  console.log(`📡 Exchanging authorization code for bank: ${bankName}...`);

  // 1. Resolve RSA Private Key & App ID
  const appId = process.env.ENABLEBANKING_APP_ID || '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  const DEFAULT_ENABLEBANKING_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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
UhoixXqLDzO0zSZODQw/w7Sb6OgMdEY=
-----END PRIVATE KEY-----`.trim();

  if (!privateKey) {
    const keyFile = path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem');
    if (fs.existsSync(keyFile)) {
      privateKey = fs.readFileSync(keyFile, 'utf8');
    } else {
      privateKey = DEFAULT_ENABLEBANKING_PRIVATE_KEY;
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

  if (!psuIp) {
    try {
      const ipRes = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        psuIp = ipData.ip;
      }
    } catch {}
    if (!psuIp) psuIp = '87.221.33.127';
  }
  if (!psuUserAgent) {
    psuUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
  }

  console.log(`🌐 PSU Context: IP=${psuIp}`);

  // 2. Exchange code for session via POST /sessions
  const sessionHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
  if (psuIp) sessionHeaders['psu-ip-address'] = psuIp;
  if (psuUserAgent) sessionHeaders['psu-user-agent'] = psuUserAgent;

  const res = await fetch('https://api.enablebanking.com/sessions', {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ Error ${res.status} al crear la sesión en Enable Banking:`, errText);
    process.exit(1);
  }

  const session = await res.json();
  console.log('✅ Sesión bancaria creada con éxito en Enable Banking:');
  console.log(`   Session ID: ${session.session_id}`);
  console.log(`   Cuentas autorizadas: ${(session.accounts || []).length}`);

  // 3. Save connection into data/bank-connections.json
  const connFile = path.resolve(__dirname, '../data/bank-connections.json');
  let connsData = { connections: [] };
  if (fs.existsSync(connFile)) {
    try {
      connsData = JSON.parse(fs.readFileSync(connFile, 'utf8'));
    } catch {}
  }

  const existingIdx = connsData.connections.findIndex(
    (c) => c.bankName.toLowerCase() === bankName.toLowerCase()
  );

  const existingConn = existingIdx >= 0 ? connsData.connections[existingIdx] : null;
  const accountInfo = (session.accounts || [])[0] || {};
  let iban = typeof accountInfo === 'object' ? accountInfo.account_id?.iban : null;
  if (!iban && session.accounts_data && session.accounts_data[0]) {
    iban = session.accounts_data[0].account_id?.iban;
  }
  if (!iban && existingConn?.ibanMask) {
    iban = existingConn.ibanMask;
  }
  if (!iban) {
    if (bankName.toLowerCase().includes('bankinter')) {
      iban = 'ES9301280082940100030803';
    } else {
      iban = `ES•• •••• •••• (${bankName})`;
    }
  }

  const safeId = `acc_${bankName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/_$/, '')}`;
  const newConn = {
    id: safeId,
    bankName: bankName,
    accountName: `Cuenta ${bankName}`,
    ibanMask: iban,
    ownership: existingConn?.ownership || 'USER_A',
    institutionId: safeId,
    sessionId: session.session_id,
    accounts: session.accounts || [],
    accounts_data: session.accounts_data || existingConn?.accounts_data || [],
    status: 'active',
    authorizedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncAt: null,
  };

  if (existingIdx >= 0) {
    connsData.connections[existingIdx] = {
      ...connsData.connections[existingIdx],
      ...newConn,
    };
  } else {
    connsData.connections.push(newConn);
  }

  fs.writeFileSync(connFile, JSON.stringify(connsData, null, 2), 'utf8');
  console.log('✅ Conexión guardada en data/bank-connections.json');

  // 4. Run sync-banks.js immediately to fetch transactions and balances
  console.log('🔄 Ejecutando sincronización de movimientos bancarios...');
  try {
    let syncCmd = 'node scripts/sync-banks.js';
    if (psuIp) syncCmd += ` --psu-ip="${psuIp}"`;
    if (psuUserAgent) syncCmd += ` --psu-ua="${encodeURIComponent(psuUserAgent)}"`;
    execSync(syncCmd, { stdio: 'inherit' });
    console.log('🎉 Sincronización completada con éxito.');
  } catch (err) {
    console.warn('Advertencia al sincronizar:', err.message);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
