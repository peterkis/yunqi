import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('InquiryEntryPage responsive layout', () => {
  it('retains its bounded grid and selects one column by panel width', () => {
    const stylesheet = readFileSync('src/styles/global.css', 'utf8');
    const pageDeclarations = stylesheet.match(
      /\.inquiry-entry-page\s*\{([^}]*)\}/s,
    )?.[1];
    const gridDeclarations = stylesheet.match(
      /\.inquiry-capability-grid\s*\{([^}]*)\}/s,
    )?.[1];
    const mobileBlock = stylesheet.match(
      /@container workbench \(max-width: 46rem\)\s*\{([\s\S]*)\}\s*@media \(prefers-reduced-motion/s,
    )?.[1];

    expect(pageDeclarations).toContain('min-width: 0;');
    expect(gridDeclarations).toContain(
      'grid-template-columns: repeat(3, minmax(0, 1fr));',
    );
    expect(mobileBlock).toMatch(
      /\.inquiry-capability-grid\s*\{[^}]*grid-template-columns: 1fr;/s,
    );
  });
});
