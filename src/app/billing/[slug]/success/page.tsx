'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { CheckCircle2, Zap, ArrowRight, Sparkles } from 'lucide-react'

function SuccessContent() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [confirmed, setConfirmed] = useState(false)
    const [countdown, setCountdown] = useState(5)
    const [attempts, setAttempts] = useState(0)

    // Poll for subscription confirmation — Inngest is async so it may take a few seconds
    // after the Polar redirect before the DB row exists and the JWT reflects it.
    useEffect(() => {
        if (confirmed) return
        if (session?.user?.hasSubscription) {
            setConfirmed(true)
            return
        }

        // Give up after 15 attempts (~30s)
        if (attempts >= 15) {
            // Let user proceed manually even without confirmed subscription
            setConfirmed(true)
            return
        }

        const timer = setTimeout(async () => {
            await update()
            setAttempts(a => a + 1)
        }, 2000)

        return () => clearTimeout(timer)
    }, [session, confirmed, update, attempts])

    // Countdown redirect to dashboard after subscription is confirmed
    useEffect(() => {
        if (!confirmed) return
        if (countdown <= 0) {
            router.push(`/dashboard/${slug}`)
            return
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [countdown, confirmed, router, slug])

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-md mx-auto px-6 text-center">
                {/* Success icon */}
                <div className="relative inline-flex mb-8">
                    <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/40">
                        <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={1.5} />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3">You&apos;re all set!</h1>
                <p className="text-white/50 mb-8 leading-relaxed">
                    Your subscription is now active. Your AI credits are ready to use.
                </p>

                {/* Credits info card */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-violet-400" />
                        <span className="text-white font-semibold">Credits activated</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                        <Sparkles className="w-4 h-4 text-fuchsia-400" />
                        <span className="text-white/50 text-sm">Ready to generate your first design</span>
                    </div>
                </div>

                {/* Status */}
                <div className="mb-6">
                    {confirmed ? (
                        <p className="text-white/40 text-sm">
                            Redirecting to your dashboard in{' '}
                            <span className="text-violet-400 font-semibold">{countdown}s</span>...
                        </p>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                            <div className="w-4 h-4 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
                            Activating your subscription...
                        </div>
                    )}
                </div>

                <button
                    id="go-to-dashboard"
                    onClick={() => router.push(`/dashboard/${slug}`)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-xl hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
                >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export default function BillingSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
