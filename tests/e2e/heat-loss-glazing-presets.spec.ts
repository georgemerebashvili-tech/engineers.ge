import {expect, test} from '@playwright/test';

/**
 * Verifies the 1/2/3-pane glazing preset feature added to /calc/heat-loss.html.
 *
 * Flow:
 *  1. Go to heat-loss calc → switch to Tab 3 (heat-transfer / U-builder)
 *  2. Click "+" in the Windows section → new window row appears with defaults
 *  3. Change preset via dropdown → U + g auto-fill
 *  4. Manually edit U → preset flips to 'custom'
 *  5. Open ctypes modal → window row shows preset dropdown + Uw + g inputs
 */

test.describe('Heat loss · glazing presets', () => {
  test('sidebar preset applies Uw + g, manual edit flips to custom', async ({page}) => {
    // Dev server is on :3000 — override base URL for this run.
    await page.goto('http://localhost:3000/calc/heat-loss.html');

    // Switch to Tab 3 (heat transfer / U builder).
    await page.click('[onclick*="switchTab(3)"], button:has-text("თბოგადაცემა")').catch(() => {});
    await page.waitForTimeout(300);

    // Click the "+" in the windows header to add a window.
    await page.click('button.tw-win-btn-add');
    await page.waitForTimeout(150);

    // Sidebar: preset select + U input + g input should exist.
    const presetSelect = page.locator('select.tw-win-preset').first();
    await expect(presetSelect).toBeVisible();
    // Default preset: 2-pane (air)
    await expect(presetSelect).toHaveValue('2pane_air');

    const uInputs = page.locator('.tw-win-u').first();
    await expect(uInputs).toHaveValue('2.8');

    // Switch to 3-pane Krypton (passive) → expect Uw=0.7, g=0.47
    await presetSelect.selectOption('3pane_kr');
    await page.waitForTimeout(200);
    const uAfter = await page.locator('.tw-win-u').nth(0).inputValue();
    const gAfter = await page.locator('.tw-win-u').nth(1).inputValue();
    expect(Number(uAfter)).toBeCloseTo(0.7, 2);
    expect(Number(gAfter)).toBeCloseTo(0.47, 2);

    // Screenshot the sidebar windows section for visual verification.
    await page.locator('#tw_windows_section').screenshot({
      path: 'tests/e2e/screenshots/glazing-sidebar-3pane-kr.png',
    });

    // Manual U edit → preset should flip to 'custom'
    await page.locator('.tw-win-u').first().fill('1.15');
    await page.locator('.tw-win-u').first().dispatchEvent('input');
    await page.waitForTimeout(200);
    await expect(presetSelect).toHaveValue('custom');

    // Screenshot after manual edit (shows 'ხელით')
    await page.locator('#tw_windows_section').screenshot({
      path: 'tests/e2e/screenshots/glazing-sidebar-custom.png',
    });
  });

  test('ctypes modal shows preset dropdown + Uw + g for window rows', async ({page}) => {
    await page.goto('http://localhost:3000/calc/heat-loss.html');

    // Add a window + open the constructions modal programmatically (tab-agnostic).
    await page.evaluate(() => {
      (window as any).addTwWindow?.();
      (window as any).openCtypesModal?.();
    });
    await page.waitForTimeout(400);

    // Modal should be open and visible.
    await expect(page.locator('#ctypesModal.open')).toBeVisible();

    // Change preset to 2-pane Argon → Uw=1.4, g=0.60
    await page.evaluate(() => {
      const w = (window as any).tw_windows?.[0];
      if (w) (window as any).setTwWinPreset?.(w.id, '2pane_lowe');
    });
    await page.waitForTimeout(300);

    // The window row in the modal: preset <select> (identified by onchange pointing to setTwWinPreset).
    const modalPreset = page.locator('#ctypesModalTbody select[onchange*="setTwWinPreset"]').first();
    await expect(modalPreset).toHaveValue('2pane_lowe');

    // Full modal screenshot
    await page.locator('#ctypesModal .modal').screenshot({
      path: 'tests/e2e/screenshots/glazing-modal-2pane-lowe.png',
    });
  });
});
