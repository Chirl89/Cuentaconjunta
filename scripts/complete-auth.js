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
