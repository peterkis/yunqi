import { test, expect, screenshot, expectTypeScale } from './fixtures.mjs';
import { fillBirthDate } from './birth-helpers.mjs';
import { answerConstitution, expectConstitutionResults } from './constitution-helpers.mjs';
import { expectViewControls } from './visual-assertions.mjs';

// Fixed answer vectors for the versioned male questionnaire, sent through the
// real Service. Each run verifies its returned count; these are UI regressions,
// not expert scoring cases or independent clinical samples.
const profiles = [
  { count: 1, title: '痰湿质', values: [3, 3, 1, 1, 2, 1, 1, 1, 2, 3, 1, 3, 2, 4, 1, 1, 4, 3, 2, 1, 5, 1, 5, 2, 1, 2] },
  { count: 2, title: '偏颇质兼夹', values: [1, 3, 2, 4, 4, 4, 3, 5, 2, 1, 4, 3, 2, 2, 1, 3, 3, 2, 2, 2, 4, 1, 4, 2, 2, 2] },
  { count: 7, title: '偏颇质兼夹', values: [1, 2, 2, 3, 5, 4, 3, 2, 5, 5, 4, 2, 3, 5, 3, 1, 5, 3, 3, 4, 1, 4, 5, 4, 4, 3] },
];

for (const embedded of [false, true]) {
  for (const profile of profiles) {
    test(`constitution shell actions: ${embedded ? 'birth' : 'standalone'}, ${profile.count} biased matches at minimum height`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 400, height: 640 });
      await page.goto(embedded ? '/yunqi/birth' : '/yunqi/constitution');
      const actions = page.locator('.panel-shell__actions');
      if (embedded) {
        const submit = actions.getByRole('button', { name: '查看对照', exact: true });
        await expect(submit).toHaveAttribute('form', await page.getByRole('form', { name: '出生运气输入' }).getAttribute('id'));
        await expect(actions).toBeInViewport({ ratio: 1 });
        await fillBirthDate(page, '1990-05-12');
        await submit.click();
        await actions.getByRole('button', { name: '同时测评体质', exact: true }).click();
      }
      await answerConstitution(page, page, { values: profile.values });
      if (profile.count === 7) await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expectViewControls(page, testInfo);
      await expect(actions.getByRole('button', { name: '查看结果', exact: true })).toBeInViewport({ ratio: 1 });
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
      await actions.getByRole('button', { name: '查看结果', exact: true }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const { data } = await response.json();
      expect(data.matchedTypes).toHaveLength(profile.count);
      expect(data.matchedTypes).not.toContain('balanced');
      const result = await expectConstitutionResults(page, data);
      await expect(result.locator('.constitution-decision h4')).toHaveText(profile.title);
      await expect(actions.getByRole('button')).toHaveText(['结束并销毁答卷', '返回修改']);
      await expectViewControls(page, testInfo);
      await expectTypeScale(page, testInfo);
      await screenshot(page, testInfo, `${embedded ? 'birth' : 'standalone'}-${profile.count}-matches-result`);
      const bounds = await actions.boundingBox();
      await page.getByRole('main').evaluate(content => { content.scrollTop = content.scrollHeight; });
      await expect(actions).toBeInViewport({ ratio: 1 });
      expect(await actions.boundingBox()).toEqual(bounds);
      expect(await actions.evaluate(element => element.previousElementSibling.matches('.panel-shell__content') && element.nextElementSibling.matches('.panel-shell__footer'))).toBe(true);
      const lastContentTarget = embedded ? page.locator('.birth-technical > summary') : page.getByText('量表来源与适用说明', { exact: true });
      await lastContentTarget.focus();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(result).toHaveCount(0);
      await expect(page.locator('.constitution-question-title')).toBeFocused();
      await expect(page.locator('.constitution-sex-summary')).toHaveText('男性版 · 更换');
      await expect(page.locator('.constitution-progress-header > span').first()).toHaveText('GB/T 46939-2025 · 26 题');
      await screenshot(page, testInfo, `${embedded ? 'birth' : 'standalone'}-${profile.count}-matches-edit`);
      await actions.getByRole('button', { name: '结束并销毁答卷', exact: true }).click();
      if (embedded) await expect(actions.getByRole('button', { name: '同时测评体质', exact: true })).toBeFocused();
      else await expect(page.getByRole('radio', { name: '男', exact: true })).toBeFocused();
    });
  }
}
