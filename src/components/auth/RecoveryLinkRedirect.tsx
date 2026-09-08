'use client'

import { useEffect } from 'react'

export default function RecoveryLinkRedirect() {
  useEffect(() => {
    if (window.location.pathname === '/reset-password') return

    const query = new URLSearchParams(window.location.search)
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const isRecoveryLink = query.has('code')
      || query.has('token_hash')
      || query.get('type') === 'recovery'
      || fragment.get('type') === 'recovery'
      || (fragment.has('access_token') && fragment.has('refresh_token'))

    if (isRecoveryLink) {
      window.location.replace(`/reset-password${window.location.search}${window.location.hash}`)
    }
  }, [])

  return null
}
