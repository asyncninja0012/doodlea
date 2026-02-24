import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

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

    // TODO: Integrate with actual payment provider (Stripe, Polar, etc.)
    // For now, create a mock subscription for testing
    
    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'trialing'] },
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        polarCustomerId: `cust_mock_${Date.now()}`,
        polarSubscriptionId: `sub_mock_${Date.now()}`,
        productId: `prod_${plan}`,
        priceId: `price_${plan}`,
        planCode: plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        creditsBalance: 1000,
        creditsGrantPerPeriod: 1000,
        creditsRolloverLimit: 2000,
      },
    })

    return NextResponse.json({ subscription }, { status: 200 })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
