import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { consumeCredits } from '@/inngest/functions'
import { z } from 'zod'
import { prompts } from '@/prompts'
import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const ColorSwatchSchema = z.object({
    name: z.string(),
    hexColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be valid hex color'),
    description: z.string().describe('Optional description of the color')
})

const PrimaryColorsSchema = z.object({
    title: z.literal('Primary Colours'),
    swatches: z.array(ColorSwatchSchema)
})

const SecondaryColorsSchema = z.object({
    title: z.literal('Secondary Colours'),
    swatches: z.array(ColorSwatchSchema)
})

const UIComponentColorsSchema = z.object({
    title: z.literal('UI Component Colours'),
    swatches: z.array(ColorSwatchSchema)
})

const UtilityColorsSchema = z.object({
    title: z.literal('Utility Colours'),
    swatches: z.array(ColorSwatchSchema)
})

const StatusColorsSchema = z.object({
    title: z.literal('Status Colours'),
    swatches: z.array(ColorSwatchSchema)
})

const TypographyStyleSchema = z.object({
    name: z.string(),
    fontFamily: z.string(),
    fontSize: z.string(),
    fontWeight: z.string(),
    lineHeight: z.string(),
    letterSpacing: z.string().describe('Optional letter spacing'),
    description: z.string().describe('Optional description of the typography style')
})

const TypographySectionSchema = z.object({
    title: z.string(),
    styles: z.array(TypographyStyleSchema),
})

const StyleGuideSchema = z.object({
    theme: z.string(),
    description: z.string(),
    colorSections: z.tuple([
        PrimaryColorsSchema,
        SecondaryColorsSchema,
        UIComponentColorsSchema,
        UtilityColorsSchema,
        StatusColorsSchema,
    ]),
    typographySections: z.array(TypographySectionSchema)
})

async function creditBalanceQuery(userId: string): Promise<{
    ok: boolean
    balance: number
}> {
    const sub = await prisma.subscription.findFirst({
        where: { userId, status: { in: ['active', 'trialing'] } },
        select: { creditsBalance: true },
    })

    if (!sub) {
        return { ok: false, balance: 0 }
    }

    return { ok: true, balance: sub.creditsBalance }
}

async function moodBoardImagesQuery(
    projectId: string,
    userId: string
): Promise<{ storageId: string; url: string }[] | null> {
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        select: { moodBoardImages: true },
    })

    if (!project) return null

    return project.moodBoardImages as { storageId: string; url: string }[]
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = session.user.id

        const body = await request.json()
        const { projectId } = body
        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        const { ok: balanceOk, balance: balanceBalance } = await creditBalanceQuery(userId)

        if (!balanceOk) {
            return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
        }

        if (balanceBalance === 0) {
            return NextResponse.json({ error: 'No credits available' }, { status: 400 })
        }

        const moodBoardImages = await moodBoardImagesQuery(projectId, userId)

        if (!moodBoardImages) {
            return NextResponse.json(
                { error: 'Project not found or access denied' },
                { status: 404 }
            )
        }

        if (moodBoardImages.length === 0) {
            return NextResponse.json(
                { error: 'No mood board images found. Please add images before generating.' },
                { status: 400 }
            )
        }

        const imageUrls = moodBoardImages.map((img) => img.url).filter(Boolean)
        const systemPrompt = prompts.styleGuide.system
        const userPrompt = `Analyse these ${imageUrls.length} moodboard images and generate a design system: Extract colors that work harmoniuosly together and create typography that matches the asthetic. Return ONLY the JSON object matching the exact schema structure above`

        const result = await generateObject({
            model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
            schema: StyleGuideSchema,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        },
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: url as string,
                        })),
                    ],
                },
            ],
        })

        const idempotencyKey = `style-guide-${projectId}-${Date.now()}`
        const creditResult = await consumeCredits(
            userId,
            1,
            'Style guide generation',
            idempotencyKey
        )

        if (!creditResult.success) {
            return NextResponse.json(
                { error: creditResult.error ?? 'Failed to consume credits' },
                { status: 402 }
            )
        }

        await prisma.project.update({
            where: { id: projectId },
            data: { styleGuide: JSON.stringify(result.object) },
        })

        return NextResponse.json({
            success: true,
            styleGuide: result.object,
            message: 'Style guide generated successfully',
        })
    } catch (error) {
        console.error('[generate/style] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
