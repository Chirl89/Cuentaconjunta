/**
 * FitDuo / CuentaConjunta - Realtime Auto-Sync Listener
 * 
 * Listens to Supabase Realtime channel `household_room_FITDUO`.
 * When the user completes bank authentication in Bankinter and the webapp
 * receives the OAuth code, the webapp broadcasts `BANK_AUTH_CODE`.
 * This listener captures the code immediately, exchanges it for a 90-day PSD2 session,
 * fetches balances and historical transactions, and saves them to public/data/bank-feed.json.
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://egougygfqnnzfqpceggn.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_hGjr4Hb-601X2np1wi1d4g_gPGdg192';

console.log('--- FitDuo Auto-Sync Listener Starting ---');
console.log('📡 Connecting to Supabase Realtime channel: household_room_FITDUO...');

const { getDirectBankLink } = require('./get-direct-bank-link');

const supabase = createClient(supabaseUrl, supabaseKey);
const channel = supabase.channel('household_room_FITDUO');

channel
  .on('broadcast', { event: 'REQUEST_BANK_AUTH_LINK' }, async (event) => {
    const payload = event?.payload || {};
    const bank = payload.bank || 'Revolut';
    const requestId = payload.requestId;

    console.log(`\n⚡ [REALTIME EVENT] Generating live on-demand auth link for ${bank}...`);
    try {
      const { sessId, directBankUrl } = await getDirectBankLink(bank);
      console.log(`✅ [${bank}] Live link generated: ${directBankUrl.slice(0, 60)}...`);

      // Save to Supabase household_state under settlements._live_bank_links
      const { data: curr } = await supabase
        .from('household_state')
        .select('settlements')
        .eq('household_code', 'FITDUO')
        .single();

      const linkEntry = {
        url: directBankUrl,
        authorizationId: sessId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };

      const isLt = bank.toLowerCase().includes('lt') || bank.toLowerCase().includes('lituania') || bank.toLowerCase().includes('europa');
      const updatedSettlements = {
        ...(curr?.settlements || {}),
        _live_bank_links: {
          ...((curr?.settlements?._live_bank_links) || {}),
          [bank]: linkEntry,
          ...(bank.toLowerCase().includes('revolut') ? (isLt ? { 'Revolut (Europa / LT)': linkEntry, Revolut_LT: linkEntry } : { Revolut: linkEntry, 'Revolut (España)': linkEntry }) : {}),
          ...(bank.toLowerCase().includes('bankinter') ? { Bankinter: linkEntry } : {}),
        },
      };

      await supabase
        .from('household_state')
        .update({ settlements: updatedSettlements })
        .eq('household_code', 'FITDUO');

      // Broadcast back to the webapp
      channel.send({
        type: 'broadcast',
        event: 'BANK_AUTH_LINK_READY',
        payload: {
          bank,
          requestId,
          url: directBankUrl,
          authorizationId: sessId,
        },
      });
    } catch (err) {
      console.error(`❌ Failed to generate live auth link for ${bank}:`, err.message);
      channel.send({
        type: 'broadcast',
        event: 'BANK_AUTH_LINK_ERROR',
        payload: { bank, requestId, error: err.message },
      });
    }
  })
  .on('broadcast', { event: 'BANK_AUTH_CODE' }, async (event) => {
    const payload = event?.payload || {};
    const code = payload.code;
    const bank = payload.bank || 'Bankinter';

    if (!code) {
      console.warn('⚠️ Received BANK_AUTH_CODE event without code:', payload);
      return;
    }

    const psuIp = payload.psuIp || '';
    const psuUserAgent = payload.psuUserAgent || '';

    console.log(`\n🎉 [REALTIME EVENT] Received bank auth code for ${bank}: ${code}`);
    if (psuIp) console.log(`🌐 PSU Context: IP=${psuIp}`);
    console.log('⚡ Immediately exchanging code for session and fetching transactions...');

    try {
      let cmd = `node scripts/complete-auth.js --code="${code}" --bank="${bank}"`;
      if (psuIp) cmd += ` --psu-ip="${psuIp}"`;
      if (psuUserAgent) cmd += ` --psu-ua="${encodeURIComponent(psuUserAgent)}"`;
      execSync(cmd, { stdio: 'inherit' });
      console.log('✅ Auto-sync completed successfully!');
    } catch (err) {
      console.error('❌ Error during auto-sync:', err.message);
    }
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to household_room_FITDUO.');
      console.log('⏳ Waiting for bank authorization code from web redirect...');
    }
  });

// Keep process running
process.on('SIGINT', () => {
  console.log('\nStopping listener...');
  supabase.removeChannel(channel).then(() => process.exit(0));
});
