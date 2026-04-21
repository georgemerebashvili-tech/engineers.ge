import {expect, test} from '@playwright/test';

/**
 * Verifies 3 pro-level formula improvements on /calc/heat-loss.html:
 *  B · Reheat ΦRH supplement (EN 12831 §6.5) — W/m² × A_floor added to heating load.
 *  C · EN 12831 ground factor f_g = fg1·fg2·Gw — multiplier on ground-contact heat loss.
 *  D · Per-ctype thermal-bridge supplement ΔUtb — W/m²K added to U, skips blanket f_tb.
 *
 * Setup uses CTYPES_MANUAL (manual construction types) so we have full control
 * over U / gnd / dUtb — the default-dropdown ctypes live in getAllCtypes() and
 * manual ctypes are included there.
 */

const URL = 'http://localhost:3000/calc/heat-loss.html';

async function seedSimpleRoom(page) {
  await page.goto(URL);
  await page.addScriptTag({
    content: `
      (function(){
        var b = document.getElementById('draftBanner'); if(b) b.classList.remove('on');
        // Reset and install 2 manual ctypes with known properties.
        CTYPES_MANUAL.length = 0;
        CTYPES_MANUAL.push({id:'mx_wall', name:'Test wall', u:1.1, gnd:false, sol:false, orient:''});
        CTYPES_MANUAL.push({id:'mx_floor', name:'Test floor', u:0.5, gnd:true,  sol:false, orient:''});
        syncThermalToCtypes();
        // Install a single room with 2 rows.
        rooms.length = 0;
        rooms.push({
          id:1, name:'Test room', q_supply:0,
          rows:[
            // Wall: U=1.1, 10×3 = 30 m², f=1 — external (gnd=false)
            {ti:'mx_wall',  l:10, h:3, q:1, f:1, solId:'S', solK1:0, intName:'', intN:0, intW:0, intK2:1, litWm:0, litK:1},
            // Floor: U=0.5, 10×4 = 40 m², f=1 — ground-contact (gnd=true)
            {ti:'mx_floor', l:10, h:4, q:1, f:1, solId:'S', solK1:0, intName:'', intN:0, intW:0, intK2:1, litWm:0, litK:1},
          ],
        });
        RC = 1;
        // Reset parameters to known defaults for deterministic math
        document.getElementById('ti_w').value = '22';
        document.getElementById('te_w').value = '-15';
        document.getElementById('tg').value   = '-5';
        document.getElementById('f_tb').value = '1.05';
        document.getElementById('f_g').value  = '1.0';
        document.getElementById('f_rh').value = '0';
        document.getElementById('rh_mode').value = '0';
        render(); recalc();
      })();
    `,
  });
  await page.waitForTimeout(200);
}

async function readTotals(page) {
  await page.addScriptTag({
    content: `
      window._rt  = (typeof roomTotals !== 'undefined' && roomTotals[1]) || {};
      window._grh = (typeof window._G_RH === 'number') ? window._G_RH : 0;
    `,
  });
  return page.evaluate(() => {
    const rt = (window as any)._rt || {};
    return {
      H_kW: rt.H,
      A_floor: rt.A_floor,
      Q_rh_kW: rt.Q_rh,
      G_RH_W: (window as any)._grh,
    };
  });
}

