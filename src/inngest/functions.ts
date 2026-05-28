import {inngest} from './client'
import {prisma} from '@/lib/prisma'
import {Prisma} from '@prisma/client'
import {
    extractSubscriptionLike,
    extractOrderLike,
    type PolarSubscription,
} from '@/types/polar'

// ────────────────────────────────────────────────────────────────
// Auto-save project workflow (pre-existing)
// ────────────────────────────────────────────────────────────────

export const autoSaveProjectWorkflow = inngest.createFunction(
    {id: 'auto-save project workflow'},
    {event: 'project/autosave.requested'},

    async ({event}) => {
        const {projectId, shapesData, viewportData} = event.data

        const project = await prisma.project.findUnique({where: {id: projectId}})
        if (!project) throw new Error('Project not found')

        const updateData: Record<string, unknown> = {
            sketchesData: shapesData,
            lastModified: new Date(),
        }

        if (viewportData) {
            updateData.viewportData = viewportData
        }

        await prisma.project.update({
            where: {id: projectId},
            data: updateData,
        })

        return {success: true}
    }
)

// ────────────────────────────────────────────────────────────────
// Helper: get user ID by email
// ────────────────────────────────────────────────────────────────

async function getUserIdByEmail(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: {email},
        select: {id: true},
    })
    return user?.id ?? null
}

// ────────────────────────────────────────────────────────────────
// Helper: resolve user ID from subscription data
// Priority: customerMetadata.userId → customer email → existing row
// ────────────────────────────────────────────────────────────────

async function resolveUserId(sub: PolarSubscription): Promise<string | null> {
    // First priority: userId passed through checkout customerMetadata
    const metaUserId = sub.metadata?.userId
    if (metaUserId && typeof metaUserId === 'string') {
        const user = await prisma.user.findUnique({where: {id: metaUserId}, select: {id: true}})
        if (user) return user.id
    }

    // Second: customer email
    const email = sub.customer?.email
    if (email) {
        const userId = await getUserIdByEmail(email)
        if (userId) return userId
    }

    // Fallback: already-stored subscription row
    const existing = await prisma.subscription.findFirst({
        where: {polarSubscriptionId: sub.id},
        select: {userId: true},
    })
    return existing?.userId ?? null
}

// ────────────────────────────────────────────────────────────────
// Helper: determine plan-level credit values
// Standard: 100 credits / period
// Pro:       200 credits / period
// ────────────────────────────────────────────────────────────────

function creditsForPlan(planCode: string | null | undefined) {
    switch (planCode?.toLowerCase()) {
        case 'standard':
            return {creditsBalance: 10, creditsGrantPerPeriod: 10, creditsRolloverLimit: 20}
        case 'pro':
            return {creditsBalance: 20, creditsGrantPerPeriod: 20, creditsRolloverLimit: 40}
        default:
            return {creditsBalance: 10, creditsGrantPerPeriod: 10, creditsRolloverLimit: 20}
    }
}

// ────────────────────────────────────────────────────────────────
// Exported helper: consume credits from a user's active subscription
// ────────────────────────────────────────────────────────────────

export async function consumeCredits(
    userId: string,
    amount: number,
    reason: string,
    idempotencyKey?: string
): Promise<{success: boolean; remaining: number; error?: string}> {
    // Find active subscription
    const sub = await prisma.subscription.findFirst({
        where: {userId, status: {in: ['active', 'trialing']}},
    })

    if (!sub) {
        return {success: false, remaining: 0, error: 'No active subscription'}
    }

    if (sub.creditsBalance < amount) {
        return {success: false, remaining: sub.creditsBalance, error: 'Insufficient credits'}
    }

    // Check idempotency — skip if already processed
    if (idempotencyKey) {
        const existing = await prisma.creditsLedger.findFirst({
            where: {idempotencyKey, userId},
        })
        if (existing) {
            return {success: true, remaining: sub.creditsBalance}
        }
    }

    // Atomically decrement balance and write ledger entry
    const [, updated] = await prisma.$transaction([
        prisma.creditsLedger.create({
            data: {
                userId,
                subscriptionId: sub.id,
                amount: -amount,
                type: 'consume',
                reason,
                idempotencyKey: idempotencyKey ?? null,
            },
        }),
        prisma.subscription.update({
            where: {id: sub.id},
            data: {creditsBalance: {decrement: amount}},
        }),
    ])

    return {success: true, remaining: updated.creditsBalance}
}

// ────────────────────────────────────────────────────────────────
// Helper: grant credits on period renewal (idempotent via order ID)
// ────────────────────────────────────────────────────────────────

