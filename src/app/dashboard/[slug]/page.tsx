'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [isValidating, setIsValidating] = useState(true)

  const slug = params.slug as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/sign-in')
      return
    }

    const userSlug = session.user.slug
    if (!userSlug) {
      router.push('/auth/sign-in')
      return
    }

    if (slug !== userSlug) {
      router.push(`/dashboard/${userSlug}`)
      return
    }

    setIsValidating(false)

    if (!session.user.hasSubscription) {
      router.push(`/billing/${userSlug}`)
    }
  }, [session, status, slug, router])

  if (status === 'loading' || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <Navbar />
}
