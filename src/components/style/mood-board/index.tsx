"use client"

import { MoodBoardImage, useMoodBoard } from "@/hooks/use-styles"
import { cn } from "@/lib/utils"
import { ImagePlus, Upload } from "lucide-react"
import { useRef } from "react"
import { toast } from "sonner"
import ImagesBoard from "./images-board"


type Props = {
    guideImages: MoodBoardImage[]
}


const Moodboard = ({guideImages}: Props) => {

    const {
        images,
        dragActive,
        removeImage,
        handleDrag,
        handleDrop,
        handleFileInput,
        canAddMore,
    } = useMoodBoard(guideImages)

    const fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="flex flex-col gap-10">
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 min-h-[500px] flex items-center justify-center",
                    dragActive
                        ? 'border-primary bg-primary/5 scale-[1.01] ring-4 ring-primary/30 shadow-[0_0_24px_rgba(var(--primary),0.25)]'
                        : 'border-border/50 hover:border-border'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {/* Background gradient — pointer-events-none so it never intercepts drag */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-3xl" />
                </div>

                {images.length === 0 ? (
                    /* Empty-state prompt */
                    <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none select-none">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                            <ImagePlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-foreground">Drag &amp; drop images here</p>
                            <p className="text-sm text-muted-foreground mt-1">or click to browse &middot; up to 5 images</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile scattered layout */}
                        <div className="lg:hidden absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                {images.map((image, index) => {
                                    const seed = image.id.split('').reduce((a,b) => a + b.charCodeAt(0), 0)
                                    const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                                    const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280
                                    const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280
                                    const rotation = (random1 - 0.5)*20
                                    const xOffset = (random2 - 0.5)*40
                                    const yOffset = (random3 - 0.5)*30

                                    return (
                                        <ImagesBoard
                                            key={`mobile-${image.id}`}
                                            image={image}
                                            removeImage={removeImage}
                                            xOffset={xOffset}
                                            yOffset={yOffset}
                                            rotation={rotation}
                                            zIndex={index+1}
                                            margingLeft='-80px'
                                            marginTop='-96px'
                                        />
                                    )
                                })}
                            </div>
                        </div>

                        {/* Desktop scattered layout */}
                        <div className="hidden lg:flex absolute inset-0 items-center justify-center">
                            <div className="relative w-full max-w-[700px] h-[300px] mx-auto">
                                {images.map((image, index) => {
                                    const seed = image.id.split('').reduce((a,b) => a + b.charCodeAt(0), 0)
                                    const random1 = ((seed * 9301 + 49297) % 233280) / 233280
                                    // const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280
                                    const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280

                                    const imageWidth=192;
                                    const overlapAmount = 30
                                    const spacing = imageWidth-overlapAmount

                                    const rotation = (random1 - 0.5)*50
                                    const xOffset = index*spacing - ((images.length-1)*spacing)/2
                                    const yOffset = (random3-0.5)*30
                                    const zIndex = index+1

                                    return (
                                        <ImagesBoard
                                            key={`desktop-${image.id}`}
                                            image={image}
                                            removeImage={removeImage}
                                            xOffset={xOffset}
                                            yOffset={yOffset}
                                            rotation={rotation}
                                            zIndex={index+1}
                                            margingLeft='-100px'
                                            marginTop='0px'
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Hidden file input for click-to-browse */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                />

                {/* Clickable overlay (behind images, above background) — only when empty */}
                {images.length === 0 && (
                    <button
                        type="button"
                        className="absolute inset-0 z-0 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload images"
                    />
                )}

                {/* Add More button — bottom right, visible when at least 1 image */}
                {images.length > 0 && (
                    <button
                        type="button"
                        className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-lg bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-4 py-2 text-sm font-medium text-foreground hover:bg-white/[0.15] transition-all duration-200"
                        onClick={() => {
                            if (!canAddMore) {
                                toast.error('Only 5 images allowed')
                                return
                            }
                            fileInputRef.current?.click()
                        }}
                    >
                        <Upload className="w-4 h-4" />
                        Add More
                    </button>
                )}
            </div>
        </div>
    )
}


export default Moodboard
