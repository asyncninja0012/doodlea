import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

/**
 * POST /api/webhooks/polar
 *
 * Receives Polar webhook events, verifies the HMAC signature,
 * and forwards them as Inngest events for async processing.
 *
 * Configure Polar Dashboard → Settings → Webhooks to point at:
 *   https://<your-domain>/api/webhooks/polar
 */
export async function POST(request: NextRequest) {
    try {
        // Read raw body as text — required for HMAC signature verification
        const rawBody = await request.text()
        const headers: Record<string, string> = {}
        request.headers.forEach((value, key) => {
            headers[key] = value
        })

        const webhookSecret = process.env.POLAR_WEBHOOK_SECRET ?? ''

        let event: ReturnType<typeof validateEvent>
        try {
            event = validateEvent(rawBody, headers, webhookSecret)
        } catch (err) {
            if (err instanceof WebhookVerificationError) {
                console.error('[polar-webhook] Signature verification failed:', err.message)
                return NextResponse.json(
                    { error: 'Invalid webhook signature' },
                    { status: 403 }
                )
            }
            throw err
        }

        const eventType = (event as { type: string }).type

        // Map Polar event types → Inngest event names
        const eventMap: Record<string, string> = {
            'subscription.created': 'polar/subscription.created',
            'subscription.updated': 'polar/subscription.updated',
            'subscription.revoked': 'polar/subscription.revoked',
            'subscription.active': 'polar/subscription.active',
            'subscription.canceled': 'polar/subscription.canceled',
            'order.created': 'polar/order.created',
        }

        const inngestEventName = eventMap[eventType]

        if (!inngestEventName) {
            console.log(`[polar-webhook] Ignoring unhandled event type: ${eventType}`)
            return NextResponse.json({ received: true, handled: false }, { status: 200 })
        }

        // Forward the full validated event payload to Inngest for async processing
        await inngest.send({
            name: inngestEventName,
            data: (event as { data: unknown }).data,
        })

        console.log(`[polar-webhook] Forwarded ${eventType} → ${inngestEventName}`)

        return NextResponse.json({ received: true, handled: true }, { status: 200 })
    } catch (error) {
        console.error('[polar-webhook] Error processing webhook:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
