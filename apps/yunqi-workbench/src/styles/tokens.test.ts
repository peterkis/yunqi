import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Theme = 'light' | 'dark';
interface Token {
  readonly name: string;
  readonly value: string | Record<Theme, string>;
}
interface TypeStyle {
  readonly name: string;
  readonly fontSize: string;
  readonly lineHeight: number;
  readonly fontWeight: number;
  readonly letterSpacing?: string;
}
interface DesignTokens {
  readonly color: { readonly tokens: readonly Token[] };
  readonly spacing: { readonly tokens: readonly Token[] };
  readonly radius: { readonly tokens: readonly Token[] };
  readonly shadow: { readonly tokens: readonly Token[] };
  readonly size: { readonly tokens: readonly Token[] };
  readonly zIndex: { readonly tokens: readonly Token[] };
  readonly type: {
    readonly families: Record<string, string>;
    readonly groups: readonly { readonly styles: readonly TypeStyle[] }[];
  };
}

const tokens: DesignTokens = JSON.parse(readFileSync(
  '../../docs/design/design-system/tokens.json',
  'utf8',
));
const stylesheet = readFileSync('src/styles/tokens.css', 'utf8');
const variableName = (name: string) => `--${name.replaceAll('.', '_')}`;

function expectedDeclarations(theme: Theme) {
  const declarations: Record<string, string> = {};
  for (const category of ['color', 'spacing', 'radius', 'shadow', 'size', 'zIndex'] as const) {
    for (const token of tokens[category].tokens) {
      const value = typeof token.value === 'string' ? token.value : token.value[theme];
      const alias = value.match(/^\{([^}]+)\}$/);
      declarations[variableName(token.name)] = alias ? `var(${variableName(alias[1])})` : value;
    }
  }
  for (const [family, stack] of Object.entries(tokens.type.families)) {
    declarations[`--font-${family}`] = stack;
  }
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      declarations[`--type-${style.name}-size`] = style.fontSize;
      declarations[`--type-${style.name}-line`] = String(style.lineHeight);
      declarations[`--type-${style.name}-weight`] = String(style.fontWeight);
      if (style.letterSpacing !== undefined) {
        declarations[`--type-${style.name}-tracking`] = style.letterSpacing;
      }
    }
  }
  return declarations;
}

