import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'active'
      }
    })

    if (existingSubscription) {
      return NextResponse.json(
        { message: 'User already has an active subscription', subscription: existingSubscription },
        { status: 200 }
      )
    }

    // Create a test subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        status: 'active',
        polarCustomerId: `test_customer_${Date.now()}`,
        polarSubscriptionId: `test_sub_${Date.now()}`,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        creditsBalance: 10000,
        creditsGrantPerPeriod: 10000,
        creditsRolloverLimit: 20000,
      }
    })

    // Force JWT revalidation by updating lastValidated to a very old date
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastValidated: new Date(0) }, // Set to epoch to force revalidation
    })

    return NextResponse.json(
      { 
        message: 'Test subscription activated successfully',
        subscription 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error activating test subscription:', error)
    return NextResponse.json(
      { error: 'Failed to activate test subscription' },
      { status: 500 }
    )
  }
}
