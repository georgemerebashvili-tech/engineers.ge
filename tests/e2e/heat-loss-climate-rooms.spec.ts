import {expect, test} from '@playwright/test';

/**
 * Verifies the two UX nice-to-haves on /calc/heat-loss.html:
 *  1. Climate per city — picks Tbilisi/Kutaisi/Batumi/… → auto-fills Te_w, Tg, Te_s
 *  2. Room setpoint library — per-room Ti override via preset dropdown
 */

const URL = 'http://localhost:3000/calc/heat-loss.html';

test.describe('Heat loss · climate + room setpoint nice-to-haves', () => {
  test('city preset auto-fills Te_w / Tg / Te_s', async ({page}) => {
    await page.goto(URL);
    await page.waitForTimeout(200);

    // Pick Akhaltsikhe (Te=-16, Tg=-8, Te_s=33)
    await page.selectOption('#city_preset', 'akhaltsikhe');
    await page.waitForTimeout(100);
    expect(await page.inputValue('#te_w')).toBe('-16');
    expect(await page.inputValue('#tg')).toBe('-8');
    expect(await page.inputValue('#te_s')).toBe('33');

    // Switch to Batumi (Te=0, Tg=2, Te_s=32)
    await page.selectOption('#city_preset', 'batumi');
    await page.waitForTimeout(100);
    expect(await page.inputValue('#te_w')).toBe('0');
    expect(await page.inputValue('#tg')).toBe('2');

    // Manual edit of Te → flips preset back to 'custom'
    await page.fill('#te_w', '-3');
    await page.locator('#te_w').dispatchEvent('input');
    await page.waitForTimeout(100);
    expect(await page.inputValue('#city_preset')).toBe('custom');

    // Screenshot params panel with city chip
    await page.selectOption('#city_preset', 'mestia');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const pp = document.getElementById('pp');
      if (pp) (pp as HTMLElement).style.display = 'flex';
    });
    await page.locator('#pp').screenshot({
      path: 'tests/e2e/screenshots/climate-city-mestia.png',
    });
  });

  test('room preset sets per-room Ti override', async ({page}) => {
    await page.goto(URL);
    await page.waitForTimeout(200);

    // Seed a room
    await page.addScriptTag({
      content: `
        rooms.length = 0;
        CTYPES_MANUAL.length = 0;
        CTYPES_MANUAL.push({id:'mx_w', name:'Wall', u:1.0, gnd:false, sol:false, orient:''});
        syncThermalToCtypes();
        rooms.push({
          id:1, name:'Test room',
          rows:[{ti:'mx_w', l:10, h:3, q:1, f:1, solId:'S', solK1:0, intName:'', intN:0, intW:0, intK2:1, litWm:0, litK:1}],
          q_supply:0,
        });
        RC = 1;
        document.getElementById('ti_w').value = '22';
        document.getElementById('te_w').value = '-15';
        document.getElementById('f_tb').value = '1.05';
        document.getElementById('f_g').value = '1';
        document.getElementById('f_rh').value = '0';
        render(); recalc();
      `,
    });
    await page.waitForTimeout(200);

    // Default (global Ti=22) — Qh = 1 × 30 × 37 × 1 × 1.05 = 1165.5 W
    await page.addScriptTag({content: `window._rt=(typeof roomTotals!=='undefined'&&roomTotals[1])||{};`});
    const base = await page.evaluate(() => (window as any)._rt?.H);
    expect(base).toBeCloseTo(1.1655, 2);

    // Apply 'bath' preset (Ti=24) via _onRoomPreset
    await page.addScriptTag({content: `_onRoomPreset(1, 'bath');`});
    await page.waitForTimeout(200);
    await page.addScriptTag({content: `window._rt=roomTotals[1]||{};`});
    const afterBath = await page.evaluate(() => (window as any)._rt?.H);
    // Qh = 1 × 30 × (24-(-15)=39) × 1 × 1.05 = 1228.5 W
    expect(afterBath).toBeCloseTo(1.2285, 2);

    // Apply 'stairwell' (Ti=15)
    await page.addScriptTag({content: `_onRoomPreset(1, 'stairwell');`});
    await page.waitForTimeout(200);
    await page.addScriptTag({content: `window._rt=roomTotals[1]||{};`});
    const afterStair = await page.evaluate(() => (window as any)._rt?.H);
    // Qh = 1 × 30 × (15-(-15)=30) × 1 × 1.05 = 945 W
    expect(afterStair).toBeCloseTo(0.945, 2);

    // Screenshot via full page — the #rooms container is inside multiple tabs; easier to just
    // crop after switching to Tab 1 is default on page load.
    await page.evaluate(() => {
      const b = document.getElementById('draftBanner'); if (b) b.classList.remove('on');
    });
    await page.waitForTimeout(200);
    // Wait for the room card to actually render (render() is async-ish after _onRoomPreset)
    await page.waitForSelector('#rm_1', {state: 'attached'});
    await page.evaluate(() => {
      // Force visibility: ensure the tab that contains #rooms is active, collapse draft banner
      const tab1 = document.getElementById('tab1');
      if (tab1) tab1.classList.add('active');
      (document.getElementById('draftBanner') as HTMLElement)?.classList.remove('on');
      document.getElementById('rm_1')?.scrollIntoView({block:'center', inline:'start'});
    });
    await page.waitForTimeout(400);
    const roomBox = await page.locator('#rm_1').boundingBox();
    if (roomBox) {
      await page.screenshot({
        path: 'tests/e2e/screenshots/room-preset-stairwell.png',
        clip: {x: Math.max(0, roomBox.x-10), y: Math.max(0, roomBox.y-10), width: Math.min(1400, roomBox.width+20), height: Math.min(120, roomBox.height+10)},
      });
    } else {
      await page.screenshot({path: 'tests/e2e/screenshots/room-preset-stairwell.png', fullPage: true});
    }

    // Back to 'custom' → reverts to global Ti=22
    await page.addScriptTag({content: `_onRoomPreset(1, 'custom');`});
    await page.waitForTimeout(200);
    await page.addScriptTag({content: `window._rt=roomTotals[1]||{};`});
    const afterCustom = await page.evaluate(() => (window as any)._rt?.H);
    expect(afterCustom).toBeCloseTo(1.1655, 2);
  });
});
