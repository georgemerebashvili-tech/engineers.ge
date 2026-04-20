import {expect, test} from '@playwright/test';

/**
 * Regression: the brightness slider used to flip dark↔light at exactly tint=50.
 * Mouse jitter inside 48..52 caused visible strobing between day and night. The
 * fix adds a hysteresis dead-zone (45..55) around the threshold so crossing is
 * deliberate. These tests pin that behavior from the UI side.
 */

test.describe('brightness slider hysteresis', () => {
  test('sitting at tint=52 from the dark side stays dark', async ({page}) => {
    // Seed localStorage to "dark with tint=20", then visit
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('bg-tint', '20');
    });
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    // Drag slider into the dead zone via setTint (simulates user reaching 52)
    await page.evaluate(() => {
      const r = document.documentElement;
      // Mirror the provider's setTint via storage + manual apply: the provider
      // listens to a new `input` event on the range. Easier: write storage and
      // dispatch storage event to trigger re-read. But the slider reads React
      // state, not storage. Instead: interact with the actual slider element.
      const range = document.querySelector(
        'input[type="range"][aria-label="სიკაშკაშე"]'
      ) as HTMLInputElement | null;
      if (!range) throw new Error('slider not found');
      // React uses Object.defineProperty on input.value; bypass with native setter.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      setter.call(range, '52');
      range.dispatchEvent(new Event('input', {bubbles: true}));
      void r;
    });

    // Give React an rAF to flush the update
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('sitting at tint=48 from the light side stays light', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('bg-tint', '80');
    });
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await page.evaluate(() => {
      const range = document.querySelector(
        'input[type="range"][aria-label="სიკაშკაშე"]'
      ) as HTMLInputElement | null;
      if (!range) throw new Error('slider not found');
      const setter48 = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      setter48.call(range, '48');
      range.dispatchEvent(new Event('input', {bubbles: true}));
    });

    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('crossing past 55 from dark flips to light', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bg-tint', '20'));
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.evaluate(() => {
      const range = document.querySelector(
        'input[type="range"][aria-label="სიკაშკაშე"]'
      ) as HTMLInputElement | null;
      if (!range) throw new Error('slider not found');
      const setter60 = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      setter60.call(range, '60');
      range.dispatchEvent(new Event('input', {bubbles: true}));
    });

    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('crossing below 45 from light flips to dark', async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bg-tint', '80'));
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await page.evaluate(() => {
      const range = document.querySelector(
        'input[type="range"][aria-label="სიკაშკაშე"]'
      ) as HTMLInputElement | null;
      if (!range) throw new Error('slider not found');
      const setter40 = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )!.set!;
      setter40.call(range, '40');
      range.dispatchEvent(new Event('input', {bubbles: true}));
    });

    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});
