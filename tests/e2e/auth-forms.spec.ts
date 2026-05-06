import { test, expect } from '@playwright/test'

test.describe('Login form', () => {
  test('renders email and password fields', async ({ page }) => {
    await page.goto('/sq/login')
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Fjalëkalimi/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Hyr$/ })).toBeVisible()
  })

  test('exposes a forgot-password link', async ({ page }) => {
    await page.goto('/sq/login')
    const link = page.getByRole('link', { name: /Harruat fjalëkalimin/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('exposes a sign-up link', async ({ page }) => {
    await page.goto('/sq/login')
    await page.getByRole('link', { name: /Regjistrohu/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })
})

test.describe('Signup form', () => {
  test('renders all required fields', async ({ page }) => {
    await page.goto('/sq/signup')
    await expect(page.getByLabel(/Emri i organizatës/i)).toBeVisible()
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/^Fjalëkalimi$/i).first()).toBeVisible()
    await expect(page.getByLabel(/Konfirmoni fjalëkalimin/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Krijo llogari/i })).toBeVisible()
  })

  test('rejects mismatched passwords client-side', async ({ page }) => {
    await page.goto('/sq/signup')
    await page.getByLabel(/Emri i organizatës/i).fill('Test Org')
    await page.getByLabel(/Email/i).fill('test@example.com')
    await page.getByLabel(/^Fjalëkalimi$/i).first().fill('LongEnough123')
    await page.getByLabel(/Konfirmoni fjalëkalimin/i).fill('Different123')
    await page.getByRole('button', { name: /Krijo llogari/i }).click()
    // Stays on /signup with an error banner
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.locator('text=/nuk përputhen/i')).toBeVisible()
  })
})

test.describe('Forgot-password form', () => {
  test('renders and accepts an email', async ({ page }) => {
    await page.goto('/sq/forgot-password')
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Dërgo linkun/i })).toBeVisible()
  })
})
