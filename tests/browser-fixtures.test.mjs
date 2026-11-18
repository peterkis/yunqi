import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { expectPanelLayout, expectNoPersonalDataInUrl } from './browser/fixtures.mjs';
import { expectNoOutlineTransition } from './browser/motion-helpers.mjs';

// Reuse the Workbench's existing test dependency; add no runtime dependency.
const { JSDOM } = createRequire(new URL('../apps/yunqi-workbench/package.json', import.meta.url))('jsdom');

// Computed CSS lists: short duration lists repeat; surplus durations are ignored.
for (const [properties, durations, immediate] of [
  ['all', '0s', true],
  ['outline', '0s', true],
  ['opacity, outline-color', '0.12s, 0s', true],
  ['outline-width, outline-offset', '0ms', true],
  ['outline', '0.12s', false],
  ['all', '120ms', false],
  ['opacity, outline-color', '0s, 120ms', false],
  ['opacity, color, outline-offset', '120ms, 0s', false],
  ['opacity', '0s, 120ms', true],
]) {
  test(`focus-ring transition oracle: ${properties} / ${durations}`, () => {
    const check = () => expectNoOutlineTransition(properties, durations);
    if (immediate) check();
    else assert.throws(check, /Focus outline transitions must have zero duration/);
  });
}

test('personal-data URL oracle permits only the injected motion value, including after SPA navigation', () => {
  for (const motionMode of ['full', 'reduced', 'off', 'missing-transition']) {
    const check = query => expectNoPersonalDataInUrl({ url: () => `http://localhost/yunqi/birth${query}` }, motionMode);
    check('');
    if (motionMode === 'off') check('?motion=off');
    else assert.throws(() => check('?motion=off'));
    for (const query of ['?birthDate=1990-05-12', '?motion=off&answer=3', '?motion=full', '?motion=', '?motion=off&motion=off']) {
      assert.throws(() => check(query));
    }
  }
});

// Real DOM selectors with synthetic geometry: this verifies the fixture's
// element ownership, not CSS layout or a real browser's rendering.
function panelPage(context, { footerHeight = 36, headerHeight = 52 } = {}) {
  const dom = new JSDOM(`
    <div class="panel-shell">
      <header id="panel-header"></header>
      <div class="panel-shell__navigation"></div>
      <main style="overflow-y:auto">
        <section><header id="card-header"></header><footer id="card-footer"></footer></section>
      </main>
      <footer class="panel-shell__footer"></footer>
    </div>`);
  context.after(() => dom.window.close());
  const { document } = dom.window;
  const geometry = (selector, y, height) => {
    document.querySelector(selector).getBoundingClientRect = () => ({ x: 0, y, width: 400, height, right: 400, bottom: y + height });
  };
  geometry('.panel-shell', 0, 860);
  geometry('#panel-header', 0, headerHeight);
  geometry('.panel-shell__navigation', 52, 50);
  geometry('main', 102, 722);
  geometry('.panel-shell__footer', 824, footerHeight);
  geometry('#card-header', 200, 20);
  geometry('#card-footer', 300, 34);
  for (const [element, values] of [
    [document.querySelector('main'), { clientWidth: 368, scrollWidth: 368 }],
    [document.documentElement, { scrollWidth: 400, scrollHeight: 860 }],
  ]) for (const [property, value] of Object.entries(values)) Object.defineProperty(element, property, { value });
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() } });
  document.getAnimations = () => [];
  const evaluate = async callback => runInNewContext(`(${callback.toString()})()`, {
    document, innerWidth: 400, innerHeight: 860, getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
  const page = { evaluate, waitForFunction: async callback => assert.equal(await evaluate(callback), true) };
  return { page, document };
}

test('layout fixture measures the shell footer when a card footer comes first', async (context) => {
  const { page, document } = panelPage(context);
  const layout = await expectPanelLayout(page);
  assert.equal(layout.header.height, 52);
  assert.equal(layout.footer.height, 36);
  assert.ok(document.querySelector('#card-footer'));
});

test('layout fixture still rejects a shell footer whose height is 34', async (context) => {
  await assert.rejects(expectPanelLayout(panelPage(context, { footerHeight: 34 }).page));
});

test('layout fixture still rejects a shell header whose height is 50', async (context) => {
  await assert.rejects(expectPanelLayout(panelPage(context, { headerHeight: 50 }).page));
});

// Synthetic loading sequence only: reproduces an early measurement mismatch,
// not the unconfirmed cause of Vite's initial stylesheet timing.
test('layout fixture retries the complete measurement until all original expectations hold', async (context) => {
  const { page } = panelPage(context);
  let reads = 0;
  const loadingPage = { ...page, evaluate: async (callback) => {
    const layout = await page.evaluate(callback);
    if (!layout) return layout;
    reads += 1;
    if (reads === 1) return { ...layout, panel: { ...layout.panel, width: 384 }, documentHeight: 876 };
    if (reads === 2) return { ...layout, documentHeight: 876 };
    return layout;
  } };
  const layout = await expectPanelLayout(loadingPage);
  assert.ok(reads >= 3);
  assert.equal(layout.panel.width, 400);
  assert.equal(layout.documentHeight, 860);
});
