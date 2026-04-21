import {expect, test, type Page} from '@playwright/test';

/**
 * EN ISO 10077-1 whole-window Uw builder verification.
 *
 * Formula: Uw = (1 − f_fr)·Ug + f_fr·Uf + (1 − f_fr)·lgPerAw·ψg
 *
 * Test scenarios:
 *  - Toggle builder ON → Uw auto-computes from frame/spacer/f_fr/Ug
 *  - Switch frame (PVC → Al no-TB) → Uw rises (Uf 1.3 → 5.0)
 *  - Switch spacer (warm → aluminum) → Uw rises slightly (ψg 0.04 → 0.08)
 *  - Change preset in builder mode → only Ug updates, Uw recomputed
 */

const URL = 'http://localhost:3000/calc/heat-loss.html';

async function addWindow(page: Page) {
  await page.goto(URL);
  await page.addScriptTag({
    content: `addTwWindow();`,
  });
  await page.waitForTimeout(150);
}

async function readWin(page: Page) {
  await page.addScriptTag({
    content: `window._w0 = (typeof tw_windows !== 'undefined' && tw_windows[0]) || null;`,
  });
  return page.evaluate(() => (window as any)._w0);
}

test.describe('Heat loss · EN 10077 whole-window Uw builder', () => {
  test('builder ON → Uw = formula', async ({page}) => {
    await addWindow(page);

    // Enable builder mode
    await page.addScriptTag({content: `setTwWinBuilder('tww_1', true);`});
    await page.waitForTimeout(100);

    const w = await readWin(page);
    expect(w.builder).toBe(true);

    // Default: preset 2pane_air → Ug=3.0, PVC Uf=1.3, warm-edge ψ=0.04, f_fr=0.3, lgPerAw=3.2
    // Uw = 0.7×3.0 + 0.3×1.3 + 0.7×3.2×0.04 = 2.1 + 0.39 + 0.0896 = 2.5796
    expect(w.u).toBeCloseTo(2.58, 2);
    expect(w.Ug).toBeCloseTo(3.0, 1);
  });

  test('switch frame PVC → Al (no TB) raises Uw', async ({page}) => {
    await addWindow(page);
    await page.addScriptTag({content: `setTwWinBuilder('tww_1', true);`});
    await page.waitForTimeout(100);
    const before = (await readWin(page)).u;

    // Swap frame to Al (no thermal break, Uf=5.0)
    await page.addScriptTag({content: `setTwWinFrame('tww_1', 'al');`});
    await page.waitForTimeout(100);
    const after = (await readWin(page)).u;

    // Uw' = 0.7×3.0 + 0.3×5.0 + 0.7×3.2×0.04 = 2.1 + 1.5 + 0.0896 = 3.6896
    expect(after).toBeCloseTo(3.69, 2);
    expect(after).toBeGreaterThan(before);
  });

  test('preset change updates Ug only, Uw recomputes', async ({page}) => {
    await addWindow(page);
    await page.addScriptTag({content: `setTwWinBuilder('tww_1', true);`});
    await page.waitForTimeout(100);

    // Switch to 3-pane Krypton → Ug=0.5
    await page.addScriptTag({content: `setTwWinPreset('tww_1', '3pane_kr');`});
    await page.waitForTimeout(100);
    const w = await readWin(page);

    expect(w.preset).toBe('3pane_kr');
    expect(w.Ug).toBeCloseTo(0.5, 2);
    // Uw = 0.7×0.5 + 0.3×1.3 + 0.7×3.2×0.04 = 0.35 + 0.39 + 0.0896 = 0.8296
    expect(w.u).toBeCloseTo(0.83, 2);
  });

  test('builder OFF → preset Uw used (no auto-compute)', async ({page}) => {
    await addWindow(page);
    // Start in builder OFF (default)
    const w = await readWin(page);
    expect(w.builder).toBe(false);
    expect(w.u).toBeCloseTo(2.8, 2); // preset 2pane_air Uw

    // Switch preset — Uw should be preset whole-window (1.4), not computed
    await page.addScriptTag({content: `setTwWinPreset('tww_1', '2pane_lowe');`});
    await page.waitForTimeout(100);
    const w2 = await readWin(page);
    expect(w2.u).toBeCloseTo(1.4, 2);
  });

  test('screenshot: builder UI expanded in sidebar', async ({page}) => {
    await addWindow(page);
    await page.addScriptTag({
      content: `
        // Switch to Tab 3 (where the windows sidebar lives)
        if (typeof switchTab === 'function') switchTab(3);
        setTwWinBuilder('tww_1', true);
      `,
    });
    await page.waitForTimeout(300);
    await page.locator('#tw_windows_section').scrollIntoViewIfNeeded();
    await page.locator('#tw_windows_section').screenshot({
      path: 'tests/e2e/screenshots/en10077-builder-sidebar.png',
    });
  });

  test('screenshot: builder UI in ctypesModal', async ({page}) => {
    await addWindow(page);
    await page.addScriptTag({
      content: `
        setTwWinBuilder('tww_1', true);
        setTwWinFrame('tww_1', 'al');
        setTwWinSpacer('tww_1', 'al');
        openCtypesModal();
      `,
    });
    await page.waitForTimeout(300);
    await page.locator('#ctypesModal .modal').screenshot({
      path: 'tests/e2e/screenshots/en10077-builder-modal.png',
    });
  });
});
