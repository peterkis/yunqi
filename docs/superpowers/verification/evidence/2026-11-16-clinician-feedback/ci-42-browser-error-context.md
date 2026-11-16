# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: learning.flows.spec.mjs >> constitution workflow keeps the current context, prevents partial scoring and shows all nine independent results
- Location: tests/browser/learning.flows.spec.mjs:85:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '下一组', exact: true })
    - locator resolved to <button type="button" class="primary-button">下一组</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - link "跳至主要内容" [ref=e5] [cursor=pointer]:
    - /url: "#workbench-content"
  - banner [ref=e6]:
    - generic [ref=e7]:
      - generic [aria-hidden] [ref=e8]: 运
      - generic [ref=e9]:
        - paragraph [ref=e10]: 中医五运六气 · 结构化原型系统
        - heading "TCM YunQi Lab" [level=1] [ref=e11]
    - generic [ref=e12]:
      - generic [ref=e13]: 临床教学工作台 · 学习与测评
      - button "切换至深色主题" [ref=e14] [cursor=pointer]: 深色
  - generic [ref=e17]:
    - navigation "工作台导航" [ref=e18]:
      - paragraph [ref=e19]: 工作台导航
      - list [ref=e20]:
        - listitem [ref=e21]:
          - link "当前五运六气" [ref=e22] [cursor=pointer]:
            - /url: /yunqi/current
            - generic [aria-hidden] [ref=e23]: 今
            - text: 当前五运六气
        - listitem [ref=e24]:
          - link "出生运气对照" [ref=e25] [cursor=pointer]:
            - /url: /yunqi/birth
            - generic [aria-hidden] [ref=e26]: 先
            - text: 出生运气对照
        - listitem [ref=e27]:
          - link "体质测评" [ref=e28] [cursor=pointer]:
            - /url: /yunqi/constitution
            - generic [aria-hidden] [ref=e29]: 体
            - text: 体质测评
        - listitem [ref=e30]:
          - link "年度分析" [ref=e31] [cursor=pointer]:
            - /url: /yunqi/year
            - generic [aria-hidden] [ref=e32]: 年
            - text: 年度分析
        - listitem [ref=e33]:
          - link "指定时点" [ref=e34] [cursor=pointer]:
            - /url: /yunqi/calculate
            - generic [aria-hidden] [ref=e35]: 时
            - text: 指定时点
        - listitem [ref=e36]:
          - link "问诊 规划中" [ref=e37] [cursor=pointer]:
            - /url: /yunqi/inquiry
            - generic [aria-hidden] [ref=e38]: 问
            - text: 问诊
            - generic [ref=e39]: 规划中
      - paragraph [ref=e40]: 规则学习 · 运气对照 · 体质测评
    - main [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: 当下状态 · 独立测评
          - heading "中医体质测评" [level=2] [ref=e45]
          - paragraph [ref=e46]: 按量表回顾自身表现，同时参考当前运气。出生运气与量表体质分别解释。
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]:
              - heading "中医体质分类与判定量表" [level=3] [ref=e50]
              - paragraph [ref=e51]: GB/T 46939-2025 · YQ-CONSTITUTION-1.0.0
              - paragraph [ref=e52]: 请根据近一年的体验和感觉逐题回答。相同问题只回答一次；按量表适用项选择男或女后，需完成26题。答案仅用于本次计分，不保存患者档案。
            - form "中医体质量表" [ref=e53]:
              - group "量表所用性别" [ref=e54]:
                - paragraph [ref=e56]: 用于显示对应条目。切换后将清空本次作答和结果。
                - generic [ref=e57]:
                  - generic [ref=e58] [cursor=pointer]:
                    - radio "男" [checked] [ref=e59]
                    - text: 男
                  - generic [ref=e60] [cursor=pointer]:
                    - radio "女" [ref=e61]
                    - text: 女
              - generic [ref=e62]:
                - generic [ref=e63]: 已答 0 / 26 题
                - progressbar "量表作答进度" [ref=e64]
              - heading "第 2 组 / 共 5 组" [active] [level=3] [ref=e65]
              - generic [ref=e66]:
                - group "7您胃脘部、背部或腰膝部怕冷吗？" [ref=e67]:
                  - generic [ref=e69]:
                    - generic [ref=e70] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e71]
                      - generic [ref=e72]: 没有（根本不）
                    - generic [ref=e73] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e74]
                      - generic [ref=e75]: 很少（有一点）
                    - generic [ref=e76] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e77]
                      - generic [ref=e78]: 有时（有些）
                    - generic [ref=e79] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e80]
                      - generic [ref=e81]: 经常（相当）
                    - generic [ref=e82] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e83]
                      - generic [ref=e84]: 总是（非常）
                - group "8您感到怕冷、衣服比别人穿得多吗？" [ref=e85]:
                  - generic [ref=e87]:
                    - generic [ref=e88] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e89]
                      - generic [ref=e90]: 没有（根本不）
                    - generic [ref=e91] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e92]
                      - generic [ref=e93]: 很少（有一点）
                    - generic [ref=e94] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e95]
                      - generic [ref=e96]: 有时（有些）
                    - generic [ref=e97] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e98]
                      - generic [ref=e99]: 经常（相当）
                    - generic [ref=e100] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e101]
                      - generic [ref=e102]: 总是（非常）
                - group "9您感觉身体、脸上发热吗？" [ref=e103]:
                  - generic [ref=e105]:
                    - generic [ref=e106] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e107]
                      - generic [ref=e108]: 没有（根本不）
                    - generic [ref=e109] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e110]
                      - generic [ref=e111]: 很少（有一点）
                    - generic [ref=e112] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e113]
                      - generic [ref=e114]: 有时（有些）
                    - generic [ref=e115] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e116]
                      - generic [ref=e117]: 经常（相当）
                    - generic [ref=e118] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e119]
                      - generic [ref=e120]: 总是（非常）
                - group "10您皮肤或口唇干吗？" [ref=e121]:
                  - generic [ref=e123]:
                    - generic [ref=e124] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e125]
                      - generic [ref=e126]: 没有（根本不）
                    - generic [ref=e127] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e128]
                      - generic [ref=e129]: 很少（有一点）
                    - generic [ref=e130] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e131]
                      - generic [ref=e132]: 有时（有些）
                    - generic [ref=e133] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e134]
                      - generic [ref=e135]: 经常（相当）
                    - generic [ref=e136] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e137]
                      - generic [ref=e138]: 总是（非常）
                - group "11您面部两颧潮红或偏红吗？" [ref=e139]:
                  - generic [ref=e141]:
                    - generic [ref=e142] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e143]
                      - generic [ref=e144]: 没有（根本不）
                    - generic [ref=e145] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e146]
                      - generic [ref=e147]: 很少（有一点）
                    - generic [ref=e148] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e149]
                      - generic [ref=e150]: 有时（有些）
                    - generic [ref=e151] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e152]
                      - generic [ref=e153]: 经常（相当）
                    - generic [ref=e154] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e155]
                      - generic [ref=e156]: 总是（非常）
                - group "12您感到身体沉重不轻松或不爽快吗？" [ref=e157]:
                  - generic [ref=e159]:
                    - generic [ref=e160] [cursor=pointer]:
                      - radio "没有（根本不）" [ref=e161]
                      - generic [ref=e162]: 没有（根本不）
                    - generic [ref=e163] [cursor=pointer]:
                      - radio "很少（有一点）" [ref=e164]
                      - generic [ref=e165]: 很少（有一点）
                    - generic [ref=e166] [cursor=pointer]:
                      - radio "有时（有些）" [ref=e167]
                      - generic [ref=e168]: 有时（有些）
                    - generic [ref=e169] [cursor=pointer]:
                      - radio "经常（相当）" [ref=e170]
                      - generic [ref=e171]: 经常（相当）
                    - generic [ref=e172] [cursor=pointer]:
                      - radio "总是（非常）" [ref=e173]
                      - generic [ref=e174]: 总是（非常）
              - generic [ref=e175]:
                - button "上一组" [ref=e176] [cursor=pointer]
                - button "下一组" [ref=e177] [cursor=pointer]
              - generic [ref=e178]:
                - button "清空本次测评" [ref=e179] [cursor=pointer]
                - generic [ref=e180]: 不保存身份或作答；离开页面后清空。
            - group [ref=e181]:
              - generic "量表来源与适用说明" [ref=e182] [cursor=pointer]
          - complementary "测评时的当前运气" [ref=e183]:
            - region [ref=e184]:
              - heading "当前运气参考" [level=2] [ref=e186]
              - generic [ref=e187]:
                - generic [ref=e188]:
                  - time [ref=e189]: 2024-01-20 22:07:22
                  - generic [ref=e190]: 北京时间 UTC+08
                - paragraph [ref=e191]: 2024 · 甲辰
                - generic [ref=e192]:
                  - generic [ref=e193]:
                    - term [ref=e194]: 岁运
                    - definition [ref=e195]: 土运太过
                  - generic [ref=e196]:
                    - term [ref=e197]: 司天
                    - definition [ref=e198]: 太阳寒水
                  - generic [ref=e199]:
                    - term [ref=e200]: 在泉
                    - definition [ref=e201]: 太阴湿土
                  - generic [ref=e202]:
                    - term [ref=e203]: 初运 · 主运
                    - definition [ref=e204]: 木运太过（太角）
                  - generic [ref=e205]:
                    - term [ref=e206]: 初运 · 客运
                    - definition [ref=e207]: 土运太过（太宫）
                  - generic [ref=e208]:
                    - term [ref=e209]: 初之气 · 主气
                    - definition [ref=e210]: 厥阴风木
                  - generic [ref=e211]:
                    - term [ref=e212]: 初之气 · 客气
                    - definition [ref=e213]: 少阳相火
                - generic [ref=e214]:
                  - generic [ref=e215]: 司天与中运 · 不和
                  - generic [ref=e216]: 当步主客气 · 相生 · 相得
                - paragraph [ref=e217]: 五步运按教学口径分段，待专家确认。
            - paragraph [ref=e218]: 量表计分独立于运气计算，不用生日或当前时气修改体质得分。
      - generic [ref=e219]:
        - group [ref=e220]:
          - generic "技术信息 · 接口契约" [ref=e221] [cursor=pointer]
        - complementary "系统边界" [ref=e222]:
          - generic [aria-hidden] [ref=e223]: 界
          - paragraph [ref=e224]: 本系统用于理论说明、规则解释与线索整理，不提供自动诊断、辨证或治疗决策。
