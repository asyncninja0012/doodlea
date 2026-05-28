import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'

type Props = {
    isOpen: boolean
    onClose: () => void
}

export type InspirationImage = {
    id: string
    storageId: string
    url: string
    preview: string
    uploaded: boolean
    uploading: boolean
    error?: string
    isFromServer?: boolean
    index: number
}

const InspirationSidebar = ({ isOpen, onClose }: Props) => {

    const [images, setImages] = useState<InspirationImage[]>([])
    const [dragActive, setDragActive] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')

    // Fetch existing images on mount
    useEffect(() => {
        if (!projectId || !isOpen) return

        const fetchImages = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/inspiration?projectId=${projectId}`)
                if (res.ok) {
                    const data = await res.json()
                    setImages(data)
                }
            } catch (error) {
                console.error("Failed to fetch inspiration images", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchImages()
    }, [projectId, isOpen])

    const uploadFile = async (file: File) => {
        if (!projectId) return

        // 1. Create a local preview
        const id = `${Date.now()}-${Math.random()}`
        const newImage: InspirationImage = {
            id,
            storageId: '',
            url: '',
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: true,
            index: images.length
        }

        setImages(prev => [...prev, newImage])

        try {
            // 2. Generate Upload URL & Upload (we use our moodboard upload logic)
            const formData = new FormData()
            formData.append('file', file)

            // Re-using the moodboard upload route which works perfectly for any file
            const uploadRes = await fetch('/api/moodboard/upload', {
                method: 'POST',
                body: formData
            })

            if (!uploadRes.ok) throw new Error('Failed to upload image')

            const { storageId, url } = await uploadRes.json()

            // 3. Add to Database
            const addRes = await fetch('/api/inspiration/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, storageId, url })
            })

            if (!addRes.ok) throw new Error('Failed to save to project')

            setImages(prev => prev.map(img => img.id === id ? {
                ...img,
                storageId,
                url,
                preview: url,
                uploaded: true,
                uploading: false,
                isFromServer: true
            } : img))

            toast.success('Inspiration image added')

        } catch (error) {
            console.error(error)
            toast.error('Failed to upload image')
            setImages(prev => prev.filter(img => img.id !== id))
        }
    }

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return

        // 1. Only allow image files
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'))

        // 2. Upload only up to the remaining slots
        const remainingSlots = 6 - images.length
        if (remainingSlots <= 0) {
            toast.error('Maximum 6 images allowed')
            return
        }

        const filesToUpload = validFiles.slice(0, remainingSlots)

        if (validFiles.length > remainingSlots) {
            toast.warning(`Maximum 6 images allowed. Uploading the first ${remainingSlots} images.`)
        }

        filesToUpload.forEach(file => uploadFile(file))
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        handleFileSelect(e.dataTransfer.files)
    }

    const removeImage = async (imageToRemove: InspirationImage) => {
        if (!projectId) return

        // Optimistic remove
        setImages(prev => prev.filter(img => img.id !== imageToRemove.id))
        if (!imageToRemove.isFromServer && imageToRemove.preview.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove.preview)
        }

        if (imageToRemove.isFromServer && imageToRemove.storageId) {
            try {
                const res = await fetch('/api/inspiration/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, storageId: imageToRemove.storageId })
                })
                if (!res.ok) throw new Error('Failed to remove from server')
                toast.success('Image removed')
            } catch (error) {
                console.error(error)
                toast.error('Failed to remove image')
                // Revert optimistic update
                setImages(prev => [...prev, imageToRemove].sort((a, b) => a.index - b.index))
            }
        }
    }

    const clearAllImages = async () => {
        if (!projectId) return
        // Optimistic UI clear
        const previousImages = [...images]

        // Revoke object URLs for local previews
        images.forEach(img => {
            if (!img.isFromServer && img.preview.startsWith('blob:')) {
                URL.revokeObjectURL(img.preview)
            }
        })

        setImages([])
        try {
            const res = await fetch('/api/inspiration/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            })

            if (!res.ok) throw new Error('Failed to clear images from server')

            toast.success('All inspiration images cleared')
        } catch (error) {
            console.error(error)
            toast.error('Failed to clear images')
            setImages(previousImages) // Revert on failure
        }
    }

    return (
        <div className={cn(
            'fixed left-5 top-1/2 transform -translate-y-1/2 w-80 backdrop-blur-xl bg-black/40 border-white/[0.12] p-4 border rounded-xl z-50 transition-all duration-300',
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'
        )}>
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                    <ImageIcon className='w-5 h-5 text-white/80' />
                    <Label className='text-white/80 font-medium'>Inspiration Board</Label>
                </div>
                <Button variant='ghost' size='sm' onClick={onClose} className='h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10'>
                    <X className='w-4 h-4' />
                </Button>
            </div>

            <div className='flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-10rem)]'>

                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
                ) : null}

                <div className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer mt-2',
                    dragActive ? 'border-blue-400 bg-blue-500/10' :
                        images.length < 6 ? 'border-white/20 hover:border-white/40 hover:bg-white/5' :
                            'border-white/10 bg-white/5 cursor-not-allowed opacity-50'
                )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => images.length < 6 && fileInputRef.current?.click()}>

                    <input
                        ref={fileInputRef}
                        type='file'
                        multiple
                        accept='image/*'
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className='hidden' />

                    <div className='flex flex-col items-center gap-2'>
                        <Upload className='w-8 h-8 text-white/40' />
                        <p className='text-sm text-white/60'>
                            {images.length < 6 ? (
                                <>
                                    Drop Images here or{' '}
                                    <span className='text-blue-400'>browse</span>
                                    <br />
                                    <span className='text-xs text-white/40 mt-1 block'>
                                        {images.length}/6 images uploaded
                                    </span>
                                </>
                            ) : (
                                'Maximum 6 images reached'
                            )}
                        </p>
                    </div>
                </div>
            </div>
            {images.length > 0 && (
                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <Label className='text-white/80 text-sm'>
                            Uploaded Images ({images.length})
                        </Label>
                        <Button variant='ghost' size='sm' onClick={clearAllImages} className='h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10'>
                            <Trash2 className='w-3 h-3 mr-1' />
                            Clear All
                        </Button>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        {images.map((image) => (
                            <div key={image.id} className='relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5'>
                                <Image src={image.preview || image.url || ''} alt='inspiration' className='w-full h-full object-cover' width={100} height={100} unoptimized />
                                {image.uploading && (
                                    <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                                        <Loader2 className='w-6 h-6 animate-spin text-white' />
                                    </div>
                                )}
                                {image.error && (
                                    <div className='absolute inset-0 bg-red-500/20 flex items-center justify-center'>
                                        <p className='text-xs text-red-300 text-center px-2'>
                                            {image.error}
                                        </p>
                                    </div>
                                )}
                                <Button variant='ghost' size='sm' onClick={() => removeImage(image)} className='absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    <X className='w-3 h-3 text-white' />
                                </Button>
                                {image.uploaded && !image.uploading && (
                                    <div className='absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border border-white/20'>

                                    </div>
                                )}
                            </div>
                        ))}
                        {images.length < 6 && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className='aspect-square rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/20 transition-all duration-200 group'
                            >
                                <Plus className='w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors' />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default InspirationSidebar
