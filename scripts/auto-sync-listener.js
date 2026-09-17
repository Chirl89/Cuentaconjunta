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

const supabase = createClient(supabaseUrl, supabaseKey);
const channel = supabase.channel('household_room_FITDUO');

channel
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
