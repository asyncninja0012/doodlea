import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/subscriptions/credits
 *
 * Returns the current user's credits balance from their active subscription.
 * Used by the navbar to display live credit count.
 */
export async function GET(_request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId: session.user.id,
                status: { in: ['active', 'trialing'] },
            },
            select: {
                creditsBalance: true,
                creditsGrantPerPeriod: true,
                planCode: true,
                currentPeriodEnd: true,
            },
        })

        if (!subscription) {
            return NextResponse.json(
                { creditsBalance: 0, creditsGrantPerPeriod: 0, planCode: null, currentPeriodEnd: null },
                { status: 200 }
            )
        }

        return NextResponse.json(subscription, { status: 200 })
    } catch (error) {
        console.error('[subscriptions/credits] Error fetching credits:', error)
        return NextResponse.json(
            { error: 'Failed to fetch credits' },
            { status: 500 }
        )
    }
}
