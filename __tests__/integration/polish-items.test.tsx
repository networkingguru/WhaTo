/**
 * Code-structure verification tests for UI polish items.
 * These read source files and verify expected patterns exist,
 * without rendering components (avoids heavy dependency mocking).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

// ─── 1. Card detail in group-swipe ──────────────────────────────────────────

describe('Card detail in group-swipe', () => {
  const src = readSource('app/group-swipe.tsx');

  it('imports CardDetail', () => {
    expect(src).toMatch(/import\s+\{[^}]*CardDetail[^}]*\}\s+from/);
  });

  it('has detailCard state', () => {
    expect(src).toMatch(/useState<CardItem\s*\|\s*null>\(null\)/);
    expect(src).toContain('detailCard');
    expect(src).toContain('setDetailCard');
  });

  it('passes onTap prop to SwipeDeck', () => {
    expect(src).toMatch(/onTap=\{.*setDetailCard/);
  });

  it('renders CardDetail when detailCard is set', () => {
    expect(src).toMatch(/\{detailCard\s*&&\s*[\s\S]*?<CardDetail/);
  });
});

// ─── 2. Keyboard dismiss on enter-name ──────────────────────────────────────

describe('Keyboard dismiss on enter-name', () => {
  const src = readSource('app/index.tsx');

  it('imports TouchableWithoutFeedback and Keyboard', () => {
    expect(src).toMatch(/TouchableWithoutFeedback/);
    expect(src).toMatch(/Keyboard/);
  });

  it('wraps enter-name form with TouchableWithoutFeedback + Keyboard.dismiss', () => {
    // The enter-name phase should be wrapped
    expect(src).toMatch(/TouchableWithoutFeedback\s+onPress=\{Keyboard\.dismiss\}/);
  });
});

// ─── 3. Options button prominence ───────────────────────────────────────────

describe('Options button prominence', () => {
  const src = readSource('app/index.tsx');

  it('uses styles.optionsButton (not optionsLink) for the Options touchable', () => {
    expect(src).toMatch(/style=\{styles\.optionsButton\}/);
    expect(src).not.toMatch(/style=\{styles\.optionsLink\}/);
  });

  it('optionsButton style has borderWidth', () => {
    // Extract the optionsButton style block
    const match = src.match(/optionsButton:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toContain('borderWidth');
  });

  it('optionsButton style has padding', () => {
    const match = src.match(/optionsButton:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toMatch(/paddingVertical/);
    expect(block).toMatch(/paddingHorizontal/);
  });
});

// ─── 4. Color-coded hints ───────────────────────────────────────────────────

describe('Color-coded hints in swipe.tsx', () => {
  const src = readSource('app/swipe.tsx');

  it('uses styles.hintLeft and styles.hintRight', () => {
    expect(src).toMatch(/styles\.hintLeft/);
    expect(src).toMatch(/styles\.hintRight/);
  });

  it('hintLeft has red color', () => {
    const match = src.match(/hintLeft:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toMatch(/color:\s*['"]#FF4444['"]/);
  });

  it('hintRight has green color', () => {
    const match = src.match(/hintRight:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toMatch(/color:\s*['"]#4CAF50['"]/);
  });

  it('hint styles are standalone (not typography.caption)', () => {
    const hintLeftBlock = src.match(/hintLeft:\s*\{([^}]+)\}/)?.[1] ?? '';
    const hintRightBlock = src.match(/hintRight:\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(hintLeftBlock).not.toContain('typography.caption');
    expect(hintRightBlock).not.toContain('typography.caption');
  });
});

describe('Color-coded hints in group-swipe.tsx', () => {
  const src = readSource('app/group-swipe.tsx');

  it('uses styles.hintLeft and styles.hintRight', () => {
    expect(src).toMatch(/styles\.hintLeft/);
    expect(src).toMatch(/styles\.hintRight/);
  });

  it('hintLeft has red color', () => {
    const match = src.match(/hintLeft:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toMatch(/color:\s*['"]#FF4444['"]/);
  });

  it('hintRight has green color', () => {
    const match = src.match(/hintRight:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const block = match![1];
    expect(block).toMatch(/color:\s*['"]#4CAF50['"]/);
  });

  it('hint styles are standalone (not typography.caption)', () => {
    const hintLeftBlock = src.match(/hintLeft:\s*\{([^}]+)\}/)?.[1] ?? '';
    const hintRightBlock = src.match(/hintRight:\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(hintLeftBlock).not.toContain('typography.caption');
    expect(hintRightBlock).not.toContain('typography.caption');
  });
});

// ─── 5. SwipeDeck overlay improvements ──────────────────────────────────────

describe('SwipeDeck overlay improvements', () => {
  const src = readSource('src/components/SwipeDeck.tsx');

  it('overlay text fontSize is >= 28', () => {
    const leftMatch = src.match(/overlayLeftText:\s*\{([^}]+)\}/);
    const rightMatch = src.match(/overlayRightText:\s*\{([^}]+)\}/);
    expect(leftMatch).toBeTruthy();
    expect(rightMatch).toBeTruthy();

    const leftSize = leftMatch![1].match(/fontSize:\s*(\d+)/);
    const rightSize = rightMatch![1].match(/fontSize:\s*(\d+)/);
    expect(leftSize).toBeTruthy();
    expect(rightSize).toBeTruthy();
    expect(Number(leftSize![1])).toBeGreaterThanOrEqual(28);
    expect(Number(rightSize![1])).toBeGreaterThanOrEqual(28);
  });

  it('has cardTintRed and cardTintGreen styles', () => {
    expect(src).toMatch(/cardTintRed:\s*\{/);
    expect(src).toMatch(/cardTintGreen:\s*\{/);
  });

  it('cardTint animated views are rendered', () => {
    expect(src).toMatch(/styles\.cardTintRed/);
    expect(src).toMatch(/styles\.cardTintGreen/);
    // They should be Animated.View with pointerEvents="none"
    expect(src).toMatch(/Animated\.View\s+style=\{[^}]*cardTintRed/);
    // Actually match the JSX pattern more flexibly
    expect(src).toMatch(/cardTint.*cardTintRed.*cardTintLeftStyle/s);
    expect(src).toMatch(/cardTint.*cardTintGreen.*cardTintRightStyle/s);
  });

  it('overlay backgrounds have backgroundColor', () => {
    const overlayLeftBlock = src.match(/overlayLeft:\s*\{([^}]+)\}/)?.[1] ?? '';
    const overlayRightBlock = src.match(/overlayRight:\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(overlayLeftBlock).toContain('backgroundColor');
    expect(overlayRightBlock).toContain('backgroundColor');
  });

  it('cardTintRed and cardTintGreen have backgroundColor', () => {
    const redBlock = src.match(/cardTintRed:\s*\{([^}]+)\}/)?.[1] ?? '';
    const greenBlock = src.match(/cardTintGreen:\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(redBlock).toContain('backgroundColor');
    expect(greenBlock).toContain('backgroundColor');
  });
});
