'use client'

import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useClubStore } from '../../../store/useClubStore'

export default function ClubSessionProvider({ children }: { children: React.ReactNode }) {
  const { clubId, setClubData, clearClubData } = useClubStore()

  useEffect(() => {
    let active = true

    const restoreClub = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active || !user || clubId) return

      const { data: profile } = await supabase
        .from('perfiles')
        .select('club_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!active || !profile?.club_id) return

      const { data: club } = await supabase
        .from('clubs')
        .select('nombre,logo_url')
        .eq('id', profile.club_id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!active || !club) return
      setClubData({
        clubId: profile.club_id,
        nombreClub: club.nombre,
        logoUrl: club.logo_url || '/default-club-logo.png',
      })
    }

    void restoreClub()

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearClubData()
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void restoreClub()
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [clearClubData, clubId, setClubData])

  return children
}
