import {expect, test, type Page} from '@playwright/test';

/**
 * /georgemerebashvili — the owner's portfolio page (ported from his ChatGPT design), and the
 * storyabout.me badge on the home page that opens it.
 *
 * The page shows no placeholder (owner's word, 27.11.2026): only years with real content are on the
 * strip, the empty gallery and awards sections are not rendered, and the logos replace the demo photos.
 *
 * Note: a fresh browser context also shows the site's cookie banner, which is itself a
 * role="dialog" (components/cookie-consent.tsx) that sits AFTER the page in DOM and tab order. So
 * the portfolio dialog is always looked up by its name, never as a bare `getByRole('dialog')`, and
 * the focus checks name the control that must hold focus rather than "somewhere inside a dialog".
 */

const PAGE = '/georgemerebashvili';

/**
 * Every year the strip offers, with the story title it must show: a milestone year's title is its
 * label(s), in the page language; the two written years are Georgian-only in the owner's design.
 */
const YEARS: ReadonlyArray<{year: number; ka: string; en: string}> = [
  {year: 1987, ka: 'დაბადება', en: 'Birth'},
  {year: 1992, ka: 'სკოლა', en: 'School'},
  {year: 2005, ka: 'უნივერსიტეტი · სამუშაო / მეწარმეობა', en: 'University · Work / entrepreneurship'},
  {year: 2008, ka: 'მაგისტრატურა', en: "Master's degree"},
  {year: 2018, ka: 'კომპანიის დაარსება', en: 'კომპანიის დაარსება'},
  {year: 2023, ka: 'Sazeo-ს MVP საქართველოში', en: 'Sazeo-ს MVP საქართველოში'}
];

/** The placeholder wording of the owner's design, in both languages. */
const PLACEHOLDERS = /demo|შესავსებია|სადემონსტრაციო|დასამატებელია|to be completed|will be added|are pending/i;

/** A year button of the strip (milestone years carry an icon whose label is part of the button's name). */
const yearButton = (page: Page, year: number) =>
  page.locator('#years').getByRole('button', {name: new RegExp(`^${year}`)});

