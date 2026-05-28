import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { polar, PLAN_CONFIG, type PlanCode } from '@/lib/polar'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan } = await request.json()

    if (!plan || !(plan in PLAN_CONFIG)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be one of: standard, pro' },
        { status: 400 }
      )
    }

    const planCode = plan as PlanCode
    const planCfg = PLAN_CONFIG[planCode]

    if (!planCfg.productId) {
      return NextResponse.json(
        { error: 'This plan is not yet available for purchase.' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3050'
    const userSlug = session.user.slug

    // Only pre-fill email if it looks real — Polar validates domains strictly.
    // Fake/test emails (e.g. kl@mm.com) will be collected on the checkout page instead.
    const email = session.user.email
    const isValidEmail = email && /^[^@]+@[^@]+\.[^@]{2,}$/.test(email)

    const checkout = await polar.checkouts.create({
      products: [planCfg.productId],
      ...(isValidEmail ? { customerEmail: email } : {}),
      customerMetadata: {
        userId: session.user.id,
        planCode,
      },
      successUrl: `${appUrl}/billing/${userSlug}/success`,
      returnUrl: `${appUrl}/billing/${userSlug}`,
    })

    return NextResponse.json({ checkoutUrl: checkout.url }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[subscriptions/create] Error creating checkout:', message)
    return NextResponse.json(
      { error: 'Failed to create checkout session', detail: message },
      { status: 500 }
    )
  }
}
