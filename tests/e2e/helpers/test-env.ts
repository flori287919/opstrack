import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_TEST_PATH = resolve(process.cwd(), '.env.test')

function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

let loaded = false
export function loadTestEnv(): void {
  if (loaded) return
  loaded = true
  if (!existsSync(ENV_TEST_PATH)) return
  const parsed = parseDotEnv(readFileSync(ENV_TEST_PATH, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const REQUIRED_VARS = [
  'TEST_SUPABASE_URL',
  'TEST_SUPABASE_ANON_KEY',
  'TEST_SUPABASE_SERVICE_ROLE_KEY',
  'TEST_SUPER_ADMIN_EMAIL',
  'TEST_SUPER_ADMIN_PASSWORD',
] as const

export function hasRealTestEnv(): boolean {
  loadTestEnv()
  return REQUIRED_VARS.every((k) => !!process.env[k])
}

export type TestEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  superAdminEmail: string
  superAdminPassword: string
}

export function getTestEnv(): TestEnv {
  loadTestEnv()
  const missing = REQUIRED_VARS.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`Missing required test env vars: ${missing.join(', ')}`)
  }
  return {
    supabaseUrl: process.env.TEST_SUPABASE_URL!,
    supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
    superAdminEmail: process.env.TEST_SUPER_ADMIN_EMAIL!,
    superAdminPassword: process.env.TEST_SUPER_ADMIN_PASSWORD!,
  }
}
