import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('local design assets and stylesheet entry', () => {
  it.each(['NotoSansSC-VF.woff2', 'NotoSerifSC-VF.woff2', 'OFL.txt'])(
    'distributes the unchanged source asset %s',
    (filename) => {
      const source = readFileSync(`../../docs/design/design-system/fonts/${filename}`);
      const distributed = readFileSync(`public/fonts/${filename}`);
      expect(distributed.equals(source)).toBe(true);
    },
  );

  it('declares both variable fonts from the same origin with swap and the full weight range', () => {
    const css = readFileSync('src/styles/fonts.css', 'utf8');
    const declarations = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((match) => match[1]);
    expect(declarations).toHaveLength(2);
    for (const [index, font] of ['Sans', 'Serif'].entries()) {
      expect(declarations[index]).toContain(`font-family: "Noto ${font} SC";`);
      expect(declarations[index]).toContain(`src: url("/fonts/Noto${font}SC-VF.woff2") format("woff2");`);
      expect(declarations[index]).toContain('font-weight: 400 700;');
      expect(declarations[index]).toContain('font-style: normal;');
      expect(declarations[index]).toContain('font-display: swap;');
    }
  });

  it('preloads only the same-origin sans font', () => {
    const html = new DOMParser().parseFromString(
      readFileSync('index.html', 'utf8'), 'text/html',
    );
    const preloads = html.querySelectorAll('link[rel="preload"]');
    expect(preloads).toHaveLength(1);
    expect(preloads[0].getAttribute('href')).toBe('/fonts/NotoSansSC-VF.woff2');
    expect(preloads[0].getAttribute('as')).toBe('font');
    expect(preloads[0].getAttribute('type')).toBe('font/woff2');
    expect(preloads[0].hasAttribute('crossorigin')).toBe(true);
  });

  it('loads fonts and tokens before demo styles, without changing the demo font stack', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    expect(main.indexOf("import './styles/fonts.css'")).toBeLessThan(main.indexOf("import './styles/global.css'"));
    expect(main.indexOf("import './styles/tokens.css'")).toBeLessThan(main.indexOf("import './styles/global.css'"));
    expect(main).toContain("import './styles/design-components.css'");
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).not.toContain('var(--font-sans)');
    expect(css).not.toContain('var(--font-serif)');
  });
});
