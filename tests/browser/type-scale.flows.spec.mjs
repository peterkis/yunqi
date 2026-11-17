import { test, expect, expectTypeScale } from './fixtures.mjs';

for (const [name, sizes, message] of [
  ['an unapproved size', [13], 'Visible text uses only the approved type sizes'],
  ['six approved sizes', [12, 14, 15, 20, 24, 30], 'Each screen uses at most five sizes'],
  ['mixed display alternatives', [24, 40], 'Each screen uses only one display size'],
]) {
  test(`typography gate rejects ${name}`, async ({ page }) => {
    // Deliberate violations test the shared oracle, not application UI.
    await page.setContent(sizes.map(size => `<p style="font-size:${size}px">字号反例 ${size}</p>`).join(''));
    await expect(expectTypeScale(page)).rejects.toThrow(message);
  });
}

test('typography gate ignores hidden and clipped text but includes closed summaries and native values', async ({ page }) => {
  await page.setContent(`
    <p style="font-size:14px">可见正文</p>
    <p hidden style="font-size:13px">隐藏文字</p>
    <p style="visibility:hidden;font-size:13px">隐藏文字</p>
    <details><summary style="font-size:12px">可见摘要</summary><p style="font-size:13px">折叠文字</p></details>
    <div style="overflow:auto;height:20px">
      <p style="font-size:14px;height:20px;margin:0">滚动区正文</p>
      <p style="font-size:40px;margin:0">屏外首眼</p>
      <p style="font-size:30px;margin:0">屏外首眼</p>
    </div>
    <input value="可见控件值" style="font-size:15px">
  `);
  const typography = await expectTypeScale(page);
  expect(typography.sizes).toEqual([12, 14, 15]);
  expect(typography.samples.some(sample => sample.text === '可见摘要')).toBe(true);
  expect(typography.samples.some(sample => sample.text === '可见控件值')).toBe(true);
  await page.locator('input').evaluate(input => { input.style.fontSize = '13px'; });
  await expect(expectTypeScale(page)).rejects.toThrow('Visible text uses only the approved type sizes');
});
