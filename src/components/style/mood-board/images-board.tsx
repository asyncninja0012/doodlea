import { MoodBoardImage } from "@/hooks/use-styles"
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react"
import Image from "next/image"

type Props = {
    image: MoodBoardImage
    removeImage: (id: string) => void
    xOffset: number
    yOffset: number
    rotation: number
    zIndex: number
    margingLeft: string
    marginTop: string

}

const UploadStatus = (image: {
    uploading: boolean
    uploaded: boolean
    error?: string
}) => {
    if(image.uploading){
        return (
            <div className='absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl'>
                <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
        )
    }

    if(image.error) {
        return (
            <div className="absolute bottom-2 right-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
        )
    }

    return null
}

const ImagesBoard = ({image, removeImage, xOffset, yOffset, rotation, zIndex, margingLeft, marginTop}: Props) => {
    return (
                <div className="absolute group" key={`board-${image.id}`}
                style = {{
                    transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg)`,
                    zIndex: zIndex,
                    left: '50%',
                    marginLeft: margingLeft,
                    marginTop: marginTop,
                }}>

                    <div className="relative w-40 h-48 rounded-2xl overflow-hidden bg-white shadow-xl border border-border/20 hover:scale-105 transition-all duration-200">
                        <Image src={image.preview} alt='mood board image' fill className="object-cover" />
                        <UploadStatus uploading={image.uploading} uploaded={image.uploaded} error={image.error} />

                        <button
                            className="absolute top-1.5 right-1.5 z-10 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-md"
                            onClick={(e) => {
                                e.stopPropagation()
                                removeImage(image.id)
                            }}
                            aria-label="Remove image"
                        >
                            <X className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
    )
}

export default ImagesBoard