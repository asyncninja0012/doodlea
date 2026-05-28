import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in dev mode' }, { status: 403 })
    }

    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const sub = await prisma.subscription.findFirst({
            where: { userId: session.user.id }
        })

        if (!sub) {
            return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 })
        }

        const updated = await prisma.subscription.update({
            where: { id: sub.id },
            data: { creditsBalance: sub.creditsBalance + 100 }
        })

        // Also add a ledger entry so the history matches
        await prisma.creditsLedger.create({
            data: {
                userId: session.user.id,
                subscriptionId: sub.id,
                amount: 100,
                type: 'grant',
                reason: 'dev_mode_grant',
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Granted 100 credits successfully',
            newBalance: updated.creditsBalance
        })

    } catch (error) {
        console.error('[dev/grant-credits] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
