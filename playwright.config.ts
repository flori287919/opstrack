import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv, hasRealTestEnv } from './tests/e2e/helpers/test-env'

loadTestEnv()

const PORT = process.env.PLAYWRIGHT_PORT ?? '3100'
const BASE_URL = `http://127.0.0.1:${PORT}`

// When a test Supabase project is configured, point the dev server at it
// by translating TEST_* vars into the names the app actually reads.
// Otherwise leave webServer.env undefined so the dev server falls back to
// .env.local (local dev) or the parent process env (CI).
const webServerEnv: Record<string, string> | undefined = hasRealTestEnv()
  ? {
      NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
      SUPER_ADMIN_EMAILS: process.env.TEST_SUPER_ADMIN_EMAIL!,
      NEXT_PUBLIC_APP_URL: BASE_URL,
    }
  : undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    ...(webServerEnv ? { env: webServerEnv } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
