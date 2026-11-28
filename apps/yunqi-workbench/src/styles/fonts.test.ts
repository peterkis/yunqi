import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const approvedFonts = {
  Sans: '3ec07a86c7edaa9ecfdcc784c562eebbecd33237ebecc2c886dbf6d587cc623c',
  Serif: '9d0c72e474723a570d6e69195e96e9f84f91dc7e99e50a29dab5b8f656f8ecfa',
};

function ranges(face: string): [number, number][] {
  const property = face.match(/unicode-range:\s*([^;]+);/)?.[1];
  if (!property) throw new Error('missing unicode-range');
  return property.split(',').map(part => {
    const match = /^U\+([\dA-F]+)(?:-([\dA-F]+))?$/i.exec(part.trim());
    if (!match) throw new Error('invalid font range: ' + part);
    return [parseInt(match[1], 16), parseInt(match[2] ?? match[1], 16)];
  });
}

describe('local design assets and stylesheet entry', () => {
  it.each(['NotoSansSC-VF.woff2', 'NotoSerifSC-VF.woff2', 'OFL.txt'])(
    'distributes the unchanged source asset %s',
    (filename) => {
      const source = readFileSync(`../../docs/design/design-system/fonts/${filename}`);
      const distributed = readFileSync(`public/fonts/${filename}`);
      expect(distributed.equals(source)).toBe(true);
    },
  );

  it.each(['Sans', 'Serif'] as const)('ships the reviewed %s UI font', style => {
    const data = readFileSync(`public/fonts/YunQiUI${style}-VF.woff2`);
    expect(createHash('sha256').update(data).digest('hex')).toBe(approvedFonts[style]);
  });

  it('gives each Unicode scalar exactly one local face per family and weight', () => {
    const css = readFileSync('src/styles/fonts.css', 'utf8');
    const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(match => match[1]);
    expect(blocks).toHaveLength(4);
    const repertoire = new Set(Array.from({ length: 95 }, (_, i) => i + 0x20));
    const text = readFileSync('scripts/ui-font-characters.txt', 'utf8').replace(/[\r\n]/g, '');
    for (const char of text) repertoire.add(char.codePointAt(0)!);
    for (const style of ['Sans', 'Serif']) {
      const family = blocks.filter(block => block.includes(`font-family: "Noto ${style} SC";`));
      expect(family).toHaveLength(2);
      for (const face of family) {
        expect(face).toContain('font-weight: 400 700;');
        expect(face).toContain('font-style: normal;');
        expect(face).toContain('font-display: swap;');
      }
      const coverage = (file: string) => {
        const block = family.find(face => face.includes(`src: url("/fonts/${file}-VF.woff2") format("woff2");`));
        expect(block).toBeDefined();
        return ranges(block!);
      };
      const common = coverage(`YunQiUI${style}`);
      const fallback = coverage(`Noto${style}SC`);
      const characters = new Set<number>();
      for (const [first, last] of common) {
        for (let code = first; code <= last; code++) characters.add(code);
      }
      expect(characters).toEqual(repertoire);
      expect(characters.has('甲'.codePointAt(0)!)).toBe(true);
      expect(characters.has('龘'.codePointAt(0)!)).toBe(false);
      let next = 0;
      for (const [start, end] of [...common, ...fallback].sort(([a], [b]) => a - b)) {
        expect(start).toBe(next);
        expect(end).toBeGreaterThanOrEqual(start);
        next = end + 1;
      }
      expect(next).toBe(0x110000);
    }
  });

  it('preloads only the same-origin UI sans font', () => {
    const html = new DOMParser().parseFromString(
      readFileSync('index.html', 'utf8'), 'text/html',
    );
    const preloads = html.querySelectorAll('link[rel="preload"]');
    expect(preloads).toHaveLength(1);
    expect(preloads[0].getAttribute('href')).toBe('/fonts/YunQiUISans-VF.woff2');
    expect(preloads[0].getAttribute('as')).toBe('font');
    expect(preloads[0].getAttribute('type')).toBe('font/woff2');
    expect(preloads[0].hasAttribute('crossorigin')).toBe(true);
  });

  it('loads local fonts and tokens before view styles, then applies the panel styles', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    expect(main.indexOf("import './styles/fonts.css'")).toBeLessThan(main.indexOf("import './styles/global.css'"));
    expect(main.indexOf("import './styles/tokens.css'")).toBeLessThan(main.indexOf("import './styles/global.css'"));
    expect(main).toContain("import './styles/design-components.css'");
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css.match(/:root\s*\{([^}]+)\}/s)?.[1]).toContain('font-family: var(--font-sans);');
    expect(main.indexOf("import './styles/panel-shell.css'")).toBeGreaterThan(main.indexOf("import './styles/design-components.css'"));
  });
});
