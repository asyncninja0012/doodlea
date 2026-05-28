import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { utapi } from '@/lib/uploadthing'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) throw new Error('Not authenticated')

        const { projectId, storageId } = await req.json()

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, inspirationImages: true },
        })

        if (!project) throw new Error('Project not found')
        if (project.userId !== userId) throw new Error('Not authorized to modify this project')

        const currentImages = project.inspirationImages || []
        
        if (!currentImages.includes(storageId)) {
            throw new Error('Image not found in this project')
        }

        // Delete from Uploadthing
        await utapi.deleteFiles(storageId)

        const updatedImages = currentImages.filter((id) => id !== storageId)

        await prisma.project.update({
            where: { id: projectId },
            data: {
                inspirationImages: updatedImages,
                lastModified: new Date(),
            },
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Inspiration image removed successfully',
            totalImages: updatedImages.length
        })
    } catch (error) {
        console.error('Error removing inspiration image:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
