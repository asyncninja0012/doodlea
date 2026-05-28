'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { Sparkles, Zap, Package, Settings2, CheckCircle, CreditCard } from 'lucide-react'

const FEATURES = [
    {
        icon: <Sparkles className="w-4 h-4" />,
        title: 'AI-Powered Design Generation',
        desc: 'Transform sketches into production-ready code',
    },
    {
        icon: <Package className="w-4 h-4" />,
        title: 'Premium Asset Exports',
        desc: 'High-quality exports in multiple formats',
    },
    {
        icon: <Settings2 className="w-4 h-4" />,
        title: 'Advanced Processing',
        desc: 'Run complex design operations and transformations',
    },
    {
        icon: <Zap className="w-4 h-4" />,
        title: '10 Monthly Credits',
        desc: 'Flexible usage for your design needs',
    },
    {
        icon: <CreditCard className="w-4 h-4" />,
        title: 'Simple Credit System',
        desc: 'Each credit = one AI task. Use them for code generation, asset exports, or any premium feature. Credits refresh monthly, so you always have what you need.',
        highlight: true,
    },
]

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#111113] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            </div>
        }>
            <BillingContent />
        </Suspense>
    )
}

function BillingContent() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const params = useParams()
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [isValidating, setIsValidating] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const slug = params.slug as string
    const searchParams = useSearchParams()
    // Only poll if user just returned from Polar checkout
    const fromCheckout = searchParams.get('from') === 'checkout'
    const initialLoadDone = useRef(false)
    const [pollAttempts, setPollAttempts] = useState(0)

    // Initial validation — only runs once on mount
    useEffect(() => {
        if (status === 'loading') return
        if (!session?.user) { router.push('/auth/sign-in'); return }
        const userSlug = session.user.slug
        if (!userSlug) { router.push('/auth/sign-in'); return }
        if (slug !== userSlug) { router.push(`/billing/${userSlug}`); return }
        initialLoadDone.current = true
        setIsValidating(false)
        if (session.user.hasSubscription) {
            router.push(`/dashboard/${userSlug}`)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]) // Only run on status change, not every session update

    // Subscription polling — only if returning from checkout and not yet subscribed
    useEffect(() => {
        if (!initialLoadDone.current) return
        if (session?.user?.hasSubscription) {
            const userSlug = session.user.slug
            if (userSlug) router.push(`/dashboard/${userSlug}`)
            return
        }
        if (!fromCheckout) return
        if (pollAttempts >= 10) return

        const timer = setTimeout(async () => {
            await update()
            setPollAttempts(a => a + 1)
        }, 2000)
        return () => clearTimeout(timer)
    }, [session, fromCheckout, pollAttempts, router, update])

    const handleSubscribe = async () => {
        setError(null)
        setIsLoading('standard')
        try {
            const response = await fetch('/api/subscriptions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: 'standard' }),
            })
            const data = await response.json()
            if (!response.ok) {
                setError(data.error ?? 'Failed to start checkout')
                return
            }
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsLoading(null)
        }
    }

    const handleTestActivation = async () => {
        setError(null)
        setIsLoading('test')
        try {
            const response = await fetch('/api/subscriptions/activate-test', { method: 'POST' })
            if (response.ok) {
                await update()
                const userSlug = session!.user.slug
                if (userSlug) window.location.href = `/dashboard/${userSlug}`
            } else {
                const data = await response.json()
                setError(data.error ?? 'Failed to activate test subscription')
            }
        } catch {
            setError('Failed to activate test subscription')
        } finally {
            setIsLoading(null)
        }
    }

    // Only show full-screen spinner on the initial load, not during polling updates
    if (isValidating) {
        return (
            <div className="min-h-screen bg-[#111113] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#111113] flex flex-col items-center justify-start px-4 py-16">

            {/* Logo icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1e1e22] border border-white/10 flex items-center justify-center mb-6 shadow-lg">
                <Sparkles className="w-6 h-6 text-white/80" />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Unlock Doodlea Premium
            </h1>
            <p className="text-white/45 text-sm text-center mb-10 max-w-xs leading-relaxed">
                Transform your design workflow with AI-powered tools and unlimited creativity
            </p>

            {/* Error */}
            {error && (
                <div className="w-full max-w-sm mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Card */}
            <div className="w-full max-w-sm bg-[#1a1a1e] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">

                {/* Most Popular badge */}
                <div className="flex justify-center pt-5 pb-1">
                    <span className="text-[11px] font-semibold text-white/70 bg-white/[0.08] border border-white/10 px-3 py-1 rounded-full tracking-wide">
                        Most Popular
                    </span>
                </div>

                <div className="px-7 pt-4 pb-7">
                    {/* Plan name */}
                    <h2 className="text-2xl font-bold text-white text-center mb-1">Standard Plan</h2>

                    {/* Price */}
                    <div className="flex items-end justify-center gap-1 mt-3 mb-1">
                        <span className="text-5xl font-bold text-white">₹1,999</span>
                        <span className="text-white/40 text-sm mb-2">/month</span>
                    </div>

                    {/* Credits tagline */}
                    <p className="text-center text-white/45 text-[13px] mb-6">
                        Get 10 credits every month to power your AI-assisted design workflow
                    </p>

                    {/* Separator */}
                    <div className="border-t border-white/[0.07] mb-6" />

                    {/* Description */}
                    <p className="text-white/45 text-[13px] text-center leading-relaxed mb-3">
                        Perfect for freelancers and creators who want reliable access to code generation, exports, and other premium features without over-committing.
                    </p>
                    <p className="text-white/45 text-[13px] text-center leading-relaxed mb-6">
                        Each credit unlocks one full AI task—whether it&apos;s generating UI code from your sketches, exporting polished assets, or running advanced processing. Simple, predictable, and flexible.
                    </p>

                    {/* What's Included */}
                    <p className="text-white text-sm font-semibold text-center mb-4">What&apos;s Included</p>

                    <div className="space-y-2 mb-8">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className={`flex items-start gap-3 p-3 rounded-xl border ${
                                    f.highlight
                                        ? 'bg-white/[0.06] border-white/[0.1]'
                                        : 'bg-white/[0.03] border-white/[0.05]'
                                }`}
                            >
                                <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center shrink-0 mt-0.5 text-white/50">
                                    {f.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white/85 text-[13px] font-semibold leading-snug">{f.title}</p>
                                        {f.highlight && (
                                            <CheckCircle className="w-3.5 h-3.5 text-white/50 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-white/40 text-xs leading-relaxed mt-0.5">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Subscribe button */}
                    <button
                        id="subscribe-standard"
                        onClick={handleSubscribe}
                        disabled={isLoading !== null}
                        className="w-full py-3 rounded-2xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading === 'standard' ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Redirecting...
                            </>
                        ) : 'Subscribe'}
                    </button>

                    {/* Sub-text */}
                    <p className="text-center text-white/30 text-[11px] mt-3">
                        Cancel anytime · No setup fees · Instant access
                    </p>
                </div>
            </div>

            {/* Footer trust badges */}
            <div className="flex items-center gap-6 mt-10 text-white/30 text-xs">
                <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Secure Payment
                </span>
                <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> 30-Day Guarantee
                </span>
                <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> 24/7 Support
                </span>
            </div>

            {/* DEV ONLY — Test activation */}
            {process.env.NODE_ENV !== 'production' && (
                <div className="mt-8 w-full max-w-sm p-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl">
                    <p className="text-amber-400/70 text-[10px] font-semibold mb-2 uppercase tracking-wider">
                        ⚠ Dev only — not visible in production
                    </p>
                    <button
                        id="activate-test-subscription"
                        onClick={handleTestActivation}
                        disabled={isLoading !== null}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                    >
                        {isLoading === 'test' ? (
                            <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Activating...
                            </>
                        ) : 'Activate Test Subscription'}
                    </button>
                </div>
            )}
        </div>
    )
}
