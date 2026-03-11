import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { utapi } from '@/lib/uploadthing'

type StoredImage = { storageId: string; url: string }

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) {
            throw new Error('Not authenticated')
        }

        const { projectId, storageId } = await req.json()

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, moodBoardImages: true },
        })

        if (!project) {
            throw new Error('Project not found')
        }

        if (project.userId !== userId) {
            throw new Error('Access denied')
        }

        const raw = project.moodBoardImages
        const currentImages: StoredImage[] = Array.isArray(raw) ? (raw as StoredImage[]) : []
        const updatedImages = currentImages.filter((img) => img.storageId !== storageId)

        await prisma.project.update({
            where: { id: projectId },
            data: {
                moodBoardImages: updatedImages,
                lastModified: new Date(),
            },
        })

        // Delete from Uploadthing cloud storage
        try {
            await utapi.deleteFiles(storageId)
        } catch (error) {
            console.error(`Failed to delete mood board image from Uploadthing (${storageId}):`, error)
        }

        return NextResponse.json({ success: true, imageCount: updatedImages.length })
    } catch (error) {
        console.error('Error removing mood board image:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
