'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

    // Verify slug matches current user
    if (slug !== userSlug) {
      // Redirect to correct slug
      router.push(`/dashboard/${userSlug}`)
      return
    }

    setIsValidating(false)

    // Redirect to billing if no subscription
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Your recent projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-muted-foreground mt-2">
              No projects yet. Create your first one!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
            <CardDescription>Available credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,000</div>
            <p className="text-sm text-muted-foreground mt-2">
              Credits available for AI features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Pro</div>
            <p className="text-sm text-muted-foreground mt-2">
              Active subscription
            </p>
            <Button 
              variant="link" 
              className="px-0 mt-2" 
              onClick={() => router.push(`/billing/${slug}`)}
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick actions to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Create Your First Project</h3>
                  <p className="text-sm text-muted-foreground">
                    Start designing with our AI-powered tools
                  </p>
                </div>
                <Button>Create Project</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Explore Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse our collection of pre-made templates
                  </p>
                </div>
                <Button variant="outline">Browse</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Watch Tutorial</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn how to make the most of Doodlea
                  </p>
                </div>
                <Button variant="outline">Watch</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