```

# Test source

```ts
  1   | import AxeBuilder from '@axe-core/playwright';
  2   | import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';
  3   | 
  4   | async function checkAccessibility(page, testInfo) {
  5   |   const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  6   |   await testInfo.attach('learning-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  7   |   expect(scan.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  8   | }
  9   | 
  10  | test('current teaching view keeps other stages folded and exposes original excerpts and relationship sources by keyboard', async ({ page, diagnostics }, testInfo) => {
  11  |   await loadCurrent(page);
  12  |   const annual = page.locator('.annual-disclosure');
  13  |   await expect(annual).not.toHaveAttribute('open');
  14  |   await expect(page.locator('.timeline-item__toggle').first()).toBeHidden();
  15  |   await expect(page.getByRole('heading', { name: /^当前五运 ·/ })).toBeVisible();
  16  |   await expect(page.getByText('教学口径 · 待专家确认。五运与六气各有分段。')).toBeVisible();
  17  |   await expect(page.locator('.learning-relations > article')).toHaveCount(2);
  18  |   const sourceDetails = page.locator('.relation-hint .inline-disclosure').first();
  19  |   await sourceDetails.locator('summary').focus();
  20  |   await page.keyboard.press('Enter');
  21  |   await expect(sourceDetails.locator('a').first()).toBeVisible();
  22  |   await expect(sourceDetails.locator('a').first()).toHaveAttribute('href', /^https:\/\//);
  23  |   const excerpt = page.locator('.classical-disclosure').first();
  24  |   await expect(excerpt.locator('blockquote').first()).toBeHidden();
  25  |   await excerpt.locator('summary').focus();
  26  |   await page.keyboard.press('Space');
  27  |   await expect(excerpt.locator('blockquote').first()).toBeVisible();
  28  |   await expect(excerpt.getByText('阅读释义（非原文）').first()).toBeVisible();
  29  |   await excerpt.locator('summary').press('Enter');
  30  |   await expect(excerpt.locator('blockquote').first()).toBeHidden();
  31  |   await annual.locator('summary').focus();
  32  |   await page.keyboard.press('Enter');
  33  |   await expect(page.locator('.timeline-item__toggle').first()).toBeVisible();
  34  |   await annual.locator('summary').press('Space');
  35  |   await expect(page.locator('.timeline-item__toggle').first()).toBeHidden();
  36  |   await settle(page);
  37  |   expect(diagnostics.requests.filter((request) => request.url.endsWith('/learning/current'))).toHaveLength(1);
  38  |   await checkAccessibility(page, testInfo);
  39  |   await screenshot(page, testInfo, 'current-focused-learning');
  40  | });
  41  | 
  42  | test('birth comparison submits only requested precision, displays both contexts and clears edited personal data', async ({ page, diagnostics }, testInfo) => {
  43  |   await page.goto('/yunqi/birth');
  44  |   await expect(page.getByRole('heading', { name: '出生运气对照' })).toBeVisible();
  45  |   await settle(page);
  46  |   expect(diagnostics.requests).toHaveLength(0);
  47  |   const date = page.getByLabel('出生日期（公历）');
  48  |   await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  49  |   await expect(page.getByRole('alert')).toContainText('请填写有效的出生日期');
  50  |   await expect(date).toBeFocused();
  51  |   await date.fill('1990-05-12');
  52  |   const responsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  53  |   await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  54  |   const response = await responsePromise;
  55  |   expect(response.status()).toBe(200);
  56  |   const { data } = await response.json();
  57  |   expect(data.birthPrecision).toBe('date');
  58  |   expect(JSON.parse(diagnostics.requests[0].body)).toEqual({ birthDate: '1990-05-12' });
  59  |   const result = page.getByRole('region', { name: '出生与当前运气对照结果' });
  60  |   await expect(result).toBeVisible();
  61  |   await expect(page.locator('.birth-candidate')).toHaveCount(data.candidates.length);
  62  |   await expect(page.locator('.birth-current time').first()).toHaveAttribute('datetime', data.current.facts.input.localTime);
  63  |   await expect(page.locator('.birth-candidate__interval time').first()).toHaveAttribute('datetime', data.candidates[0].from.localTime);
  64  |   await expect(page.locator('.birth-candidate > .ui-panel time')).toHaveCount(0);
  65  |   await checkAccessibility(page, testInfo);
  66  |   await screenshot(page, testInfo, 'birth-and-current-comparison');
  67  |   await page.getByLabel('知道出生时刻').check();
  68  |   await expect(result).toHaveCount(0);
  69  |   await page.getByLabel('出生时刻（北京时间）').fill('09:30:21');
  70  |   const exactResponsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  71  |   await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  72  |   const exactResponse = await exactResponsePromise;
  73  |   expect(exactResponse.status()).toBe(200);
  74  |   const { data: exact } = await exactResponse.json();
  75  |   expect(exact.birthPrecision).toBe('time');
  76  |   await expect(result).toBeVisible();
  77  |   await expect(page.locator('.birth-candidate > .ui-panel time').first()).toHaveAttribute('datetime', exact.candidates[0].learning.facts.input.localTime);
  78  |   await page.getByRole('button', { name: '清空本次资料' }).click();
  79  |   await expect(result).toHaveCount(0);
  80  |   await expect(date).toHaveValue('');
  81  |   await expect(page.getByLabel('知道出生时刻')).not.toBeChecked();
  82  |   expect(new URL(page.url()).search).toBe('');
  83  | });
  84  | 
  85  | test('constitution workflow keeps the current context, prevents partial scoring and shows all nine independent results', async ({ page, diagnostics }, testInfo) => {
  86  |   await page.goto('/yunqi/constitution');
  87  |   await expect(page.getByRole('heading', { name: '中医体质测评', exact: true })).toBeVisible();
  88  |   await expect(page.getByRole('heading', { name: '当前运气参考', exact: true })).toBeVisible();
  89  |   await expect(page.getByRole('form', { name: '中医体质量表' })).toBeVisible();
  90  |   await page.getByRole('radio', { name: '男', exact: true }).check();
  91  |   await expect(page.locator('.question-list input:checked')).toHaveCount(0);
  92  |   while (await page.getByRole('button', { name: '下一组', exact: true }).isVisible()) {
> 93  |     await page.getByRole('button', { name: '下一组', exact: true }).click();
      |                                                                  ^ Error: locator.click: Test timeout of 45000ms exceeded.
  94  |   }
  95  |   await page.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
  96  |   await expect(page.getByRole('alert')).toContainText('题未作答');
  97  |   expect(diagnostics.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  98  |   while (true) {
  99  |     const questions = page.locator('.constitution-question');
  100 |     for (let index = 0; index < await questions.count(); index += 1) {
  101 |       await questions.nth(index).getByRole('radio').first().check();
  102 |     }
  103 |     const next = page.getByRole('button', { name: '下一组', exact: true });
  104 |     if (!(await next.isVisible())) break;
  105 |     await next.click();
  106 |   }
  107 |   const scoreResponsePromise = page.waitForResponse((response) => response.url().endsWith('/constitution/assess'));
  108 |   await page.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
  109 |   const scoreResponse = await scoreResponsePromise;
  110 |   expect(scoreResponse.status()).toBe(200);
  111 |   const { data } = await scoreResponse.json();
  112 |   const result = page.getByRole('region', { name: '体质测评结果' });
  113 |   await expect(result).toBeVisible();
  114 |   await expect(result.getByRole('progressbar')).toHaveCount(9);
  115 |   for (const dimension of data.results) {
  116 |     await expect(result.getByRole('progressbar', { name: `${dimension.name}转换分` })).toHaveAttribute('value', String(dimension.score));
  117 |   }
  118 |   const body = JSON.parse(diagnostics.requests.find((request) => request.url.endsWith('/constitution/assess')).body);
  119 |   expect(body.sex).toBe('male');
  120 |   expect(body.questionnaireId).toBe('GBT46939-2025');
  121 |   expect(Object.keys(body.answers)).toHaveLength(26);
  122 |   await result.scrollIntoViewIfNeeded();
  123 |   await checkAccessibility(page, testInfo);
  124 |   await screenshot(page, testInfo, 'constitution-nine-dimensions');
  125 |   await page.getByRole('radio', { name: '女', exact: true }).check();
  126 |   await expect(result).toHaveCount(0);
  127 |   await expect(page.getByText('已答 0 / 26 题', { exact: true })).toBeVisible();
  128 |   await expect(page.locator('.question-list input:checked')).toHaveCount(0);
  129 |   await page.getByRole('button', { name: '清空本次测评', exact: true }).click();
  130 |   await expect(page.getByRole('radio', { name: '女', exact: true })).not.toBeChecked();
  131 |   await expect(page.locator('.constitution-question')).toHaveCount(0);
  132 | });
  133 | 
```