function assertTokenParity(css: string) {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  expect(rules.map((rule) => rule[1].replace(/\s+/g, ' ').trim())).toEqual([
    ':root, [data-theme="light"]',
    '[data-theme="dark"]',
  ]);
  for (const [index, theme] of (['light', 'dark'] as const).entries()) {
    const declarations = [...rules[index][2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map((match) => [match[1], match[2].trim()]);
    expect(new Set(declarations.map(([name]) => name)).size).toBe(declarations.length);
    expect(Object.fromEntries(declarations), theme).toEqual(expectedDeclarations(theme));
    for (const [, value] of declarations) {
      for (const reference of value.matchAll(/var\((--[\w-]+)\)/g)) {
        expect(expectedDeclarations(theme)).toHaveProperty(reference[1]);
      }
    }
  }
}

describe('versioned design token parity', () => {
  it('matches every value and alias in both themes, with no extra design variables', () => {
    assertTokenParity(stylesheet);
  });

  it.each([
    ['a changed light value', '--surface-page: #fbfaf7;', '--surface-page: #ffffff;'],
    ['a changed dark value', '--surface-page: #151816;', '--surface-page: #ffffff;'],
    ['a changed alias', '--relation-neutral-bg: var(--surface-sunken);', '--relation-neutral-bg: var(--surface-card);'],
    ['a missing variable', '--space-0_5: 2px;', ''],
    ['an undeclared variable', '--font-sans:', '--invented: 1px;\n  --font-sans:'],
    ['a duplicate variable', '--dot-size: 8px;', '--dot-size: 8px;\n  --dot-size: 8px;'],
  ])('rejects %s', (_description, before, after) => {
    expect(stylesheet).toContain(before);
    expect(() => assertTokenParity(stylesheet.replace(before, after))).toThrow();
  });

  it('keeps foundation constants scoped, documented, and consistent with their component sources', () => {
    const source = readFileSync('src/styles/design-components.css', 'utf8');
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    // Read the dimensions from the independent design sources. Component
    // constants are not generated theme tokens and must never enter tokens.css.
    const constantSources = [
      ['--ds-hairline', '1-layout.md', /\| 卡片 \|[^\n]*\| (\d+px) `border-default`/, ''],
      ['--ds-metal-ring-width', 'components/ElementDot/README.md', /([\d.]+px) `element-metal-ring`/, ''],
      ['--ds-dot-compact-size', 'components/ElementDot/README.md', /对照表内 (\d+)px/, 'px'],
      ['--ds-chip-compact-height', 'components/RelationChip/README.md', /对照表内 (\d+)px/, 'px'],
      ['--ds-button-primary-padding-inline', 'components/Button/preview.html', /height:40px;padding:0 (\d+px);border:0/, ''],
      ['--ds-button-secondary-size', 'components/Button/README.md', /次：[^\n]*，([\d.]+)\/400/, 'px'],
      ['--ds-text-button-size', 'components/Button/README.md', /文字：[^\n]*，([\d.]+)px /, 'px'],
      ['--ds-segment-size', 'components/SegmentedNav/README.md', /当前段：[^\n]*、([\d.]+)px\/600/, 'px'],
      ['--ds-segment-inset', 'components/SegmentedNav/README.md', /轨道[^\n]*内距 (\d+)，/, 'px'],
      ['--ds-segment-compact-height', 'components/SegmentedNav/README.md', /用同一组件的 (\d+)px 高变体/, 'px'],
      ['--ds-panel-header-size', 'components/PanelHeader/README.md', /中：[^\n]*（([\d.]+)\/600/, 'px'],
      ['--ds-panel-header-title-line', 'components/PanelHeader/preview.html', /flex-direction:column;line-height:([\d.]+);/, ''],
    ] as const;
    const expectedConstants: Record<string, string> = {};
    const notes = Object.fromEntries([...source.matchAll(
      /\/\*\s*Source:\s*([\s\S]*?)\*\/\s*(--ds-[\w-]+)\s*:/g,
    )].map((match) => [match[2], match[1]]));
    for (const [name, document, pattern, unit] of constantSources) {
      const designSource = readFileSync(`../../docs/design/design-system/${document}`, 'utf8');
      const match = designSource.match(pattern);
      expect(match, `${name} must have a source value in ${document}`).not.toBeNull();
      expectedConstants[name] = `${match![1]}${unit}`;
      expect(notes[name], `${name} must cite its source beside the declaration`)
        .toContain(`docs/design/design-system/${document}`);
    }

    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const constants = rules.flatMap((rule) => [...rule[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map((match) => [match[1], match[2].trim()]));
    expect(constants).toHaveLength(Object.keys(expectedConstants).length);
    expect(Object.fromEntries(constants)).toEqual(expectedConstants);
    expect(stylesheet).not.toContain('--ds-');

    const declaredNames = [...Object.keys(expectedDeclarations('light')), ...Object.keys(expectedConstants)];
    for (const reference of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declaredNames).toContain(reference[1]);
    }
    for (const rule of rules) {
      for (const selector of rule[1].split(',')) {
        expect(selector.trim()).toMatch(/^\.ds-/);
      }
      const declarations = rule[2].replace(/--[\w-]+\s*:\s*[^;]+;/g, '');
      expect(declarations).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|\b\d*\.?\d+(?:px|rem|em)\b/i);
      expect(declarations).not.toMatch(/(?:font-size|line-height)\s*:\s*calc\(/);
    }
    expect(css).not.toMatch(/calc\([^;]*\//);
  });
});
