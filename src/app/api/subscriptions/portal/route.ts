import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { polar } from '@/lib/polar'

/**
 * GET /api/subscriptions/portal
 *
 * Creates a Polar customer session and returns the customer portal URL.
 * The client should redirect the user to this URL so they can manage
 * their subscription (cancel, update payment method, view invoices, etc.)
 */
export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Find the user's active subscription to get their Polar customer ID
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId: session.user.id,
                status: { in: ['active', 'trialing', 'canceled'] },
            },
            orderBy: { createdAt: 'desc' },
        })

        if (!subscription || !subscription.polarCustomerId) {
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            )
        }

        // Create a short-lived customer session token for the portal
        const customerSession = await polar.customerSessions.create({
            customerId: subscription.polarCustomerId,
        })

        return NextResponse.json(
            { portalUrl: customerSession.customerPortalUrl },
            { status: 200 }
        )
    } catch (error) {
        console.error('[subscriptions/portal] Error creating customer session:', error)
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        )
    }
}
