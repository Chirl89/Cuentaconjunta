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

function cleanConcept(raw) {
  if (!raw) return 'Movimiento Bancario';
  let s = String(raw).trim();
  s = s.replace(/^\/TXT\/[DH]\|/i, '');
  s = s.replace(/^\/TXT\//i, '');
  s = s.replace(/^RECIBO?\s*\/?/i, 'Recibo ');
  s = s.replace(/^TRANSF?\s*(NOMI|DE)?\s*\/?/i, 'Transferencia ');
  s = s.replace(/^PAGO BIZUM A\s*/i, 'Bizum a ');
  s = s.replace(/^\/\s*/, '');
  return s.trim() || raw;
}

// Auto-categorization rules
function detectCategory(concept) {
  const c = (concept || '').toLowerCase();
  if (c.includes('mercadona') || c.includes('carrefour') || c.includes('lidl') || c.includes('dia') || c.includes('alcampo') || c.includes('supermercado') || c.includes('consum') || c.includes('aldi')) {
    return { name: 'Supermercado', color: '#00D09C' };
  }
  if (c.includes('iberdrola') || c.includes('endesa') || c.includes('naturgy') || c.includes('aqualia') || c.includes('comunidad') || c.includes('alquiler') || c.includes('testa') || c.includes('socimi') || c.includes('vodafone') || c.includes('movistar') || c.includes('orange') || c.includes('digi') || c.includes('luz') || c.includes('gas') || c.includes('agua')) {
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
  const args = process.argv.slice(2);
  let psuIp = process.env.PSU_IP || null;
  let psuUserAgent = process.env.PSU_USER_AGENT || null;
  for (const arg of args) {
    if (arg.startsWith('--psu-ip=')) psuIp = arg.replace('--psu-ip=', '').trim();
    if (arg.startsWith('--psu-ua=')) psuUserAgent = decodeURIComponent(arg.replace('--psu-ua=', '').trim());
  }

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

  console.log(`🌐 Worker PSU Context: IP=${psuIp}`);

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
    if (jwt && conn.sessionId) {
      try {
        const baseHeaders = {
          Authorization: `Bearer ${jwt}`,
          ...(psuIp ? { 'Psu-Ip-Address': psuIp } : {}),
          ...(psuUserAgent ? { 'Psu-User-Agent': psuUserAgent } : {}),
        };
        const sessionRes = await fetch(`https://api.enablebanking.com/sessions/${conn.sessionId}`, {
          headers: baseHeaders,
        });

        let session = null;
        if (sessionRes.ok) {
          session = await sessionRes.json();
        }

        const accountsList = (session && Array.isArray(session.accounts) && session.accounts.length > 0)
          ? session.accounts
          : (conn.accounts || []);

        if (accountsList.length > 0) {
          for (const acc of accountsList) {
            const accUid = typeof acc === 'string' ? acc : (acc?.uid || acc?.id);
              if (!accUid) {
                console.warn('⚠️ Could not resolve accUid from account item:', acc);
                continue;
              }
              const accountHeaders = {
                Authorization: `Bearer ${jwt}`,
              };

              // Fetch transactions FIRST (primary goal, avoids session cancellation)
              try {
                let continuationKey = null;
                let page = 0;
                let totalTxsFetched = 0;
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                console.log(`📡 Fetching transactions for account ${accUid}...`);

                do {
                  page++;
                  let endpoint = `https://api.enablebanking.com/accounts/${accUid}/transactions`;
                  if (continuationKey) {
                    endpoint += `?continuation_key=${encodeURIComponent(continuationKey)}`;
                  }

                  let txRes = await fetch(endpoint, {
                    headers: baseHeaders,
                  });

                  // If standard endpoint fails, try date_from
                  if (!txRes.ok && page === 1) {
                    console.log(`⚠️ Standard endpoint returned ${txRes.status}. Retrying with date_from=${ninetyDaysAgo}...`);
                    endpoint = `https://api.enablebanking.com/accounts/${accUid}/transactions?date_from=${ninetyDaysAgo}`;
                    txRes = await fetch(endpoint, {
                      headers: baseHeaders,
                    });
                  }

                  if (txRes.ok) {
                    const txData = await txRes.json();
                    continuationKey = txData.continuation_key || null;
                    const rawTxs = txData.transactions || [];
                    console.log(`📦 Page ${page}: retrieved ${rawTxs.length} transactions (continuation: ${Boolean(continuationKey)})`);

                    for (const rt of rawTxs) {
                      const movementId = rt.transaction_id || rt.entry_reference || `${rt.booking_date}_${rt.transaction_amount?.amount}_${Math.random().toString(36).substring(2, 7)}`;
                      const txId = `eb_${movementId}`;
                      if (!existingTxIds.has(txId)) {
                        const amountRaw = parseFloat(rt.transaction_amount?.amount || '0');
                        const rawConcept = (rt.remittance_information && rt.remittance_information.length > 0 ? rt.remittance_information.join(' ') : null) || rt.creditor_name || rt.debtor_name || rt.additional_information || 'Movimiento Bancario';
                        const concept = cleanConcept(rawConcept);
                        const isCredit = rt.credit_debit_indicator === 'CRDT' || (amountRaw > 0 && rt.credit_debit_indicator !== 'DBIT');
                        const cat = isCredit
                          ? { name: 'Ingreso / Nómina', color: '#10B981' }
                          : detectCategory(concept);
                        const bookingDate = rt.booking_date || rt.value_date || nowIso.split('T')[0];

                        const ownerPayer = conn.ownership === 'USER_B' ? 'memberB' : conn.ownership === 'JOINT' ? 'joint' : 'memberA';
                        const ownerSplit = conn.ownership === 'USER_B' ? 'memberB' : 'memberA';

                        const txItem = {
                          id: txId,
                          merchant: concept,
                          amount: Math.abs(amountRaw),
                          date: formatDate(bookingDate),
                          monthKey: formatMonthKey(bookingDate),
                          category: cat.name,
                          categoryColor: cat.color,
                          accountLabel: (acc?.cash_account_type === 'CARD' || acc?.product?.toLowerCase().includes('tarjeta') || acc?.product?.toLowerCase().includes('visa'))
                            ? `Tarjeta Bankinter (${acc.card_number ? acc.card_number.slice(-4) : 'VISA'})`
                            : `${conn.bankName} (${conn.ibanMask || ''})`.trim(),
                          status: isCredit ? 'classified' : 'pending',
                          payer: ownerPayer,
                          split: isCredit ? ownerSplit : '50/50',
                          isManual: false,
                          bankMovementId: movementId,
                          currency: rt.transaction_amount?.currency || 'EUR',
                          isCredit,
                        };

                        newTransactions.push(txItem);
                        existingTxIds.add(txId);
                        totalTxsFetched++;
                      }
                    }
                  } else {
                    const errBody = await txRes.text().catch(() => '');
                    console.warn(`Could not fetch transactions for ${accUid} (${txRes.status}): ${errBody}`);
                    break;
                  }
                } while (continuationKey && page < 20);

                console.log(`✅ Total new transactions added for ${conn.bankName}: ${totalTxsFetched}`);

                // Safe balance fetch AFTER transactions
                let balance = conn.balance || 12546.57;
                try {
                  const balRes = await fetch(`https://api.enablebanking.com/accounts/${accUid}/balances`, {
                    headers: baseHeaders,
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

                const isBankinter = conn.bankName.toLowerCase().includes('bankinter');
                const richAcc = (conn.accounts || []).find((a) => (a.uid || a.id) === accUid) || (typeof acc === 'object' ? acc : {});
                const iban = richAcc.account_id?.iban || (isBankinter ? 'ES9301280082940100030803' : conn.ibanMask) || '';
                const isJoint = richAcc.name?.includes('&') || richAcc.name?.toLowerCase().includes('andrea') || iban === 'ES0715830001109142458796';
                let accId = conn.id || `acc_${conn.bankName.toLowerCase()}`;
                let accTitle = conn.accountName || `Cuenta ${conn.bankName}`;
                let ownership = conn.ownership || 'USER_A';

                if (conn.bankName.toLowerCase().includes('revolut')) {
                  if (isJoint) {
                    accId = 'acc_revolut_conjunta';
                    accTitle = 'Revolut Conjunta';
                    ownership = 'JOINT';
                  } else if (richAcc.currency === 'USD') {
                    accId = 'acc_revolut_usd';
                    accTitle = 'Revolut (USD)';
                    ownership = 'USER_A';
                  } else {
                    accId = 'acc_revolut_personal';
                    accTitle = 'Revolut Personal';
                    ownership = 'USER_A';
                  }
                }

                const existingAccIdx = updatedAccounts.findIndex((a) => a.id === accId || (iban && a.ibanMask === iban));
                const accEntry = {
                  id: accId,
                  bankName: conn.bankName,
                  accountName: accTitle,
                  ibanMask: iban || (isBankinter ? 'ES9301280082940100030803' : `ES•• •••• •••• (${conn.bankName})`),
                  ownership: ownership,
                  balance: balance,
                  lastUpdated: nowIso,
                };

                if (existingAccIdx >= 0) {
                  updatedAccounts[existingAccIdx] = { ...updatedAccounts[existingAccIdx], ...accEntry };
                } else {
                  updatedAccounts.push(accEntry);
                }
              } catch (e) {
                console.warn(`Could not fetch transactions for ${accUid}:`, e.message);
              }
            }
          }
      } catch (err) {
        console.warn(`Error querying Enable Banking for ${conn.bankName}:`, err.message);
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
      for (const code of ['FITDUO', 'HKGMQB']) {
        const { data: currentHousehold } = await supabase
          .from('household_state')
          .select('accounts')
          .eq('household_code', code)
          .single();

        const existingCloudAccs = currentHousehold?.accounts || [];
        const mergedCloudAccs = [...existingCloudAccs];

        for (const newAcc of updatedAccounts) {
          const idx = mergedCloudAccs.findIndex(ca => ca.id === newAcc.id || (ca.ibanMask && newAcc.ibanMask && ca.ibanMask === newAcc.ibanMask));
          if (idx >= 0) {
            mergedCloudAccs[idx] = { ...mergedCloudAccs[idx], ...newAcc };
          } else {
            mergedCloudAccs.push(newAcc);
          }
        }

        await supabase
          .from('household_state')
          .update({ accounts: mergedCloudAccs, transactions: allTransactions })
          .eq('household_code', code);
        console.log(`✅ Synced ${mergedCloudAccs.length} accounts to Supabase household_state (${code})`);

        const channel = supabase.channel(`household_room_${code}`);
        await channel.subscribe();
        await channel.send({
          type: 'broadcast',
          event: 'SYNC_EVENT',
          payload: {
            type: 'TRANSACTIONS_SYNC',
            inviteCode: code,
            senderId: 'github-actions-worker',
            timestamp: Date.now(),
            transactions: allTransactions,
            accounts: mergedCloudAccs,
          },
        });
        console.log(`📡 Sent Supabase Realtime broadcast to household room ${code}`);
        await supabase.removeChannel(channel);
      }
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
