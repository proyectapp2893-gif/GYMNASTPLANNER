export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'Gymnastplanner@gmail.com').trim().toLowerCase()

export function isSuperAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL
}
