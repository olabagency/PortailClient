'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Déclenche un router.refresh() silencieux :
 *  - quand l'onglet redevient visible (retour sur la page)
 *  - toutes les 60 secondes (polling léger)
 *
 * Cela permet à l'espace client de refléter instantanément
 * toute liaison projet ↔ client faite par le prestataire.
 */
export default function ClientPortalRefresher() {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function refresh() {
      router.refresh()
    }

    // Refresh quand l'onglet redevient actif
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    // Polling toutes les 60 secondes
    intervalRef.current = setInterval(refresh, 60_000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router])

  return null
}