test.describe('portfolio page', () => {
  test('answers 200 and shows the h1', async ({page}) => {
    const response = await page.goto(PAGE);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1, name: /გიორგი\s*მერებაშვილი/})).toBeVisible();
    await expect(page).toHaveTitle('გიორგი მერებაშვილი | პორტფოლიო');
  });

  test('the strip offers exactly the years that have content', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.getByTestId('story-title')).toBeVisible();
    const years = (await page.locator('#years button').allTextContents()).map((text) => text.trim());
    expect(years).toEqual(['1987', '1992', '2005', '2008', '2018', '2023']);
    // 2018 is the opening selection
    await expect(yearButton(page, 2018)).toHaveAttribute('aria-pressed', 'true');
  });

  test('picking a year shows that year\'s story', async ({page}) => {
    await page.goto(PAGE);
    const title = page.getByTestId('story-title');
    const card = page.locator('#storyCard');
    await expect(card).toBeVisible();
    await expect(title).toHaveText('კომპანიის დაარსება');

    for (const {year, ka} of YEARS) {
      await yearButton(page, year).click();
      await expect(yearButton(page, year)).toHaveAttribute('aria-pressed', 'true');
      await expect(title).toHaveText(ka);
      await expect(title).toBeVisible();
      await expect(card.locator('strong').first()).toHaveText(String(year));
    }

    // the strip is 1987 1992 2005 2008 2018 2023: "next" from 2023 stays, "previous" goes back to 2018
    await page.getByRole('button', {name: 'წინა წელი'}).click();
    await expect(yearButton(page, 2018)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', {name: 'შემდეგი წელი'}).click();
    await expect(yearButton(page, 2023)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', {name: 'შემდეგი წელი'}).click();
    await expect(yearButton(page, 2023)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a written year shows its kicker, text and focus areas', async ({page}) => {
    await page.goto(PAGE);
    const card = page.locator('#storyCard');
    await expect(card.getByTestId('story-title')).toHaveText('კომპანიის დაარსება');
    await expect(card).toContainText('2018 / SAZEO');
    await expect(card.locator('p')).toContainText('(ს/კ 405285926)');
    await expect(card.locator('p')).toContainText('DMT → Sazero → Sazeo');
    await expect(card.getByRole('heading', {level: 4})).toHaveText('ამ წლის მიმართულებები');
    await expect(card.locator('button')).toHaveText(['კომპანია', 'ბრენდის განვითარება']);

    await yearButton(page, 2023).click();
    await expect(card).toContainText('2023 / SAZEO');
    await expect(card.locator('button')).toHaveText(['პროგრამული პლატფორმა', 'BMS / IoT']);

    // a focus area opens the dialog (kicker = the card's kicker)
    await card.getByRole('button', {name: /BMS \/ IoT/}).click();
    const dialog = page.getByRole('dialog', {name: 'BMS / IoT'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('2023 / SAZEO');
    await expect(dialog).toContainText('MVP საქართველოში — 2023 წელი.');
    // no photos for this focus area: no photo area at all, and no "photos will be added" stand-in
    await expect(dialog.locator('img')).toHaveCount(0);
    await expect(dialog.locator('[class*="modalGrid"]')).toHaveCount(0);
    expect(await dialog.innerText()).not.toMatch(PLACEHOLDERS);
  });

  test('a milestone year shows its label and nothing else', async ({page}) => {
    await page.goto(PAGE);
    const card = page.locator('#storyCard');
    await yearButton(page, 2005).click();
    await expect(card.getByTestId('story-title')).toHaveText('უნივერსიტეტი · სამუშაო / მეწარმეობა');
    await expect(card.locator('strong').first()).toHaveText('2005');
    // no kicker tag, no text, no focus-area panel
    await expect(card.locator('p')).toHaveCount(0);
    await expect(card.locator('button')).toHaveCount(0);
    await expect(card.getByRole('heading', {level: 4})).toHaveCount(0);
    await expect(card).not.toContainText('SAZEO');
  });

  test('milestone labels follow the page language', async ({page}) => {
    await page.goto(PAGE);
    await page.getByRole('button', {name: 'EN', exact: true}).click();
    const title = page.getByTestId('story-title');
    for (const {year, en} of YEARS.filter(({year}) => year < 2018)) {
      await yearButton(page, year).click();
      await expect(title).toHaveText(en);
    }
    // the strip's milestone icons carry the English label too
    await expect(page.locator('#years').getByRole('img', {name: 'Work / entrepreneurship'})).toHaveCount(1);
  });

  test('no placeholder text on the page, in Georgian or English', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.getByTestId('story-title')).toBeVisible();
    // every year's card, then the whole page
    for (const {year} of YEARS) {
      await yearButton(page, year).click();
      expect(await page.locator('#storyCard').innerText()).not.toMatch(PLACEHOLDERS);
    }
    const georgian = await page.evaluate(() => document.body.innerText);
    expect(georgian).not.toMatch(PLACEHOLDERS);
    expect(georgian).toContain('© 2026 გიორგი მერებაშვილი');

    await page.getByRole('button', {name: 'EN', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Timeline'})).toBeVisible();
    for (const {year} of YEARS) {
      await yearButton(page, year).click();
      expect(await page.locator('#storyCard').innerText()).not.toMatch(PLACEHOLDERS);
    }
    const english = await page.evaluate(() => document.body.innerText);
    expect(english).not.toMatch(PLACEHOLDERS);
    expect(english).toContain('© 2026 Giorgi Merebashvili');
  });

  test('gallery and awards have no section and no nav link while they hold nothing', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.locator('#gallery')).toHaveCount(0);
    await expect(page.locator('#awards')).toHaveCount(0);
    const nav = page.getByRole('navigation', {name: 'მთავარი მენიუ'});
    await expect(nav.getByRole('link')).toHaveText(['მთავარი', 'თაიმლაინი', 'მიმართულებები', 'Sazeo', 'კონტაქტი']);
    await expect(page.locator('a[href="#gallery"], a[href="#awards"]')).toHaveCount(0);

    await page.getByRole('button', {name: 'EN', exact: true}).click();
    await expect(page.getByRole('navigation', {name: 'Main menu'}).getByRole('link')).toHaveText([
      'Home',
      'Timeline',
      'Expertise',
      'Sazeo',
      'Contact'
    ]);
  });

  test('contact shows the e-mail and nothing placeholder', async ({page}) => {
    await page.goto(PAGE);
    const contact = page.locator('#contact');
    await expect(contact.getByRole('link', {name: 'ceo@sazeo.io'})).toHaveAttribute('href', 'mailto:ceo@sazeo.io');
    await expect(contact.locator('p')).toHaveCount(0);
  });

  test('every company logo loads and has an alt text', async ({page}) => {
    await page.goto(PAGE);
    const logos = page.getByRole('group', {name: 'კომპანიები'}).locator('img');
    await expect(logos).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const logo = logos.nth(index);
      await logo.scrollIntoViewIfNeeded();
      await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(logo).toHaveAttribute('alt', /\S/);
      await expect(logo).toHaveAttribute('alt', /ლოგო$/);
    }
    // no demo photo is left behind
    expect(await logos.evaluateAll((images) => images.map((img) => (img as HTMLImageElement).src))).toEqual([
      expect.stringContaining('/georgemerebashvili/logos/kaya.webp'),
      expect.stringContaining('/georgemerebashvili/logos/sazeo.webp'),
      expect.stringContaining('/georgemerebashvili/logos/kaya.webp')
    ]);
  });

  test('the Sazeo section shows the Sazeo mark', async ({page}) => {
    await page.goto(PAGE);
    const mark = page.locator('#sazeo img');
    await expect(mark).toBeVisible(); // 1440px wide: above the 1250px breakpoint that hides it
    await mark.scrollIntoViewIfNeeded();
    await expect.poll(() => mark.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(mark).toHaveAttribute('alt', 'Sazeo ლოგო');
  });

  test('starts in English when the site language cookie is "en"', async ({page, context, baseURL}) => {
    // `lang` is the site's own locale cookie (i18n/routing.ts), written by the nav's language switch
    await context.addCookies([{name: 'lang', value: 'en', url: baseURL ?? 'http://localhost:3001'}]);
    await page.goto(PAGE);
    await expect(page.getByRole('link', {name: 'Timeline'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'EN', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the EN toggle switches the page language', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.getByRole('link', {name: 'თაიმლაინი'})).toBeVisible();

    await page.getByRole('button', {name: 'EN', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Timeline'})).toBeVisible();
    await expect(page.getByRole('heading', {level: 1})).toHaveText(/Giorgi\s*Merebashvili/);
    await expect(page.getByRole('button', {name: 'EN', exact: true})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('button', {name: 'ქარ', exact: true}).click();
    await expect(page.getByRole('link', {name: 'თაიმლაინი'})).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  });

  test('the centre expertise card opens the dialog; Escape closes it and returns focus', async ({page}) => {
    await page.goto(PAGE);
    const card = page.getByTestId('expertise-centre-card').first();
    await card.click();

    // the portfolio dialog, by its name (the h2): the cookie banner is a dialog too
    const dialog = page.getByRole('dialog', {name: 'პროექტირება'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', {name: 'პროექტირება'})).toBeVisible();
    // the expertise cards carry no photos: no photo area, no "photos will be added" stand-in
    await expect(dialog.locator('img')).toHaveCount(0);
    expect(await dialog.innerText()).not.toMatch(PLACEHOLDERS);

    // the dialog paints above the cookie banner: the bottom edge of the screen is not the banner
    expect(
      await page.evaluate(
        () => !!document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 8)?.closest('[aria-label="Cookie consent"]')
      )
    ).toBe(false);

    // focus moves into the dialog and neither Tab nor Shift+Tab can leave it: its only control is
    // the close button, so every press must land on it (without the trap, Tab goes on to the
    // cookie banner and Shift+Tab back into the page)
    const close = dialog.getByRole('button', {name: 'დახურვა'});
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(card).toBeFocused();
  });

  test('a side expertise card re-centres its row and keeps keyboard focus', async ({page}) => {
    await page.goto(PAGE);
    const row = page.locator('section[aria-label="პროექტირება"]').first();
    const centre = row.getByTestId('expertise-centre-card');
    await expect(centre).toContainText('პროექტირება');

    // first match in DOM order is the visible slide's side card
    await row.getByRole('button', {name: /^წარმოება/}).first().click();
    await expect(centre).toContainText('წარმოება');
    await expect(centre).toBeFocused();
  });

  test('the row arrows move the carousel', async ({page}) => {
    await page.goto(PAGE);
    const row = page.locator('section[aria-label="პროექტირება"]').first();
    const centre = row.getByTestId('expertise-centre-card');
    await row.getByRole('button', {name: 'შემდეგი სლაიდი'}).click();
    await expect(centre).toContainText('წარმოება');
    await row.getByRole('button', {name: 'წინა სლაიდი'}).click();
    await expect(centre).toContainText('პროექტირება');
  });

  test('the Expertise nav link has a target', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.locator('#expertise')).toHaveCount(1);
    await page.getByRole('link', {name: 'მიმართულებები'}).click();
    await expect(page).toHaveURL(/#expertise$/);
  });
});

test.describe('portfolio page on a phone', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('the page does not scroll sideways and the story card sits inside the screen', async ({page}) => {
    await page.goto(PAGE);
    await expect(page.locator('#storyCard')).toBeVisible();
    for (const {year} of YEARS) {
      await yearButton(page, year).click();
      await expect(page.getByTestId('story-title')).toBeVisible();
      const fit = await page.evaluate(() => {
        const root = document.documentElement;
        const card = document.getElementById('storyCard')!.getBoundingClientRect();
        return {scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, left: card.left, right: card.right};
      });
      expect(fit.scrollWidth, `year ${year}`).toBeLessThanOrEqual(fit.clientWidth + 1);
      expect(fit.left, `year ${year}`).toBeGreaterThanOrEqual(0);
      expect(fit.right, `year ${year}`).toBeLessThanOrEqual(fit.clientWidth + 1);
    }
  });

  test('the company logos fit their cards', async ({page}) => {
    await page.goto(PAGE);
    const logos = page.getByRole('group', {name: 'კომპანიები'}).locator('img');
    await expect(logos).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const logo = logos.nth(index);
      await logo.scrollIntoViewIfNeeded();
      await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const inside = await logo.evaluate((img) => {
        const tile = img.closest('div')!.getBoundingClientRect();
        const box = img.getBoundingClientRect();
        return box.left >= tile.left - 1 && box.right <= tile.right + 1 && box.top >= tile.top - 1 && box.bottom <= tile.bottom + 1;
      });
      expect(inside, `logo ${index}`).toBe(true);
    }
  });
});

test.describe('home page badge', () => {
  test('the storyabout.me badge links to the portfolio', async ({page}) => {
    await page.goto('/');
    const badge = page.locator(`a[href="${PAGE}"]`).first();
    await expect(badge).toBeAttached();
    await expect(badge).toContainText('storyabout.me');
  });
});