async function grantCreditsForPeriod(
    subscriptionId: string,
    userId: string,
    idempotencyKey: string
): Promise<void> {
    // Idempotency check
    const existing = await prisma.creditsLedger.findFirst({
        where: {idempotencyKey, userId},
    })
    if (existing) return

    const sub = await prisma.subscription.findUnique({where: {id: subscriptionId}})
    if (!sub) return

    const grant = sub.creditsGrantPerPeriod
    const newBalance = Math.min(
        sub.creditsBalance + grant,
        sub.creditsRolloverLimit
    )
    const actualGrant = newBalance - sub.creditsBalance

    await prisma.$transaction([
        prisma.creditsLedger.create({
            data: {
                userId,
                subscriptionId,
                amount: actualGrant,
                type: 'grant',
                reason: 'period_renewal',
                idempotencyKey,
            },
        }),
        prisma.subscription.update({
            where: {id: subscriptionId},
            data: {creditsBalance: newBalance, lastGrantCursor: idempotencyKey},
        }),
    ])
}

// ────────────────────────────────────────────────────────────────
// Polar: subscription.created
// ────────────────────────────────────────────────────────────────

export const handlePolarSubscriptionCreated = inngest.createFunction(
    {id: 'polar/subscription.created'},
    {event: 'polar/subscription.created'},

    async ({event}) => {
        const sub = extractSubscriptionLike(event.data)
        if (!sub) throw new Error('Invalid subscription payload')

        const userId = await resolveUserId(sub)
        if (!userId) throw new Error(`No user found for subscription ${sub.id}`)

        const credits = creditsForPlan(sub.plan_code ?? sub.product?.name?.toLowerCase())

        await prisma.subscription.upsert({
            where: {polarSubscriptionId: sub.id},
            create: {
                userId,
                polarCustomerId: sub.customer?.id ?? sub.customer_id ?? '',
                polarSubscriptionId: sub.id,
                productId: sub.product_id ?? sub.product?.id ?? null,
                priceId: sub.prices?.[0]?.id ?? null,
                planCode: sub.plan_code ?? sub.product?.name?.toLowerCase() ?? null,
                status: sub.status,
                currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
                trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : null,
                cancelAt: sub.cancel_at ? new Date(sub.cancel_at) : null,
                canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : null,
                seats: sub.seats ?? null,
                metadata: sub.metadata ? (sub.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
                ...credits,
            },
            update: {
                status: sub.status,
                productId: sub.product_id ?? sub.product?.id ?? undefined,
                priceId: sub.prices?.[0]?.id ?? undefined,
                planCode: sub.plan_code ?? sub.product?.name?.toLowerCase() ?? undefined,
                currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : undefined,
                trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : undefined,
                cancelAt: sub.cancel_at ? new Date(sub.cancel_at) : undefined,
                canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
                seats: sub.seats ?? undefined,
                metadata: sub.metadata ? (sub.metadata as Prisma.InputJsonValue) : undefined,
            },
        })

        return {success: true, userId, polarSubscriptionId: sub.id}
    }
)

// ────────────────────────────────────────────────────────────────
// Polar: subscription.updated
// ────────────────────────────────────────────────────────────────

export const handlePolarSubscriptionUpdated = inngest.createFunction(
    {id: 'polar/subscription.updated'},
    {event: 'polar/subscription.updated'},

    async ({event}) => {
        const sub = extractSubscriptionLike(event.data)
        if (!sub) throw new Error('Invalid subscription payload')

        const existing = await prisma.subscription.findFirst({
            where: {polarSubscriptionId: sub.id},
        })

        if (!existing) {
            // Out-of-order webhook — create from scratch
            const userId = await resolveUserId(sub)
            if (!userId) throw new Error(`No user found for subscription ${sub.id}`)

            const credits = creditsForPlan(sub.plan_code ?? sub.product?.name?.toLowerCase())

            await prisma.subscription.create({
                data: {
                    userId,
                    polarCustomerId: sub.customer?.id ?? sub.customer_id ?? '',
                    polarSubscriptionId: sub.id,
                    productId: sub.product_id ?? sub.product?.id ?? null,
                    priceId: sub.prices?.[0]?.id ?? null,
                    planCode: sub.plan_code ?? sub.product?.name?.toLowerCase() ?? null,
                    status: sub.status,
                    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
                    trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : null,
                    cancelAt: sub.cancel_at ? new Date(sub.cancel_at) : null,
                    canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : null,
                    seats: sub.seats ?? null,
                    metadata: sub.metadata ? (sub.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
                    ...credits,
                },
            })

            return {success: true, action: 'created', polarSubscriptionId: sub.id}
        }

        await prisma.subscription.update({
            where: {id: existing.id},
            data: {
                status: sub.status,
                productId: sub.product_id ?? sub.product?.id ?? undefined,
                priceId: sub.prices?.[0]?.id ?? undefined,
                planCode: sub.plan_code ?? sub.product?.name?.toLowerCase() ?? undefined,
                currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : undefined,
                trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : undefined,
                cancelAt: sub.cancel_at ? new Date(sub.cancel_at) : undefined,
                canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
                seats: sub.seats ?? undefined,
                metadata: sub.metadata ? (sub.metadata as Prisma.InputJsonValue) : undefined,
            },
        })

        return {success: true, action: 'updated', polarSubscriptionId: sub.id}
    }
)

// ────────────────────────────────────────────────────────────────
// Polar: subscription.active — fired when sub moves to active
// ────────────────────────────────────────────────────────────────

export const handlePolarSubscriptionActive = inngest.createFunction(
    {id: 'polar/subscription.active'},
    {event: 'polar/subscription.active'},

    async ({event}) => {
        const sub = extractSubscriptionLike(event.data)
        if (!sub) throw new Error('Invalid subscription payload')

        const existing = await prisma.subscription.findFirst({
            where: {polarSubscriptionId: sub.id},
        })

        if (!existing) return {success: true, action: 'noop'}

        await prisma.subscription.update({
            where: {id: existing.id},
            data: {status: 'active'},
        })

        return {success: true, action: 'activated', polarSubscriptionId: sub.id}
    }
)

// ────────────────────────────────────────────────────────────────
// Polar: subscription.canceled — user cancelled, still in period
// ────────────────────────────────────────────────────────────────

export const handlePolarSubscriptionCanceled = inngest.createFunction(
    {id: 'polar/subscription.canceled'},
    {event: 'polar/subscription.canceled'},

    async ({event}) => {
        const sub = extractSubscriptionLike(event.data)
        if (!sub) throw new Error('Invalid subscription payload')

        const existing = await prisma.subscription.findFirst({
            where: {polarSubscriptionId: sub.id},
        })

        if (!existing) return {success: true, action: 'noop'}

        await prisma.subscription.update({
            where: {id: existing.id},
            data: {
                status: 'canceled',
                canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : new Date(),
                cancelAt: sub.cancel_at ? new Date(sub.cancel_at) : undefined,
            },
        })

        return {success: true, action: 'canceled', polarSubscriptionId: sub.id}
    }
)

// ────────────────────────────────────────────────────────────────
// Polar: subscription.revoked
// ────────────────────────────────────────────────────────────────

export const handlePolarSubscriptionRevoked = inngest.createFunction(
    {id: 'polar/subscription.revoked'},
    {event: 'polar/subscription.revoked'},

    async ({event}) => {
        const sub = extractSubscriptionLike(event.data)
        if (!sub) throw new Error('Invalid subscription payload')

        const existing = await prisma.subscription.findFirst({
            where: {polarSubscriptionId: sub.id},
        })

        if (!existing) {
            return {success: true, action: 'noop', polarSubscriptionId: sub.id}
        }

        await prisma.subscription.update({
            where: {id: existing.id},
            data: {
                status: 'revoked',
                canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : new Date(),
            },
        })

        return {success: true, action: 'revoked', polarSubscriptionId: sub.id}
    }
)

// ────────────────────────────────────────────────────────────────
// Polar: order.created — handles subscription renewals & one-time orders
// ────────────────────────────────────────────────────────────────

export const handlePolarOrderCreated = inngest.createFunction(
    {id: 'polar/order.created'},
    {event: 'polar/order.created'},

    async ({event}) => {
        const order = extractOrderLike(event.data)
        if (!order) throw new Error('Invalid order payload')

        // Only handle subscription renewals here
        if (order.billing_reason !== 'subscription_cycle') {
            return {success: true, action: 'skipped', reason: 'not a renewal'}
        }

        if (!order.subscription_id) {
            return {success: true, action: 'skipped', reason: 'no subscription_id'}
        }

        const sub = await prisma.subscription.findFirst({
            where: {polarSubscriptionId: order.subscription_id},
        })

        if (!sub) {
            console.warn(`[polar/order.created] Subscription not found: ${order.subscription_id}`)
            return {success: false, reason: 'subscription not found'}
        }

        // Grant credits for the new period (idempotent via order ID)
        await grantCreditsForPeriod(sub.id, sub.userId, `order_${order.id}`)

        return {success: true, action: 'credits_granted', orderId: order.id}
    }
)