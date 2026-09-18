/**
 * FitDuo / CuentaConjunta - Interactive Bankinter VISA Card Sync
 * 
 * Opens the official Bankinter login page directly in a secure Chrome window.
 * The USER types their credentials directly into Bankinter (NO PASSWORDS IN ANY CODE OR REPO).
 * Once the user logs in, this script automatically extracts the VISA Card movements!
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_DIR = path.resolve(__dirname, '../data/chrome-profile');
const STATUS_FILE = path.resolve(__dirname, '../data/card-sync-status.json');
const BANK_FEED_FILE = path.resolve(__dirname, '../public/data/bank-feed.json');

function setStatus(status, details = {}) {
  try {
    const data = { status, timestamp: Date.now(), ...details };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {}
}

async function main() {
  console.log('------------------------------------------------------------');
  console.log('🔒 Apertura de Pasarela Oficial de Bankinter');
  console.log('👉 Se va a abrir la ventana oficial de Bankinter en tu pantalla.');
  console.log('👉 Introduce tu DNI y tu clave directamente en la web de Bankinter.');
  console.log('👉 (Ninguna contraseña se almacena en el código ni en el repositorio).');
  console.log('------------------------------------------------------------');

  setStatus('LAUNCHED', { message: 'Ventana de Bankinter abierta en pantalla. Esperando que introduzcas tus claves...' });

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      executablePath: CHROME_PATH,
      headless: false,
      viewport: { width: 1280, height: 850 },
      args: ['--disable-blink-features=AutomationControlled']
    });
  } catch (err) {
    console.error('Error al lanzar Chrome:', err.message);
    setStatus('ERROR', { error: 'No se pudo abrir Chrome: ' + err.message });
    process.exit(1);
  }

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(240000); // 4 minutes for user to login & enter SMS
  const CARD_URL = 'https://bancaonline.bankinter.com/tarjetas/secure/tarjetas_ficha.xhtml?INDEX_CTA=5';

  try {
    console.log('🌐 Accediendo a la ficha de la tarjeta en Bankinter...');
    await page.goto(CARD_URL, { waitUntil: 'domcontentloaded' });

    setStatus('WAITING_USER_LOGIN', { message: 'Por favor, introduce tus claves en la ventana de Bankinter.' });
    console.log('⏳ Esperando a que inicies sesión en Bankinter...');

    // Wait until user logs in
    await page.waitForFunction(() => {
      const url = window.location.href;
      return !url.includes('login.xhtml') && (url.includes('tarjetas') || url.includes('gestion') || url.includes('posicion') || document.body.innerText.includes('Tarjetas') || document.body.innerText.includes('Visa'));
    }, { timeout: 240000 });

    console.log('🎉 ¡Identificación completada con éxito en Bankinter!');
    setStatus('EXTRACTING', { message: 'Sesión iniciada. Cargando movimientos de la tarjeta...' });
    await page.waitForTimeout(2000);

    // If Bankinter redirected to homepage after login, jump straight to the card URL
    if (!page.url().includes('tarjetas_ficha.xhtml')) {
      console.log('💳 Accediendo directamente a la ficha de la tarjeta VISA...');
      await page.goto(CARD_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
    }

    // Save debug screenshot and HTML
    const screenshotPath = path.resolve(__dirname, '../data/bankinter-cards-view.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Extract table rows or list items for movements
    const movementsData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('tr, .fila-movimiento, [class*="movimiento" i]');
      rows.forEach((row, idx) => {
        const text = row.innerText || '';
        const dateMatch = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
        const amountMatch = text.match(/(-?\s*[\d.,]+\s*€)/);
        if (dateMatch && amountMatch) {
          const rawAmount = amountMatch[0].replace(/€|\s/g, '').replace(/\./g, '').replace(',', '.');
          const amount = parseFloat(rawAmount);
          if (!isNaN(amount) && Math.abs(amount) > 0) {
            results.push({
              id: 'row_' + idx,
              dateStr: dateMatch[0],
              amount: amount,
              rawText: text.replace(/\n/g, ' ').slice(0, 100)
            });
          }
        }
      });
      return results;
    });

    console.log('📊 Movimientos de tarjeta encontrados en pantalla:', movementsData.length);

    // Update bank-feed.json if we got movements
    let feed = { accounts: [], transactions: [] };
    if (fs.existsSync(BANK_FEED_FILE)) {
      feed = JSON.parse(fs.readFileSync(BANK_FEED_FILE, 'utf8'));
    }

    // Add VISA card account if not present
    if (!feed.accounts.find(a => a.id === 'acc_bankinter_visa')) {
      feed.accounts.push({
        id: 'acc_bankinter_visa',
        bankName: 'Bankinter',
        accountName: 'Tarjeta VISA Clásica',
        ibanMask: 'VISA **** 3080',
        ownership: 'USER_A',
        balance: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    let addedCount = 0;
    const now = new Date();
    const curMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    movementsData.forEach((m, idx) => {
      const exists = feed.transactions.some(t => 
        t.accountLabel?.includes('VISA') && 
        Math.abs(t.amount - Math.abs(m.amount)) < 0.01
      );
      if (!exists) {
        feed.transactions.unshift({
          id: 'visa_' + Date.now() + '_' + idx,
          merchant: m.rawText.slice(0, 35).trim() || 'Compra VISA Bankinter',
          amount: Math.abs(m.amount),
          date: m.dateStr,
          monthKey: curMonthKey,
          category: 'Otros Gastos Comunes',
          categoryColor: '#EC4899',
          accountLabel: 'Tarjeta Bankinter (VISA)',
          status: 'pending',
          payer: 'memberA',
          split: '50/50',
          isManual: false,
          bankMovementId: 'card_' + idx,
          currency: 'EUR',
          isCredit: m.amount > 0
        });
        addedCount++;
      }
    });

    feed.lastSyncAt = new Date().toISOString();
    fs.writeFileSync(BANK_FEED_FILE, JSON.stringify(feed, null, 2), 'utf8');

    setStatus('COMPLETED', {
      message: '¡Sincronización completada! Se han actualizado las compras de tu tarjeta VISA.',
      count: movementsData.length,
      newCount: addedCount
    });

    console.log('✅ Sincronización de tarjeta finalizada con éxito.');
    await page.waitForTimeout(2000);
    await context.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error o tiempo agotado:', err.message);
    setStatus('ERROR', { error: err.message });
    if (context) await context.close();
    process.exit(1);
  }
}

main();
