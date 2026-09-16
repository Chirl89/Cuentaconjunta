/**
 * FitDuo / CuentaConjunta - Bank Synchronization Background Worker
 * 
 * Runs autonomously via GitHub Actions Cron every 4 hours or on demand.
 * 1. Signs Enable Banking AIS API requests using RSA Private Key.
 * 2. Fetches transactions and updated balances from connected banks (Bankinter, BBVA, Revolut, etc.).
 * 3. Categorizes and normalizes movements into the common schema.
 * 4. Updates public/data/bank-feed.json (read by the webapp on load/mobile).
 * 5. Broadcasts live update to Supabase Realtime household room.
 */

const fs = require('fs');
const path = require('path');
const { importPKCS8, SignJWT } = require('jose');
const { createClient } = require('@supabase/supabase-js');

// Auto-categorization rules
function detectCategory(concept) {
  const c = (concept || '').toLowerCase();
  if (c.includes('mercadona') || c.includes('carrefour') || c.includes('lidl') || c.includes('dia') || c.includes('alcampo') || c.includes('supermercado') || c.includes('consum') || c.includes('aldi')) {
    return { name: 'Supermercado', color: '#00D09C' };
  }
  if (c.includes('iberdrola') || c.includes('endesa') || c.includes('naturgy') || c.includes('aqualia') || c.includes('comunidad') || c.includes('alquiler') || c.includes('vodafone') || c.includes('movistar') || c.includes('orange') || c.includes('digi') || c.includes('luz') || c.includes('gas') || c.includes('agua')) {
    return { name: 'Hogar & Luz', color: '#0EA5E9' };
  }
  if (c.includes('restaurante') || c.includes('bar ') || c.includes('cafeteria') || c.includes('uber eats') || c.includes('just eat') || c.includes('glovo') || c.includes('mcdonald') || c.includes('burger') || c.includes('kfc') || c.includes('cine') || c.includes('teatro') || c.includes('entradas') || c.includes('starbucks')) {
    return { name: 'Restaurantes & Ocio', color: '#F59E0B' };
  }
  if (c.includes('repsol') || c.includes('cepsa') || c.includes('bp ') || c.includes('gasolinera') || c.includes('galp') || c.includes('renfe') || c.includes('metro') || c.includes('autobus') || c.includes('uber') || c.includes('cabify') || c.includes('peaje') || c.includes('parking')) {
    return { name: 'Transporte & Gasolina', color: '#6366F1' };
  }
  return { name: 'Otros Gastos Comunes', color: '#EC4899' };
}

function formatDate(dateStr) {
  if (!dateStr) return 'Hoy';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

function formatMonthKey(dateStr) {
  if (!dateStr) return '2026-09';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '2026-09';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '2026-09';
  }
}

