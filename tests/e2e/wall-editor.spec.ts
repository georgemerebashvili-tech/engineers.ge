import {expect, test} from '@playwright/test';

/**
 * Wall-editor core Phase B/C/D smoke coverage.
 *
 * The wall-editor is a heavy static HTML iframe embedded by the Next shell at
 * /calc/wall-editor. We drive the iframe directly via its .html asset to skip
 * the project gate and shell chrome, then assert the editor exposes the
 * correct runtime surface (fire-mode, physics hooks, i18n bridge).
 */

test.describe('wall-editor runtime surface', () => {
  test('static iframe exposes physics + fire + i18n globals', async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/calc/wall-editor.html', {waitUntil: 'domcontentloaded'});

    // Editor DOM bootstrapped (canvas + toolbar + status bar)
    await expect(page.locator('#svg')).toBeVisible({timeout: 10_000});

    // Fire-mode overlay layer is present in the DOM (Claude Phase D MVP)
    await expect(page.locator('#g-sim-overlay')).toHaveCount(1);

    // Physics engine wired + accessible on window (Task 028)
    const physicsReady = await page.evaluate(() => {
      const p = (window as unknown as {Physics?: Record<string, unknown>}).Physics;
      return (
        !!p &&
        typeof p.plumeMassFlow === 'function' &&
        typeof p.smokeLayerHeight === 'function' &&
        typeof p.doorOpeningForce === 'function'
      );
    });
    expect(physicsReady).toBe(true);

    // i18n bridge is loaded
    const i18nReady = await page.evaluate(
      () => typeof (window as unknown as {engCalcI18n?: unknown}).engCalcI18n === 'object'
    );
    expect(i18nReady).toBe(true);

    // No uncaught pageerrors
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('React shell wraps iframe + propagates ?lang=', async ({page}) => {
    await page.goto('/calc/wall-editor?project=smoke-placeholder');
    // Iframe src must include lang query param
    const iframeSrc = await page.locator('iframe').first().getAttribute('src');
    expect(iframeSrc).toMatch(/^\/calc\/wall-editor\.html\?/);
    expect(iframeSrc).toContain('lang=');
  });
});

test.describe('calc i18n propagation', () => {
  test('hvac.html switches title when ?lang=en', async ({page}) => {
    await page.goto('/calc/hvac.html?lang=en', {waitUntil: 'networkidle'});
    // hvac.html registers an English bundle; engCalcI18n.apply rewrites <title>
    await expect(page).toHaveTitle(/Ductwork Schema|Schema/i);
  });

  test('stair-pressurization switches header to English', async ({page}) => {
    await page.goto('/calc/stair-pressurization.html?lang=en', {
      waitUntil: 'networkidle'
    });
    await expect(page.locator('.sp-header h1')).toHaveText(
      /Stairwell Pressurization Simulator/
    );
  });
});

test.describe('fire-report API', () => {
  test('rejects empty payload (400)', async ({request}) => {
    const res = await request.post('/api/fire-report', {data: {}});
    expect(res.status()).toBe(400);
  });
});
