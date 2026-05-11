import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test.use({ locale: 'sq-AL' })

  test('renders heading and CTA in shqip by default', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/sq$/)
    await expect(page.getByRole('heading', { name: /Business Operations Management Tool/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Hyr$/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Regjistrohu|Fillo falas/ }).first()).toBeVisible()
  })

  test('switches to English via /en route', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('link', { name: /^Sign in$/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign up|Start free/ }).first()).toBeVisible()
  })
})
