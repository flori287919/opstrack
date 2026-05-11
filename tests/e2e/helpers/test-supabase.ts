import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getTestEnv, hasRealTestEnv } from './test-env'

let cached: SupabaseClient | null = null

export function adminClient(): SupabaseClient {
  if (cached) return cached
  const env = getTestEnv()
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export async function cleanupTestUser(email: string): Promise<void> {
  if (!hasRealTestEnv()) return
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return
  await admin.auth.admin.deleteUser(user.id)
}
