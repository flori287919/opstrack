import { test, expect } from '@playwright/test'
import { hasRealTestEnv, getTestEnv } from './helpers/test-env'
import { cleanupTestUser } from './helpers/test-supabase'

test.describe('Full flow: signup → approve → login → dashboard', () => {
  test.skip(
    !hasRealTestEnv(),
    'Skipped: requires TEST_SUPABASE_* env vars and a configured test Supabase project. See docs/e2e-setup-sq.md.',
  )

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const newUserEmail = `e2e-${stamp}@example.com`
  const newUserPassword = 'TestPassword123!'
  const orgName = `E2E Org ${stamp}`

  test.afterAll(async () => {
    await cleanupTestUser(newUserEmail)
  })

  test('user signs up, super-admin approves, user reaches dashboard', async ({ page }) => {
    const env = getTestEnv()

    // ── 1. Sign up as a brand-new user ──────────────────────────────────
    await page.goto('/sq/signup')
    await page.getByLabel(/Emri i organizatës/i).fill(orgName)
    await page.getByLabel(/^Email$/i).fill(newUserEmail)
    await page.getByLabel(/^Fjalëkalimi$/i).first().fill(newUserPassword)
    await page.getByLabel(/Konfirmoni fjalëkalimin/i).fill(newUserPassword)
    await page.getByRole('button', { name: /Krijo llogari/i }).click()

    await expect(page).toHaveURL(/\/pending(\?|$)/, { timeout: 15_000 })
    await expect(page.locator(`text=${newUserEmail}`)).toBeVisible()

    // ── 2. Log out the pending user ─────────────────────────────────────
    await page.getByRole('button', { name: /^Dil$/i }).click()
    await expect(page).toHaveURL(/\/login(\?|$)/)

    // ── 3. Log in as the pre-seeded super-admin ─────────────────────────
    await page.getByLabel(/^Email$/i).fill(env.superAdminEmail)
    await page.getByLabel(/^Fjalëkalimi$/i).fill(env.superAdminPassword)
    await page.getByRole('button', { name: /^Hyr$/ }).click()
    await expect(page).toHaveURL(/\/dashboard(\?|$)/, { timeout: 15_000 })

    // ── 4. Approve the pending signup ───────────────────────────────────
    await page.goto('/sq/admin')
    const row = page.locator('tr', { hasText: newUserEmail })
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.getByRole('button', { name: /Aprovo/i }).click()
    await expect(page.locator('tr', { hasText: newUserEmail })).toHaveCount(0, {
      timeout: 10_000,
    })

    // ── 5. Log out the super-admin ──────────────────────────────────────
    await page.getByRole('button', { name: /^Dil$/i }).click()
    await expect(page).toHaveURL(/\/login(\?|$)/)

    // ── 6. Log in as the now-approved new user ──────────────────────────
    await page.getByLabel(/^Email$/i).fill(newUserEmail)
    await page.getByLabel(/^Fjalëkalimi$/i).fill(newUserPassword)
    await page.getByRole('button', { name: /^Hyr$/ }).click()

    // ── 7. Reaches the real dashboard, not /pending ─────────────────────
    await expect(page).toHaveURL(/\/dashboard(\?|$)$/, { timeout: 15_000 })
    await expect(page.locator(`text=${orgName}`).first()).toBeVisible()
  })
})
