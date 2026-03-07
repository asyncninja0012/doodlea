import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { utapi } from '@/lib/uploadthing'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Upload to Uploadthing cloud storage
        const response = await utapi.uploadFiles(file)

        if (response.error) {
            console.error('Uploadthing error:', response.error)
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
        }

        const { key, ufsUrl } = response.data

        // storageId = UT file key, url = CDN serving URL
        return NextResponse.json({ storageId: key, url: ufsUrl })
    } catch (error) {
        console.error('Error uploading file:', error)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
}
