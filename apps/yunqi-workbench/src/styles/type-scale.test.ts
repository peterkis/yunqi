import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tiers = {
  'display-hero': ['display-xl', '40px'],
  'display-result': ['display-lg', '30px'],
  'display-column': ['display-md', '24px'],
  title: ['title', '20px'],
  quote: ['quote', '15px'],
  body: ['body', '14px'],
  small: ['caption', '12px'],
} as const;
const sizeVariables = Object.keys(tiers).map((tier) => `var(--ts-${tier})`);
const stylesheets = readdirSync('src/styles', { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.css') && !['tokens.css', 'type-scale.css'].includes(file));

function assertTierSizes(css: string) {
  // Inspect source declarations, including nested rules. jsdom's CSSOM drops
  // clamp() sizes and expands inherited shorthands, obscuring the author input.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of source.matchAll(/(?:^|[;{])\s*(font-size|font|--ts-[\w-]+)\s*:\s*([^;{}]+)(?=[;}])/gi)) {
    const property = match[1].toLowerCase();
    const value = match[2].replace(/\s*!important\s*$/i, '').trim();
    if (property === 'font-size' && value === 'var(--ts-countdown)') {
      expect(source.slice(0, match.index + 1)).toMatch(/(?:^|[{}])\s*\.current-period-cell--remaining\s*\{[^{}]*$/);
    } else if (property === 'font-size') expect(sizeVariables, match[0]).toContain(value);
    // A shorthand can otherwise bypass the font-size check entirely.
    if (property === 'font') expect(value, match[0]).toBe('inherit');
    expect(property, 'Only type-scale.css may define or override a tier').not.toMatch(/^--ts-/);
  }
}

describe('application typography scale', () => {
  it('aliases only existing size, leading and weight tokens for the five approved tiers', () => {
    const css = readFileSync('src/styles/type-scale.css', 'utf8');
    const definitions = [...css.matchAll(/(--ts-[\w-]+)\s*:\s*([^;]+);/g)]
      .map((match) => [match[1], match[2].trim()]);
    const tokens = Object.fromEntries([...readFileSync('src/styles/tokens.css', 'utf8')
      .matchAll(/(--type-[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
    expect(tokens['--type-meta-size']).toBe('11px');
    const expected: Record<string, string> = { '--ts-countdown': 'var(--type-meta-size)' };
    for (const [tier, [token, pixels]] of Object.entries(tiers)) {
      for (const [suffix, property] of [['', 'size'], ['-line', 'line'], ['-weight', 'weight']]) {
        const source = `--type-${token}-${property}`;
        expect(tokens).toHaveProperty(source);
        expected[`--ts-${tier}${suffix}`] = `var(${source})`;
      }
      expect(tokens[`--type-${token}-size`]).toBe(pixels);
    }
    expect(definitions).toHaveLength(Object.keys(expected).length);
    expect(Object.fromEntries(definitions)).toEqual(expected);
  });

  it.each(['src/main.tsx', 'src/test/design-foundations.tsx'])('loads the scale immediately after tokens in %s', (file) => {
    const imports = [...readFileSync(file, 'utf8').matchAll(/import ['"]([^'"]+\.css)['"]/g)]
      .map((match) => match[1].split('/').at(-1));
    const index = imports.indexOf('tokens.css');
    expect(index).toBeGreaterThanOrEqual(0);
    expect(imports[index + 1]).toBe('type-scale.css');
  });

  it.each(stylesheets)('%s uses tier variables for every size, including nested rules', (file) => {
    assertTierSizes(readFileSync(`src/styles/${file}`, 'utf8'));
  });

  it('accepts tier sizes in media rules and inherited font shorthands', () => {
    assertTierSizes('@media (min-width: 400px) { .valid { font-size: var(--ts-body); } } .valid { font: inherit; }');
  });

  it.each([
    ['bare pixels', '.invalid { font-size: 13px; }'],
    ['bare approved pixels', '.invalid { font-size: 14px; }'],
    ['relative sizes', '.invalid { font-size: 0.9rem; }'],
    ['responsive sizes', '.invalid { font-size: clamp(14px, 2vw, 20px); }'],
    ['direct legacy tokens', '.invalid { font-size: var(--type-value-size); }'],
    ['non-tier aliases', '.invalid { font-size: var(--button-size); }'],
    ['countdown size used for ordinary text', '.invalid { font-size: var(--ts-countdown); }'],
    ['fallbacks', '.invalid { font-size: var(--ts-body, 13px); }'],
    ['inherited sizes', '.invalid { font-size: inherit; }'],
    ['shorthands', '.invalid { font: 600 13px sans-serif; }'],
    ['nested violations', '@media (min-width: 400px) { .invalid { font-size: 13px; } }'],
    ['tier overrides', '.invalid { --ts-body: 13px; font-size: var(--ts-body); }'],
  ])('rejects %s', (_name, css) => {
    expect(() => assertTierSizes(css)).toThrow();
  });
});
