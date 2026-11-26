import {expect, test} from '@playwright/test';

/**
 * /georgemerebashvili — the owner's portfolio page (ported from his ChatGPT design), and the
 * storyabout.me badge on the home page that opens it.
 *
 * Note: the design's own stylesheet hides the story card (`#storyCard{display:none!important}`), so
 * the year tests read its title with toHaveText (which does not need the element to be visible) and
 * also check the visible year button.
 */

const PAGE = '/georgemerebashvili';

test.describe('portfolio page', () => {
  test('answers 200 and shows the h1', async ({page}) => {
    const response = await page.goto(PAGE);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1, name: /გიორგი\s*მერებაშვილი/})).toBeVisible();
    await expect(page).toHaveTitle('გიორგი მერებაშვილი | პორტფოლიო');
  });

  test('picking a year changes the story title', async ({page}) => {
    await page.goto(PAGE);
    const title = page.getByTestId('story-title');
    await expect(title).toHaveText('კომპანიის დაარსება');

    await page.getByRole('button', {name: '2023', exact: true}).click();
    await expect(title).toHaveText('Sazeo-ს MVP საქართველოში');
    await expect(page.getByRole('button', {name: '2023', exact: true})).toHaveAttribute('aria-pressed', 'true');

    // 2008 has a milestone icon but no written record in the design: it used to throw.
    await page.getByRole('button', {name: /^2008/}).click();
    await expect(title).toHaveText('ისტორია შესავსებია');

    // the strip is 1987 1992 1997 2002 2005 2007 2008 2012 ...: "next" from 2008 is 2012
    await page.getByRole('button', {name: 'შემდეგი წელი'}).click();
    await expect(page.getByRole('button', {name: '2012', exact: true})).toHaveAttribute('aria-pressed', 'true');
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

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', {name: 'პროექტირება'})).toBeVisible();
    // focus moves into the dialog and Tab cannot leave it
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

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

test.describe('home page badge', () => {
  test('the storyabout.me badge links to the portfolio', async ({page}) => {
    await page.goto('/');
    const badge = page.locator(`a[href="${PAGE}"]`).first();
    await expect(badge).toBeAttached();
    await expect(badge).toContainText('storyabout.me');
  });
});
