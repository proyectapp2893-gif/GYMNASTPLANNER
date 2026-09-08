export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'lic.kevinperalta2893@outlook.com').trim().toLowerCase()

export function isSuperAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL
}
