// D4 round-2 CSS diagnostic. Run from the repository with node <this-file> [--round-1].
// Uses the real stylesheet imports and a minimal rendered More list; no HTTP or browser.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../../../apps/yunqi-workbench', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div class="theme-root" data-theme="light"><div class="panel-shell"><main><div class="current-overview"><nav class="current-more"><ul class="current-more__list"><li><details><summary class="current-more__row">其余阶段</summary></details></li><li><a href="#year" class="current-more__row">年度详情</a></li><li><a href="#time" class="current-more__row">指定时点</a></li><li><details><summary class="current-more__row">计算说明与版本</summary></details></li></ul></nav></div></main></div></div></body></html>', { pretendToBeVisual: true });
const { document } = dom.window;
const main = readFileSync(`${root}/src/main.tsx`, 'utf8');
for (const match of main.matchAll(/import '\.\/(styles\/[^']+\.css)'/g)) {
  const style = document.createElement('style');
  style.textContent = readFileSync(`${root}/src/${match[1]}`, 'utf8');
  if (process.argv.includes('--round-1') && match[1] === 'styles/views/current-yunqi.css') {
    style.textContent = style.textContent.replace(/\/\* Native summary focus after pointer navigation[\s\S]*?\.current-more \.current-more__row:focus \{[^}]+\}/,
      '.current-more__row:focus-visible { outline: var(--space-0_5) solid var(--focus-ring); outline-offset: var(--space-0_5); }');
    assert.equal(createHash('sha256').update(style.textContent).digest('hex'),
      '5237308bd3d2795df8f88d2b6fd3e6d6fb438a7853754c9094056e290a06172d', 'Replay must equal the round-1 stylesheet bytes');
  }
  document.head.append(style);
}
const resolve = (value, element) => value.replace(/var\((--[^)]+)\)/g, (_, token) => {
  for (let parent = element; parent; parent = parent.parentElement) {
    const candidate = dom.window.getComputedStyle(parent).getPropertyValue(token).trim();
    if (candidate) return candidate.startsWith('var(') ? resolve(candidate, parent) : candidate;
  }
  return `<UNRESOLVED:${token}>`;
});
const failures = [];
for (const theme of ['light', 'dark']) {
document.querySelector('.theme-root').setAttribute('data-theme', theme);
for (const row of document.querySelectorAll('.current-more__row')) {
  row.focus();
  const style = dom.window.getComputedStyle(row);
  const metric = { theme, tag: row.tagName, focus: row.matches(':focus'), focusVisible: row.matches(':focus-visible'), outline: style.outline,
    width: resolve(style.outlineWidth, row), style: style.outlineStyle, offset: resolve(style.outlineOffset, row) };
  console.log(JSON.stringify(metric));
  if (metric.width !== '2px' || metric.style !== 'solid' || metric.offset !== '2px') failures.push(metric);
}
}
dom.window.close();
assert.deepEqual(failures, [], 'Every focused More row must use 2px solid with 2px offset; this is a jsdom CSS check, not Chromium acceptance');
