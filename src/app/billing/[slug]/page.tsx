'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckIcon } from 'lucide-react'

export default function BillingPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const params = useParams()
  const [isLoading, setIsLoading] = useState(false)
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
      router.push(`/billing/${userSlug}`)
      return
    }

    setIsValidating(false)

    // If user has subscription, redirect to dashboard
    if (session.user.hasSubscription) {
      router.push(`/dashboard/${userSlug}`)
    }
  }, [session, status, slug, router])

  const handleSubscribe = async (plan: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (response.ok) {
        // Redirect to dashboard after successful subscription
        const userSlug = session!.user.slug
        if (userSlug) {
          router.push(`/dashboard/${userSlug}`)
          router.refresh()
        }
      } else {
        throw new Error('Failed to create subscription')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to subscribe. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestActivation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/activate-test', {
        method: 'POST',
      })

      if (response.ok) {
        // Trigger session update so JWT callback re-reads from DB
        await update()
        
        // Hard navigate to dashboard so middleware picks up the new token
        const userSlug = session!.user.slug
        if (userSlug) {
          window.location.href = `/dashboard/${userSlug}`
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to activate test subscription')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Test activation error:', error)
      alert('Failed to activate test subscription')
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Select a plan to unlock all features and start creating amazing projects
        </p>

        {/* Test Activation Button */}
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            <strong>Testing Mode:</strong> Skip payment and activate a test subscription
          </p>
          <Button 
            onClick={handleTestActivation}
            disabled={isLoading}
            variant="outline"
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
          >
            {isLoading ? 'Activating...' : 'Activate Test Subscription'}
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>1 Project</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Basic Features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Community Support</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-primary">
            <CardHeader>
              <div className="mb-2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <CardTitle>Pro</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Unlimited Projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Advanced Features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Priority Support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>AI Design Assistant</span>
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleSubscribe('pro')}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Team Collaboration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Custom Integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Dedicated Support</span>
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => handleSubscribe('enterprise')}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          All plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
