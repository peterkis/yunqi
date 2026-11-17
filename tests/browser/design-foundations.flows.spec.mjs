import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect, settle, screenshot } from './fixtures.mjs';

const tokens = JSON.parse(readFileSync('docs/design/design-system/tokens.json', 'utf8'));
const surface = tokens.color.tokens.find(token => token.name === 'surface-page');
const metalRing = tokens.color.tokens.find(token => token.name === 'element-metal-ring');
const metalFill = tokens.color.tokens.find(token => token.name === 'element-metal-fill');
const rgb = hex => `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

for (const theme of ['light', 'dark']) {
  test(`design foundations: ${theme} tokens, local fonts, keyboard and accessibility`, async ({ page, diagnostics }, testInfo) => {
    const fonts = new Set();
    page.on('request', request => {
      if (request.resourceType() === 'font') fonts.add(new URL(request.url()).pathname);
    });
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto('/src/test/design-foundations.html');
    await expect(page.getByRole('heading', { name: '运气通' })).toBeVisible();
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    await settle(page);
    await page.evaluate(() => document.fonts.ready);

    const readMetrics = () => page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const height = selector => document.querySelector(selector).getBoundingClientRect().height;
      return {
        background: style('main').backgroundColor,
        primary: height('.ds-button--primary'), secondary: height('.ds-button--secondary'),
        text: height('.ds-button--text'), icon: height('.ds-button--icon'),
        header: height('.ds-panel-header'), option: height('.ds-scale-option'),
        segment: height('.ds-segmented-nav__link'),
        compactSegment: height('.ds-segmented-nav--compact .ds-segmented-nav__link'),
        dot: height('.ds-element__dot'),
        compactDot: height('.ds-element--compact .ds-element__dot'),
        metalBorder: style('.ds-element__dot--metal').borderTopWidth,
        metalRing: style('.ds-element__dot--metal').boxShadow,
        compactMetalRing: style('.ds-element--compact .ds-element__dot--metal').boxShadow,
        metalFill: style('.ds-element__dot--metal').backgroundColor,
        chip: height('.ds-relation__chip'), compactChip: height('.ds-relation__chip--compact'),
        cardPadding: style('.ds-info-card').paddingTop,
        cardShadow: style('.ds-info-card').boxShadow,
        quoteFont: style('.ds-quote-block__original').fontFamily,
        readingFont: style('.ds-quote-block__reading').fontFamily,
        interpretationBorder: style('.ds-quote-block__interpretation').borderTopStyle,
        selectedBorder: style('.ds-scale-option[aria-checked="true"]').borderTopWidth,
        primaryPadding: style('.ds-button--primary').paddingLeft,
        primarySize: style('.ds-button--primary').fontSize,
        secondarySize: style('.ds-button--secondary').fontSize,
        textSize: style('.ds-button--text').fontSize,
        segmentSize: style('.ds-segmented-nav__link').fontSize,
        segmentInset: style('.ds-segmented-nav').paddingTop,
        headerTitleSize: style('.ds-panel-header__title').fontSize,
        headerTitleLine: style('.ds-panel-header__title').lineHeight,
        eyebrowSize: style('.ds-info-card__label').fontSize,
        metaSize: style('.ds-info-card__meta').fontSize,
        sourceSize: style('.ds-quote-block__source').fontSize,
        quoteSize: style('.ds-quote-block__original').fontSize,
        optionLabelOffsets: [...document.querySelectorAll('.ds-scale-option')].map(option => (
          option.querySelector('.ds-scale-option__label').getBoundingClientRect().left - option.getBoundingClientRect().left
        )),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    let metrics;
    try {
      // Theme changes can still be transitioning under reduced motion. Retry the
      // complete measurement so style assertions never depend on one sample.
      await expect.poll(async () => {
        metrics = await readMetrics();
        return {
          ...metrics,
          optionCount: metrics.optionLabelOffsets.length,
          optionLabelPositions: new Set(metrics.optionLabelOffsets).size,
        };
      }).toMatchObject({
        background: rgb(surface.value[theme]),
        primary: 40, secondary: 40, text: 36, icon: 32, header: 52,
        option: 48, segment: 32, compactSegment: 30, dot: 8, compactDot: 7,
        // Inspect the painted inset ring, not the rounded CSS border width.
        metalBorder: '0px',
        metalRing: `${rgb(metalRing.value[theme])} 0px 0px 0px 1.5px inset`,
        compactMetalRing: `${rgb(metalRing.value[theme])} 0px 0px 0px 1.5px inset`,
        metalFill: rgb(metalFill.value[theme]),
        chip: 22, compactChip: 20, cardPadding: '18px',
        cardShadow: 'none', interpretationBorder: 'dashed', selectedBorder: '2px', overflow: false,
        primaryPadding: '20px', primarySize: '14px', secondarySize: '14px', textSize: '14px', segmentSize: '14px',
        segmentInset: '3px', headerTitleSize: '14px', headerTitleLine: '17.5px',
        eyebrowSize: '12px', metaSize: '12px', sourceSize: '12px', quoteSize: '15px',
        optionCount: 5, optionLabelPositions: 1,
        quoteFont: expect.stringContaining('Noto Serif SC'),
        readingFont: expect.stringContaining('Noto Sans SC'),
      });
    } finally {
      if (metrics) {
        await testInfo.attach('foundation-metrics', { body: JSON.stringify({ theme, fonts: [...fonts], metrics }, null, 2), contentType: 'application/json' });
      }
    }
    expect([...fonts].sort()).toEqual(['/fonts/NotoSansSC-VF.woff2', '/fonts/NotoSerifSC-VF.woff2']);
    expect(diagnostics.requests).toEqual([]);
    const quoteCard = page.getByRole('region', { name: '当下原文', exact: true });
    await expect(quoteCard.getByText('文献线索，非个体发病预测。', { exact: true })).toHaveCount(1);
    await expect(quoteCard.locator('.ds-quote-block > :last-child')).toHaveText('文献线索，非个体发病预测。');
    await expect(quoteCard.locator('.ds-quote-block__notice')).toHaveCSS('font-size', '12px');

    // Start before the quote, then verify the native summary's real Tab behavior.
    await page.getByRole('button', { name: '返回修改' }).focus();
    await page.keyboard.press('Tab');
    const summary = page.locator('.ds-quote-block__summary');
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.ds-quote-block__details')).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(page.locator('.ds-quote-block__details')).not.toHaveAttribute('open');
    await expect(summary).toHaveCSS('outline-width', '2px');
    await expect(summary).toHaveCSS('outline-offset', '2px');
    await expect(summary).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');

    const linkedCard = page.getByRole('region', { name: '量表入口', exact: true });
    const cardLink = linkedCard.getByRole('link', { name: '原文与释义', exact: true });
    await expect(linkedCard).toHaveJSProperty('tagName', 'SECTION');
    await expect(linkedCard.getByRole('link')).toHaveCount(1);
    await expect(cardLink).not.toHaveAttribute('aria-labelledby');
    await expect(cardLink).not.toHaveAttribute('aria-label');
    await expect(cardLink.locator('[aria-hidden="true"]')).toHaveText('›');
    await expect(linkedCard.getByText('展示样例', { exact: true })).toBeVisible();

    // The whole card supplies one tab stop: the visible text link.
    await page.keyboard.press('Tab');
    await expect(cardLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: '没有', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cardLink).toBeFocused();
    for (const target of [cardLink, linkedCard]) {
      await expect(target).toHaveCSS('outline-width', '2px');
      await expect(target).toHaveCSS('outline-offset', '2px');
      await expect(target).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
    }

    const fixtureUrl = page.url();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#scale$/);
    await page.goBack();
    await expect(page).toHaveURL(fixtureUrl);

    // Click the body outside the visible anchor text. This exercises real CSS
    // hit testing of the stretched ::after surface, which jsdom cannot perform.
    await linkedCard.scrollIntoViewIfNeeded();
    const cardBody = await linkedCard.locator('.ds-info-card__content').boundingBox();
    expect(cardBody).not.toBeNull();
    await page.mouse.click(cardBody.x + cardBody.width / 2, cardBody.y + cardBody.height / 2);
    await expect(page).toHaveURL(/#scale$/);

    await page.getByRole('radio', { name: '没有', exact: true }).focus();
    await page.keyboard.press('3');
    await expect(page.getByRole('radio', { name: '有时', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: '有时', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: '经常', exact: true })).toBeFocused();
    await expect(page.getByRole('radio', { name: '有时', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: '经常', exact: true })).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: '经常', exact: true })).toBeChecked();
    await page.getByRole('link', { name: '先天对照', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: '先天对照', exact: true })).toHaveAttribute('aria-current', 'page');
    await screenshot(page, testInfo, `design-foundations-${theme}`);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach('foundation-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    expect(scan.violations).toEqual([]);
  });
}
