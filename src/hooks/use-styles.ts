"use client"

import { apiBaseUrl } from "next-auth/client/_utils"
import React, { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { add } from "date-fns"

export interface MoodBoardImage {
    id: string
    file?: File
    preview: string
    storageId?: string
    uploaded: boolean
    uploading: boolean
    error?: string
    url?: string
    isFromServer?: boolean
}

interface StylesFormData {
    images: MoodBoardImage[]
}

export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
    const [dragActive, setDragActive] = useState(false)
    const seededRef = useRef(false)
    const searchParams = useSearchParams()
    const ProjectId = searchParams.get('project')

    const form = useForm<StylesFormData>({
        defaultValues: {
            images: [],
        }
    })

    const { watch, setValue, getValues } = form
    const images = watch('images')

    const generateUploadUrl = async (): Promise<string> => {
        const res = await fetch('/api/moodboard/generate-upload-url', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to generate upload URL')
        const { uploadUrl } = await res.json()
        return uploadUrl
    }

    const removeMoodBoardImage = async (projectId: string, storageId: string) => {
        const res = await fetch('/api/moodboard/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, storageId }),
        })
        if (!res.ok) throw new Error('Failed to remove mood board image')
        return res.json() as Promise<{ success: boolean; imageCount: number }>
    }

    const addMoodBoardImage = async (projectId: string, storageId: string) => {
        const res = await fetch('/api/moodboard/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, storageId }),
        })
        if (!res.ok) throw new Error('Failed to add mood board image')
        return res.json() as Promise<{ success: boolean; imageCount: number }>
    }

    const uploadImage = async(file:File):Promise<{storageId: string; url?: string}> => {
        try{
            const uploadUrl = await generateUploadUrl()

            const formData = new FormData()
            formData.append('file', file)

            const result = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
            })

            if(!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            const {storageId, url} = await result.json()
            
            if(ProjectId){
                await addMoodBoardImage(ProjectId, storageId)
            }

            return {storageId, url}
            }catch(error) {
                console.error(error)
                throw error
            }

    }

    // Seed form state from server images only once on first mount.
    // After that the client state is the source of truth.
    useEffect(() => {
        if(seededRef.current) return
        if(guideImages && guideImages.length > 0) {
            const serverImages: MoodBoardImage[] = guideImages.map((img:any) => ({
                id: img.id,
                preview: img.url,
                storageId: img.storageId,
                uploaded: true,
                uploading: false,
                url: img.url,
                isFromServer: true,
            }))

            setValue('images', serverImages)
        }
        seededRef.current = true
    }, [guideImages, setValue])

    const addImage =  (file:File) => {
        if(images.length>=5){
            toast.error('Maximum of 5 images allowed')
            return
        }
        const newImage: MoodBoardImage = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
            isFromServer: false,
        }

        const updatedImages = [...images, newImage]

        setValue('images', updatedImages)
        
        toast.success('Image added to mood board')


    }

    const removeImage = async (imageId: string) => {
        const imageToRemove = images.find((img) => img.id === imageId)
        if(!imageToRemove) return

        // Optimistic: remove from UI instantly
        const updatedImages = images.filter((img) => {
            if(img.id === imageId) {
                if(!img.isFromServer && img.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(img.preview)
                }
                return false
            }
            return true
        })
        setValue('images', updatedImages)
        toast.success('Image removed from mood board')

        // Fire server deletion in background (don't block UI)
        if(imageToRemove.isFromServer && imageToRemove.storageId && ProjectId) {
            removeMoodBoardImage(ProjectId, imageToRemove.storageId).catch((error) => {
                console.error(error)
                toast.error('Failed to remove image from server')
            })
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if(e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        }else if(e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e:React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter((file) => file.type.startsWith('image/'))

        if(imageFiles.length === 0) {
            toast.error('Please upload valid image files')
            return
        }

        // Build all new images at once so we don't read stale `images` in a loop
        const currentImages = getValues('images')
        const remaining = 5 - currentImages.length
        const filesToAdd = imageFiles.slice(0, remaining)

        if(filesToAdd.length === 0) {
            toast.error('Maximum of 5 images allowed')
            return
        }

        const newImages: MoodBoardImage[] = filesToAdd.map((file) => ({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
            isFromServer: false,
        }))

        setValue('images', [...currentImages, ...newImages])
        toast.success(
            newImages.length === 1
                ? 'Image added to mood board'
                : `${newImages.length} images added to mood board`
        )
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach((file) => addImage(file))

        e.target.value = ''
    }

    useEffect(() => {
        const uploadPendingImages = async () => {
            const currentImage = getValues('images')    
            for(let i=0; i<currentImage.length; i++) {
                const image = currentImage[i]
                if(!image.uploaded && !image.uploading && !image.error) {
                    const updatedImages = [...currentImage]
                    updatedImages[i] = {...image, uploading: true}
                    setValue('images', updatedImages)

                    try{
                        const {storageId, url} = await uploadImage(image.file!)
                        const finalImages = getValues('images')

                        const finalIndex = finalImages.findIndex((img) => img.id === image.id)

                        if(finalIndex !== -1) {
                            finalImages[finalIndex] = {
                                ...finalImages[finalIndex],
                                storageId,
                                url,
                                uploaded: true,
                                uploading:false,
                                isFromServer: true,
                            }
                            setValue('images', [...finalImages])
                        }
                        
                        
                    }catch(error) {
                        console.error(error)
                        const errorImages = getValues('images')
                        const errorIndex = errorImages.findIndex((img) => img.id === image.id)

                        if(errorIndex !== -1) {
                            errorImages[errorIndex] = {
                                ...errorImages[errorIndex],
                                uploading: false,
                                error: 'Upload failed',
                            }
                            setValue('images', [...errorImages])
                        }
                    }

                }


            }
        }

        if(images.length>0){
            uploadPendingImages()
        }
    },[images, setValue, getValues])

    useEffect(() => {
        return () => {
            images.forEach((image) => {
                URL.revokeObjectURL(image.preview)
            })
        }
    },[])

    return {
        form,
        images,
        dragActive,
        addImage,
        removeImage,
        handleDrag,
        handleDrop,
        handleFileInput,
        canAddMore: images.length < 5,

    }
}