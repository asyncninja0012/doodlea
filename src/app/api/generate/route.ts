import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { consumeCredits } from "@/inngest/functions"
import { styleGuideQuery } from "@/app/dashboard/[slug]/(workspace)/style-guide/queries"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
import { prompts } from "@/prompts"
import { streamText } from "ai"
import { encode } from "punycode"

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

// ----------------------------------------------------------------------
// Equivalent of Convex's inspirationImagesQuery for Prisma
// ----------------------------------------------------------------------
async function inspirationImagesQuery(projectId: string, userId: string) {
    // 1. Get the project and verify ownership
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, inspirationImages: true }
    })

    if (!project || project.userId !== userId) {
        return []
    }

    // 2. Get storage IDs
    const storageIds = project.inspirationImages || []

    // 3. Generate URLs for each image using UploadThing's URL structure
    const images = storageIds.map((storageId, index) => {
        try {
            return {
                id: `inspiration-${storageId}`, // Unique ID for client-side tracking
                storageId: storageId,
                url: `https://utfs.io/f/${storageId}`,
                uploaded: true,
                uploading: false,
                index, // Preserve order
            }
        } catch (error) {
            console.warn(`[Prisma] Failed to format inspiration image ${storageId}:`, error)
            return null
        }
    })

    // 4. Filter out any failed URLs and sort by index
    const validImages = images
        .filter((image) => image !== null)
        .sort((a, b) => a!.index - b!.index)

    return validImages
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = session.user.id

        const formData = await request.formData()
        const imageFile = formData.get('image') as File
        const projectId = formData.get('projectId') as string

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        if (!imageFile) {
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 },
            )
        }

        if (!imageFile.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Invalid file type. Only images are allowed' },
                { status: 400 },
            )
        }

        const idempotencyKey = `generate-ui-${projectId}-${Date.now()}`
        const creditResult = await consumeCredits(
            userId,
            1,
            'UI Generation',
            idempotencyKey
        )

        if (!creditResult.success) {
            return NextResponse.json(
                { error: creditResult.error ?? 'No credits available' },
                { status: 402 }
            )
        }

        // Image formatting
        const imageBuffer = await imageFile.arrayBuffer()
        const base64Image = `data:${imageFile.type};base64,${Buffer.from(imageBuffer).toString('base64')}`

        // Fetch Style Guide
        const rawStyleGuide = await styleGuideQuery(projectId)
        if (!rawStyleGuide) {
            return NextResponse.json({ error: 'Style guide not found' }, { status: 400 })
        }
        // NOTE: Prisma's styleGuideQuery already parses the JSON, so we don't need ._valueJSON
        const guide = rawStyleGuide as {
            colorSections: any[]
            typographySections: any[]
        }

        // Fetch Inspiration Images
        const inspirationImages = await inspirationImagesQuery(projectId, userId)
        const imageUrls = inspirationImages.map((img) => img.url).filter(Boolean)
        const colors = guide.colorSections || []
        const typography = guide.typographySections || []
        const systemPrompt = prompts.generativeUi.system;
        const userPrompt = `Use the user-provided styleGuide for all visual decisions: map its colors, typography scale, spacing, and radii directly to Tailwind v4 utilities (use arbitrary color classes like text-[#RRGGBB] / bg-[#RRGGBB] when hexes are given), enforce WCAG AA contrast (≥4.5:1 body, ≥3:1 large text), and if any token is missing fall back to neutral light defaults. Never invent new tokens; keep usage consistent across components.

Inspiration images (URLs):

You will receive up to 6 image URLs in images[].

Use them only for interpretation (mood/keywords/subject matter) to bias choices within the existing styleGuide tokens (e.g., which primary/secondary to emphasize, where accent appears, light vs. dark sections).

Do not derive new colors or fonts from images; do not create tokens that aren’t in styleGuide.

Do not echo the URLs in the output JSON; use them purely as inspiration.

If an image URL is unreachable/invalid, ignore it without degrading output quality.

If images imply low-contrast contexts, adjust class pairings (e.g., text-[#FFFFFF] on bg-[#0A0A0A], stronger border/ring from tokens) to maintain accessibility while staying inside the styleGuide.

For any required illustrative slots, use a public placeholder image (deterministic seed) only if the schema requires an image field; otherwise don’t include images in the JSON.

On conflicts: the styleGuide always wins over image cues.
    colors: ${colors
                .map((color: any) =>
                    color.swatches
                        .map((swatch: any) => {
                            return `${swatch.name}: ${swatch.hexColor}, ${swatch.description}`
                        })
                        .join(', ')
                )
                .join(', ')}
    typography: ${typography
                .map((typography: any) =>
                    typography.styles
                        .map((style: any) => {
                            return `${style.name}: ${style.description}, ${style.fontFamily}, ${style.fontWeight}, ${style.fontSize}, ${style.lineHeight}`
                        })
                        .join(', ')
                )
                .join(', ')}
    `

        const result = streamText({
            model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        },
                        {
                            type: 'image',
                            image: base64Image,
                        },
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: url,
                        })),
                    ],
                },
            ],
            system: systemPrompt,
            temperature: 0.7

        })
        console.log('Sending request to Groq API...')
        const stream = new ReadableStream({
            async start(controller) {
                let totalChunks = 0
                let totalLenght = 0
                let accumulatedContent = ''

                try {
                    for await (const chunk of result.textStream) {
                        if (totalChunks === 0) console.log('✅ Received first chunk from Groq!')
                        totalChunks++
                        totalLenght += chunk.length
                        accumulatedContent += chunk

                        const encoder = new TextEncoder()
                        controller.enqueue(encoder.encode(chunk))
                    }
                    
                    console.log(`✅ Finished streaming from Groq. Total chunks: ${totalChunks}, Total Length: ${totalLenght}`)
                    controller.close()
                } catch (error) {
                    console.error('❌ Error while streaming from Groq:', error)
                    controller.error(error)
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },

        })




    } catch (error) {
        return NextResponse.json({
            error: 'Failed to generate UI Design',
            details: error instanceof Error ? error.message : 'Unknown-error',
        }, { status: 500 })
    }
}