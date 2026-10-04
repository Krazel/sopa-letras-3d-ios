// Native bridge doubles injected only by this test. This is not StoreKit/AdMob device QA.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { campaignFor } from '../lib/player.ts';
import { initialStateForChoice } from '../lib/game.ts';
const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const out = process.env.QA_OUTPUT || 'evidence/support',
  root = path.resolve('dist/client');
fs.mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const f = path.resolve(
    root,
    '.' + (name === '/' ? '/index.html' : decodeURIComponent(name)),
  );
  if (!f.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const b = fs.readFileSync(f);
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.ttf': 'font/ttf',
        '.svg': 'image/svg+xml',
      }[path.extname(f)] ?? 'application/octet-stream',
    );
    res.end(b);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
function bridge() {
  localStorage.setItem('sopa-language', 'es');
  window.CapacitorCustomPlatform = { name: 'ios' };
  const q = (window.__supportQA = {
    active: false,
    hintsRemaining: 10,
    productID: 'com.krazel.sopaletras3d.support.monthly.299',
    reminderDue: false,
    calls: [],
    receipts: [],
    listeners: [],
    purchase: 'purchased',
    outcome: 'closed',
    failStatus: false,
    suspended: false,
  });
  const status = () => ({
    ready: true,
    available: true,
    active: q.active,
    productID: q.active ? q.productID : '',
    hintLimit: q.active ? ({299:10,499:30,999:60,1499:120,2999:300,50:600}[q.productID.split('.').at(-1)] ?? 0) : 0,
    hintsRemaining: q.active ? q.hintsRemaining : 0,
    renewsAt: Date.now()/1000 + 86400,
  });
  q.setActive = (active) => {
    q.active = active;
    q.listeners.forEach((cb) => cb(status()));
  };
  const headers = (name, methods) => ({
    name,
    methods: methods.map((name) => ({
      name,
      rtype: name === 'addListener' ? 'callback' : 'promise',
    })),
  });
  window.Capacitor = {
    PluginHeaders: [
      headers('SopaSupport', [
        'completion','review','engagement','reminderShown',
        'status',
        'products',
        'purchase',
        'restore',
        'manage',
        'addListener',
        'removeListener',
      ]),
      headers('SopaAds', [
        'prepare',
        'showRewarded',
        'claimSupportHint',
        'showInterstitial',
        'rewards',
        'acknowledge',
        'privacy',
      ]),
      headers('SopaAudio', [
        'configure',
        'playEffect',
        'stopEffects',
        'resume',
        'status',
      ]),
      headers('StatusBar', ['setStyle']),
    ],
    nativeCallback: (plugin, method, options, callback) => {
      if (plugin === 'SopaSupport' && method === 'addListener')
        q.listeners.push(callback);
      return 'qa-listener';
    },
    nativePromise: async (plugin, method, options) => {
      q.calls.push(`${plugin}.${method}`);
      if (plugin === 'SopaAudio') {
        if (method === 'configure') q.suspended = options.suspended;
        return {};
      }
      if (plugin === 'StatusBar') return {};
      if (plugin === 'SopaSupport') {
        if (method === 'review') return {requested:false};
        if (method === 'completion') return {};
        if (method === 'engagement') return {reminderDue:q.reminderDue&&!q.active};
        if (method === 'reminderShown') {q.reminderDue=false;return {};}
        if (method === 'status') {
          if (q.failStatus) throw Error('QA status failure');
          return status();
        }
        if (method === 'products')
          return {
            products: ['299', '499', '999', '1499', '2999', '50'].map(
              (id, i) => ({
                id: 'com.krazel.sopaletras3d.support.monthly.' + id,
                name: 'Apoyo ' + (i + 1),
                hintLimit: [10,30,60,120,300,600][i],
                price: [
                  '2,99 €',
                  '5,00 €',
                  '10,00 €',
                  '15,00 €',
                  '30,00 €',
                  '49,99 €',
                ][i],
              }),
            ),
          };
        if (method === 'purchase') {
          if (q.purchase === 'purchased') {q.productID=options.id;q.hintsRemaining=({299:10,499:30,999:60,1499:120,2999:300,50:600}[options.id.split('.').at(-1)]);q.setActive(true);}
          return { result: q.purchase, status: status() };
        }
        if (method === 'restore' || method === 'manage') return status();
        return {};
      }
      if (
        ['prepare', 'showRewarded', 'showInterstitial'].includes(method) &&
        !q.suspended
      )
        throw Error('Audio ACK missing');
      if (method === 'prepare')
        return { available: true, privacyRequired: true };
      if (method === 'showInterstitial') {
        assertNotActive();
        return { status: q.outcome };
      }
      if (method === 'showRewarded' || method === 'claimSupportHint') {
        if (method === 'claimSupportHint' && !q.active)
          return { status: 'unavailable' };
        if (method === 'claimSupportHint') {if(q.hintsRemaining<=0)return {status:'unavailable'};q.hintsRemaining--;q.setActive(true);}
        q.receipts.push({ id: options.id, context: options.context });
        return { status: 'rewarded' };
      }
      if (method === 'rewards') return { receipts: q.receipts };
      if (method === 'acknowledge') {
        q.receipts = q.receipts.filter((r) => r.id !== options.id);
        return {};
      }
      if (method === 'privacy')
        return { available: true, privacyRequired: false };
      throw Error('Unknown QA method ' + plugin + '.' + method);
    },
  };
  function assertNotActive() {
    if (q.active) throw Error('Subscriber received an ad');
  }
}
const puzzle = initialStateForChoice(campaignFor('es')[0]).puzzle;
async function enter(page) {
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: /^Niveles/ }).click();
  await page.getByRole('button', { name: /^Nivel 1 de / }).click();
  await page.locator('.canvas-ready').waitFor();
  if (
    await page
      .getByRole('button', { name: 'Entendido', exact: true })
      .isVisible()
  )
    await page.getByRole('button', { name: 'Entendido', exact: true }).click();
}
async function solve(page) {
  for (const word of puzzle.words)
    for (const id of word.path) {
      const tile = page.locator(`[data-cell="${id}"]`);
      await tile.focus();
      await tile.press('Enter');
    }
  await page
    .getByRole('dialog', { name: 'Sopa completada', exact: true })
    .waitFor();
}
const results = [];
try {
  for (const [engine, type] of [
    ['chromium', chromium],
    ['webkit', webkit],
  ]) {
    const browser = await type.launch(
      engine === 'chromium' && process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {},
    );
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(bridge);
      await page.goto(url);
      await enter(page);
      await solve(page);
      assert.equal(
        await page.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        1,
      );
      await page
        .getByRole('button', { name: 'Repetir nivel', exact: true })
        .click();
      await solve(page);
      assert.equal(
        await page.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        2,
      );
      await page.reload();
      await enter(page);
      await page
        .getByRole('dialog', { name: 'Sopa completada', exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        0,
      );
      results.push({
        engine,
        case: 'First and replayed level each request one ad immediately; restored completion requests none',
      });
      await page.close();

      const shop = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      shop.on('pageerror', (e) => errors.push(e.message));
      await shop.addInitScript(bridge);
      await shop.goto(url);
      await shop
        .getByRole('button', { name: 'Abrir ajustes', exact: true })
        .click();
      const disclosure = shop.locator('details.support-settings');
      await disclosure.locator('summary').waitFor();
      assert.equal(await disclosure.getAttribute('open'), null);
      assert.equal(await shop.locator('.support-products button').first().isVisible(), false);
      assert(await shop.evaluate(() => !!(document.querySelector('.settings-help').compareDocumentPosition(document.querySelector('.support-settings')) & Node.DOCUMENT_POSITION_FOLLOWING)));
      await shop.screenshot({path: `${out}/${engine}-subscriptions-collapsed.png`,fullPage:true});
      await disclosure.locator('summary').click();
      await shop.locator('.support-products button').first().waitFor();
      assert.equal(await shop.locator('.support-products button').count(), 6);
      assert.equal(await shop.locator('.support-price').first().innerText(), '2,99 € / mes');
      assert.match(await shop.locator('.support-products button').first().innerText(), /Plan mensual · 10 pistas incluidas/);
      assert.match(await shop.locator('.support-products button').first().innerText(), /Sin anuncios entre niveles/);
      assert(await shop.locator('.support-products button').first().evaluate(b => parseFloat(getComputedStyle(b.querySelector('.support-price')).fontSize) > parseFloat(getComputedStyle(b.querySelector('small')).fontSize)));
      assert.match(
        await shop.locator('.support-products').innerText(),
        /2,99 €/,
      );
      for (const result of ['cancelled', 'pending']) {
        await shop.evaluate(
          (result) => (__supportQA.purchase = result),
          result,
        );
        await shop.locator('.support-products button').first().click();
        await shop.waitForFunction(
          () => !document.querySelector('.support-products button').disabled,
        );
        assert.equal(await shop.locator('.support-active').count(), 0);
      }
      await shop.screenshot({
        path: `${out}/${engine}-subscriptions.png`,
        fullPage: true,
      });
      await shop.evaluate(() => (__supportQA.purchase = 'purchased'));
      await shop.locator('.support-products button').first().click();
      await shop.locator('.support-active').waitFor();
      await shop
        .getByRole('button', { name: 'Restaurar compras', exact: true })
        .click();
      await shop
        .getByRole('button', { name: 'Gestionar suscripción', exact: true })
        .click();
      await enter(shop);
      await shop.getByRole('button', { name: 'Pista', exact: true }).click();
      await shop
        .getByRole('button', { name: 'Revelar 1 letra', exact: true })
        .click();
      await shop.waitForFunction(() =>
        __supportQA.calls.includes('SopaAds.acknowledge'),
      );
      assert.equal(
        await shop.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showRewarded')
              .length,
        ),
        0,
      );
      await solve(shop);
      assert.equal(
        await shop.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        0,
      );
      // Expiration on an already visible result must not create a late ad.
      await shop.evaluate(() => __supportQA.setActive(false));
      await shop
        .getByRole('button', { name: 'Ver sopa completada', exact: true })
        .click();
      await shop
        .getByRole('button', { name: 'Ver resultado', exact: true })
        .click();
      assert.equal(
        await shop.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        0,
      );
      await shop.evaluate(() => __supportQA.setActive(true));
      await shop
        .getByRole('button', { name: 'Repetir nivel', exact: true })
        .click();
      await shop.getByRole('button', { name: 'Pista', exact: true }).click();
      // StoreKit expires before the notification arrives; the existing offer
      // still promises a hint without an ad when the player accepts it.
      await shop.evaluate(() => {
        __supportQA.active = false;
      });
      await shop
        .getByRole('button', { name: 'Revelar 1 letra', exact: true })
        .click();
      await shop
        .getByRole('dialog', { name: 'Pista', exact: true })
        .waitFor({ state: 'hidden' });
      assert.equal(
        await shop.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showRewarded')
              .length,
        ),
        0,
      );
      await solve(shop);
      assert.equal(
        await shop.evaluate(
          () =>
            __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
              .length,
        ),
        1,
      );
      results.push({
        engine,
        case: 'Localized products, cancellation/pending, purchase, restore/manage, subscriber hint without ad, completion without ad and entitlement expiration',
      });
      assert.deepEqual(errors, []);
      await shop.close();
      const quota = await browser.newPage({viewport:{width:390,height:844}});
      await quota.addInitScript(bridge);
      await quota.addInitScript(() => {__supportQA.hintsRemaining=1;});
      await quota.goto(url);
      await quota.getByRole('button',{name:'Abrir ajustes',exact:true}).click();
      await quota.locator('.ad-settings').waitFor();
      assert.equal(await quota.locator('.support-settings').evaluate(el=>el.nextElementSibling?.classList.contains('ad-settings')),true);
      assert.equal(await quota.locator('html').getAttribute('data-native-ios'),'true');
      assert.equal(await quota.locator('.language-setting').evaluate(el=>el.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),false);
      await quota.evaluate(()=>__supportQA.setActive(true));
      await enter(quota);
      await quota.getByRole('button',{name:'Pista',exact:true}).click();
      await quota.getByRole('button',{name:'Revelar 1 letra',exact:true}).click();
      await quota.waitForFunction(()=>__supportQA.hintsRemaining===0);
      await quota.getByRole('button',{name:'Pista',exact:true}).click();
      await quota.getByRole('button',{name:'Mejorar suscripción',exact:true}).click();
      const upgrades=quota.getByRole('dialog',{name:'Mejorar suscripción',exact:true});
      await upgrades.locator('.support-products button').first().waitFor();
      assert.equal(await upgrades.locator('.support-products button').count(),5);
      await upgrades.getByRole('button',{name:'Ahora no',exact:true}).click();
      await quota.getByRole('button',{name:'Pista',exact:true}).click();
      await quota.getByRole('button',{name:'Ver anuncio para esta pista',exact:true}).click();
      await quota.waitForFunction(()=>__supportQA.calls.includes('SopaAds.showRewarded'));
      assert.equal(await quota.evaluate(()=>__supportQA.calls.filter(c=>c==='SopaAds.claimSupportHint').length),1);
      await quota.getByRole('button',{name:'Pista',exact:true}).click();
      await quota.getByRole('button',{name:'Mejorar suscripción',exact:true}).click();
      await upgrades.locator('.support-products button').first().click();
      await quota.waitForFunction(()=>__supportQA.hintsRemaining===30);
      await upgrades.getByRole('button',{name:'Ahora no',exact:true}).click();
      await quota.getByRole('button',{name:'Pista',exact:true}).click();
      await quota.getByRole('button',{name:'Revelar 1 letra',exact:true}).click();
      await quota.waitForFunction(()=>__supportQA.hintsRemaining===29);
      assert.equal(await quota.evaluate(()=>__supportQA.calls.filter(c=>c==='SopaAds.showRewarded').length),1);
      await quota.screenshot({path:`${out}/${engine}-quota.png`});
      await quota.close();
      const editable=await browser.newPage({viewport:{width:390,height:844}});
      await editable.addInitScript(bridge);await editable.goto(url);
      await editable.getByRole('button',{name:'Partida personalizada',exact:true}).click();
      const nameField=editable.getByRole('textbox',{name:'Nombre de la sopa',exact:true});await nameField.fill('Texto editable');
      assert.equal(await nameField.evaluate(el=>el.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),true);
      assert.equal(await nameField.evaluate(el=>getComputedStyle(el).getPropertyValue('user-select') || getComputedStyle(el).getPropertyValue('-webkit-user-select')),'text');await editable.close();
      const reminder=await browser.newPage({viewport:{width:390,height:844}});await reminder.addInitScript(bridge);await reminder.addInitScript(()=>{__supportQA.reminderDue=true;});await reminder.goto(url);
      const prompt=reminder.getByRole('dialog',{name:'¿Quieres jugar sin anuncios entre niveles?',exact:true});await prompt.waitFor();await prompt.getByRole('button',{name:'No volver a preguntar',exact:true}).click();assert.equal(await prompt.isVisible(),false);await reminder.close();
      results.push({engine,case:'Included quota, upgrade options, voluntary subscriber ad, upgraded quota, privacy last, native selection blocked/editors usable, reminder opt-out'});
      for (const failure of ['offline', 'unavailable', 'status']) {
        const p = await browser.newPage({
          viewport: { width: 390, height: 844 },
        });
        await p.addInitScript(bridge);
        await p.goto(url);
        await enter(p);
        if (failure === 'offline') await p.context().setOffline(true);
        else
          await p.evaluate((failure) => {
            if (failure === 'status') __supportQA.failStatus = true;
            else __supportQA.outcome = 'unavailable';
          }, failure);
        await solve(p);
        assert.equal(
          await p.evaluate(
            () =>
              __supportQA.calls.filter((c) => c === 'SopaAds.showInterstitial')
                .length,
          ),
          failure === 'unavailable' ? 1 : 0,
        );
        assert.equal(
          await p
            .getByRole('button', { name: 'Repetir nivel', exact: true })
            .isEnabled(),
          true,
        );
        await p.close();
        results.push({
          engine,
          case: failure + ' does not block completion or replay',
        });
      }
    } finally {
      await browser.close();
    }
  }
  fs.writeFileSync(
    `${out}/support-ui.json`,
    JSON.stringify(
      {
        passed: true,
        scope:
          'Web UI with native bridge doubles, not native StoreKit or real ads',
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results));
} finally {
  await new Promise((r) => server.close(r));
}