async function main() {
  console.log('--- FitDuo Bank Sync Worker Starting ---');
  const nowIso = new Date().toISOString();

  // 1. Resolve Private Key & App ID
  const appId = process.env.ENABLEBANKING_APP_ID || '5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f';
  let privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;

  if (!privateKey) {
    const keyFile = path.resolve(__dirname, '../5e9f0c1c-6983-4f3f-86b0-c37e9f8be32f.pem');
    if (fs.existsSync(keyFile)) {
      privateKey = fs.readFileSync(keyFile, 'utf8');
    }
  }

  if (!privateKey) {
    console.warn('⚠️ No RSA Private Key found. Check ENABLEBANKING_PRIVATE_KEY secret or .pem file.');
  }

  // 2. Generate Signed JWT for Enable Banking
  let jwt = null;
  if (privateKey) {
    try {
      let cleanPem = privateKey.replace(/\\n/g, '\n').trim();
      if (!cleanPem.includes('-----BEGIN')) {
        cleanPem = `-----BEGIN PRIVATE KEY-----\n${cleanPem}\n-----END PRIVATE KEY-----`;
      }
      const key = await importPKCS8(cleanPem, 'RS256');
      const now = Math.floor(Date.now() / 1000);
      jwt = await new SignJWT({
        iss: 'enablebanking.com',
        aud: 'api.enablebanking.com',
        iat: now,
        exp: now + 3600,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: appId })
        .sign(key);
      console.log('✅ Signed Enable Banking JWT generated successfully');
    } catch (err) {
      console.error('❌ Error generating JWT:', err.message);
    }
  }

  // 3. Load connections configuration
  const connectionsFile = path.resolve(__dirname, '../data/bank-connections.json');
  let connectionsData = { connections: [] };
  if (fs.existsSync(connectionsFile)) {
    try {
      connectionsData = JSON.parse(fs.readFileSync(connectionsFile, 'utf8'));
    } catch (e) {
      console.warn('Error reading bank-connections.json:', e.message);
    }
  }

  // 4. Load existing bank feed
  const feedFile = path.resolve(__dirname, '../public/data/bank-feed.json');
  let existingFeed = { lastSyncAt: nowIso, accounts: [], transactions: [] };
  if (fs.existsSync(feedFile)) {
    try {
      existingFeed = JSON.parse(fs.readFileSync(feedFile, 'utf8'));
    } catch (e) {
      console.warn('Error reading existing bank-feed.json:', e.message);
    }
  }

  const existingTxIds = new Set((existingFeed.transactions || []).map((t) => t.id));
  const newTransactions = [];
  const updatedAccounts = [...(existingFeed.accounts || [])];

  // 5. Query Enable Banking API for each active connection
  for (const conn of connectionsData.connections || []) {
    console.log(`📡 Checking connection for: ${conn.bankName} (${conn.ibanMask || 'No IBAN'})`);

    if (jwt && conn.sessionId) {
      try {
        const sessionRes = await fetch(`https://api.enablebanking.com/sessions/${conn.sessionId}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (Array.isArray(session.accounts)) {
            for (const acc of session.accounts) {
              const accUid = acc.uid || acc.id;

              // Fetch balances
              let balance = conn.balance || 0;
              try {
                const balRes = await fetch(`https://api.enablebanking.com/accounts/${accUid}/balances`, {
                  headers: { Authorization: `Bearer ${jwt}` },
                });
                if (balRes.ok) {
                  const balData = await balRes.json();
                  const balObj = (balData.balances || [])[0];
                  if (balObj) {
                    balance = parseFloat(balObj.balance_amount?.amount || balObj.amount || balance);
                  }
                }
              } catch (e) {
                console.warn(`Could not fetch balance for ${accUid}:`, e.message);
              }

              // Update account entry
              const existingAccIdx = updatedAccounts.findIndex((a) => a.bankName === conn.bankName);
              const accEntry = {
                id: conn.id || `acc_${conn.bankName.toLowerCase()}`,
                bankName: conn.bankName,
                accountName: conn.accountName || `Cuenta ${conn.bankName}`,
                ibanMask: conn.ibanMask || acc.account_id?.iban || 'ES•• •••• ••••',
                ownership: conn.ownership || 'USER_A',
                balance: balance,
                lastUpdated: nowIso,
              };

              if (existingAccIdx >= 0) {
                updatedAccounts[existingAccIdx] = { ...updatedAccounts[existingAccIdx], ...accEntry };
              } else {
                updatedAccounts.push(accEntry);
              }

              // Fetch transactions
              try {
                const txRes = await fetch(`https://api.enablebanking.com/accounts/${accUid}/transactions`, {
                  headers: { Authorization: `Bearer ${jwt}` },
                });
                if (txRes.ok) {
                  const txData = await txRes.json();
                  const rawTxs = txData.transactions || [];
                  for (const rt of rawTxs) {
                    const txId = `eb_${rt.transaction_id || Math.random().toString(36).substring(2, 9)}`;
                    if (!existingTxIds.has(txId)) {
                      const amountRaw = parseFloat(rt.transaction_amount?.amount || '0');
                      const concept = rt.remittance_information?.[0] || rt.creditor_name || 'Movimiento Bancario';
                      const cat = detectCategory(concept);
                      const bookingDate = rt.booking_date || rt.value_date || nowIso.split('T')[0];

                      const txItem = {
                        id: txId,
                        merchant: concept,
                        amount: Math.abs(amountRaw),
                        date: formatDate(bookingDate),
                        monthKey: formatMonthKey(bookingDate),
                        category: cat.name,
                        categoryColor: cat.color,
                        accountLabel: `${conn.bankName} (${conn.ibanMask || ''})`.trim(),
                        status: 'pending',
                        payer: conn.ownership === 'USER_B' ? 'memberB' : conn.ownership === 'JOINT' ? 'joint' : 'memberA',
                        split: '50/50',
                        isManual: false,
                        bankMovementId: rt.transaction_id,
                      };

                      newTransactions.push(txItem);
                      existingTxIds.add(txId);
                    }
                  }
                }
              } catch (e) {
                console.warn(`Could not fetch transactions for ${accUid}:`, e.message);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Error querying Enable Banking for ${conn.bankName}:`, err.message);
      }
    } else {
      // Ensure the configured connection appears in accounts feed with its baseline
      const existingAccIdx = updatedAccounts.findIndex((a) => a.bankName === conn.bankName);
      const accEntry = {
        id: conn.id || `acc_${conn.bankName.toLowerCase()}`,
        bankName: conn.bankName,
        accountName: conn.accountName || `Cuenta ${conn.bankName}`,
        ibanMask: conn.ibanMask || 'ES•• •••• ••••',
        ownership: conn.ownership || 'USER_A',
        balance: conn.balance || 0,
        lastUpdated: nowIso,
      };
      if (existingAccIdx >= 0) {
        updatedAccounts[existingAccIdx] = { ...updatedAccounts[existingAccIdx], ...accEntry };
      } else {
        updatedAccounts.push(accEntry);
      }
    }
  }

  // 6. Assemble finalized feed
  const allTransactions = [...newTransactions, ...(existingFeed.transactions || [])];
  const finalFeed = {
    lastSyncAt: nowIso,
    accounts: updatedAccounts,
    transactions: allTransactions,
  };

  fs.writeFileSync(feedFile, JSON.stringify(finalFeed, null, 2), 'utf8');
  console.log(`✅ Saved bank-feed.json with ${updatedAccounts.length} accounts and ${allTransactions.length} transactions (${newTransactions.length} new)`);

  // 7. Supabase Realtime broadcast (if available)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://egougygfqnnzfqpceggn.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_hGjr4Hb-601X2np1wi1d4g_gPGdg192';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const channel = supabase.channel('household_room_FITDUO');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'SYNC_EVENT',
        payload: {
          type: 'TRANSACTIONS_SYNC',
          inviteCode: 'FITDUO',
          senderId: 'github-actions-worker',
          timestamp: Date.now(),
          transactions: allTransactions,
          accounts: updatedAccounts,
        },
      });
      console.log('📡 Sent Supabase Realtime broadcast to household room FITDUO');
      await supabase.removeChannel(channel);
    } catch (e) {
      console.warn('Supabase Realtime broadcast warning:', e.message);
    }
  }

  console.log('--- FitDuo Bank Sync Worker Completed ---');
}

main().catch((err) => {
  console.error('Fatal error in bank sync worker:', err);
  process.exit(1);
});
