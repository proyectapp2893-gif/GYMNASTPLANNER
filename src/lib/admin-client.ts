export const SUPER_ADMIN_EMAIL_CLIENT = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'lic.kevinperalta2893@outlook.com').trim().toLowerCase()

export function isSuperAdminEmailClient(email?: string | null) {
  return email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL_CLIENT
}
