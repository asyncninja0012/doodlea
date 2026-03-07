import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createUploadthing, type FileRouter } from "uploadthing/server"

const f = createUploadthing()

export const ourFileRouter = {
    moodBoardImage: f({
        image: { maxFileSize: "4MB", maxFileCount: 5 },
    })
        .middleware(async () => {
            const session = await getServerSession(authOptions)
            if (!session?.user?.id) throw new Error("Unauthorized")
            return { userId: session.user.id }
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload complete for user:", metadata.userId)
            console.log("File URL:", file.ufsUrl)
            return { url: file.ufsUrl, key: file.key }
        }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
