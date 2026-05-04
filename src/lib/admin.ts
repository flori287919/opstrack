function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return getSuperAdminEmails().includes(email.toLowerCase())
}