test.describe('Heat loss · pro upgrades (ΦRH + f_g + ΔUtb)', () => {
  test('B · ΦRH reheat supplement adds f_rh × A_floor to heating load', async ({page}) => {
    await seedSimpleRoom(page);
    const base = await readTotals(page);

    // Floor is detected via _isFloorCt (name contains 'ფილა' or 'იატ')
    // Our 'Test floor' has gnd=true but name doesn't match — use the ID check path.
    // Let's instead use a ground ctype name that matches the detection.
    await page.addScriptTag({
      content: `
        CTYPES_MANUAL.find(c=>c.id==='mx_floor').name='იატ. მიწაზე';
        syncThermalToCtypes();
        recalc();
      `,
    });
    await page.waitForTimeout(150);
    const base2 = await readTotals(page);
    expect(base2.A_floor).toBeCloseTo(40, 1);
    expect(base2.Q_rh_kW).toBe(0);

    // Apply long-setback preset (f_rh=18 W/m²)
    await page.selectOption('#rh_mode', '18');
    await page.waitForTimeout(150);
    const after = await readTotals(page);
    // Q_rh = 18 × 40 = 720 W = 0.72 kW
    expect(after.Q_rh_kW).toBeCloseTo(0.72, 2);
    // H should have increased by 0.72 kW
    expect(after.H_kW - base2.H_kW).toBeCloseTo(0.72, 2);

    // Manual f_rh edit flips mode → custom
    await page.fill('#f_rh', '25');
    await page.locator('#f_rh').dispatchEvent('input');
    await page.waitForTimeout(150);
    const mode = await page.inputValue('#rh_mode');
    expect(mode).toBe('custom');

    // Open params panel for screenshot
    await page.evaluate(() => {
      const pp = document.getElementById('pp');
      if (pp) (pp as HTMLElement).style.display = 'flex';
    });
    await page.locator('#pp').screenshot({
      path: 'tests/e2e/screenshots/pro-params-rh.png',
    });
  });

  test('C · f_g ground factor scales ground-contact heat loss', async ({page}) => {
    await seedSimpleRoom(page);
    const base = await readTotals(page);

    // Default (f_g=1.0) baseline: wall Qh + floor Qh
    //   wall  : 1.1 × 30 × 37 × 1 × 1.05        = 1282.05 W
    //   floor : 0.5 × 40 × (22-(-5)=27) × 1 × 1.05 × 1.0 = 567 W
    //   totalH = 1849.05 W = 1.849 kW
    expect(base.H_kW).toBeCloseTo(1.849, 2);

    // Set f_g = 0.5 (shallow slab factor)
    await page.fill('#f_g', '0.5');
    await page.locator('#f_g').dispatchEvent('input');
    await page.waitForTimeout(150);
    const after = await readTotals(page);

    // Floor Qh now: 0.5 × 40 × 27 × 1 × 1.05 × 0.5 = 283.5 W
    // totalH = 1282.05 + 283.5 = 1565.55 W = 1.5655 kW
    expect(after.H_kW).toBeCloseTo(1.5655, 2);
    // Delta should be 283.5 W = 0.2835 kW
    expect(base.H_kW - after.H_kW).toBeCloseTo(0.2835, 2);
  });

  test('D · ΔUtb per-ctype overrides blanket f_tb', async ({page}) => {
    await seedSimpleRoom(page);
    const base = await readTotals(page);

    // Set ΔUtb=0.10 on mx_wall → U_eff=1.2, f_tb skipped (=1.0)
    await page.addScriptTag({
      content: `
        CTYPES_MANUAL.find(c=>c.id==='mx_wall').dUtb = 0.10;
        syncThermalToCtypes();
        recalc();
      `,
    });
    await page.waitForTimeout(150);
    const after = await readTotals(page);

    // Wall was: 1.1 × 30 × 37 × 1 × 1.05 = 1282.05 W
    // Wall now: 1.20 × 30 × 37 × 1 × 1.00 = 1332.00 W  → delta +49.95 W
    const delta_W = (after.H_kW - base.H_kW) * 1000;
    expect(delta_W).toBeCloseTo(49.95, 0);

    // Open ctypes modal + screenshot to show new ΔUtb column
    await page.evaluate(() => (window as any).openCtypesModal?.());
    await page.waitForTimeout(300);
    await page.locator('#ctypesModal .modal').screenshot({
      path: 'tests/e2e/screenshots/pro-modal-dutb.png',
    });
  });

  test('CalcLog reflects new supplements + formula trace', async ({page}) => {
    await seedSimpleRoom(page);
    // Apply all 3 at once
    await page.addScriptTag({
      content: `
        document.getElementById('f_g').value = '0.6';
        document.getElementById('f_g').dispatchEvent(new Event('input'));
        document.getElementById('rh_mode').value = '18';
        document.getElementById('rh_mode').dispatchEvent(new Event('change'));
        CTYPES_MANUAL.find(c=>c.id==='mx_wall').dUtb = 0.08;
        CTYPES_MANUAL.find(c=>c.id==='mx_floor').name = 'იატ. მიწაზე';
        syncThermalToCtypes();
        recalc();
        openCalcLog(1);
      `,
    });
    await page.waitForTimeout(400);
    // Verify ΦRH row is in the log
    const hasRh = await page.locator('#calcLogBody').textContent();
    expect(hasRh).toContain('Reheat');
    expect(hasRh).toContain('ΔUtb');
    expect(hasRh).toContain('f_g');

    await page.locator('#calcLogModal .cl-modal, #calcLogModal').screenshot({
      path: 'tests/e2e/screenshots/pro-calclog.png',
    });
  });
});
