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

        const { projectId } = await req.json()

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, inspirationImages: true },
        })

        if (!project) throw new Error('Project not found')
        if (project.userId !== userId) throw new Error('Not authorized to modify this project')

        const currentImages = project.inspirationImages || []

        if (currentImages.length > 0) {
            // Delete all from Uploadthing
            await utapi.deleteFiles(currentImages)

            // Clear array in Prisma
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    inspirationImages: [],
                    lastModified: new Date(),
                },
            })
        }

        return NextResponse.json({ 
            success: true, 
            message: 'All inspiration images cleared successfully'
        })
    } catch (error) {
        console.error('Error clearing inspiration images:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
