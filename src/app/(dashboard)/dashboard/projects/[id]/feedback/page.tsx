'use client'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
export default function FeedbackRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  useEffect(() => {
    router.replace(`/dashboard/projects/${id}/deliverables?tab=retours`)
  }, [id, router])
  return null
}
