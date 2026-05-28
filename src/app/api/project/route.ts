import { inngest } from "@/inngest/client";
import { NextRequest, NextResponse } from "next/server";

interface updateProjectRequest {
    projectId: string;
    shapesData: {
        shapes: Record<string, unknown>
        tool: string
        selected: Record<string, unknown>
        frameCounter: number
    }
    viewportData: {
        scale: number
        translate: { x: number, y: number }
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body: updateProjectRequest & { userId?: string } = await request.json()
        const { projectId, shapesData, viewportData, userId } = body

        if (!projectId || !userId || !shapesData) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        const eventResult = await inngest.send({
            name: 'project/autosave.requested',
            data: {
                projectId,
                userId,
                shapesData,
                viewportData,
            },
        })

        return NextResponse.json({ success: true, eventResult })

    } catch (error) {
        return NextResponse.json({
            error: 'Failed to save project',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 })
    }

}