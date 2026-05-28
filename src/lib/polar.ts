import { Polar } from '@polar-sh/sdk'
import { ServerSandbox } from '@polar-sh/sdk/lib/config'

/**
 * Singleton Polar SDK client.
 * Uses POLAR_ACCESS_TOKEN from environment variables.
 * Set POLAR_SANDBOX=true in .env to use the sandbox environment.
 */
const isSandbox = process.env.POLAR_SANDBOX === 'true'

export const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
    ...(isSandbox ? { server: ServerSandbox } : {}),
})

/**
 * Plan configuration — maps plan codes to Polar product IDs,
 * credit grants, and display metadata.
 *
 * Standard: ₹1,999/mo — 100 credits
 * Pro:       ₹3,499/mo — 200 credits (UI-only until product is created in Polar)
 */
export const PLAN_CONFIG = {
    standard: {
        productId: process.env.POLAR_STANDARD_PLAN ?? '',
        credits: 10,
        creditsGrantPerPeriod: 10,
        creditsRolloverLimit: 20,
        priceINR: 1999,
        label: 'Standard',
        description: 'Perfect for individual creators',
    },
    pro: {
        productId: process.env.POLAR_PRO_PLAN ?? '',
        credits: 200,
        creditsGrantPerPeriod: 200,
        creditsRolloverLimit: 400,
        priceINR: 3499,
        label: 'Pro',
        description: 'For power users & small teams',
    },
} as const

export type PlanCode = keyof typeof PLAN_CONFIG
