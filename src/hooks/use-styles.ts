"use client"

import React, { RefObject, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useDispatch } from "react-redux"
import { AppDispatch, useAppDispatch, useAppSelector } from "@/redux/store"
import {
    seedMoodBoard,
    addMoodBoardImageLocal,
    updateMoodBoardImage,
    removeMoodBoardImageLocal,
} from "@/redux/slice/moodboard"
import { useGenerateStyleGuideMutation } from "@/redux/api/style-guide"
import { GeneratedUIShape, updateShape } from "@/redux/slice/shapes"

export interface MoodBoardImage {
    id: string
    preview: string
    storageId?: string
    uploaded: boolean
    uploading: boolean
    error?: string
    url?: string
    isFromServer?: boolean
}

export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
    const dispatch = useDispatch<AppDispatch>()
    const { projectId: reduxProjectId, images } = useAppSelector((s) => s.moodboard)
    const [dragActive, setDragActive] = React.useState(false)
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project') ?? ''
    // Pending files are kept outside Redux (File is non-serializable)
    const pendingFilesRef = useRef<Map<string, File>>(new Map())

    // Seed Redux from server data only when the project changes.
    // If we're returning to the same project, keep Redux state intact so that
    // images added/uploading since the last server fetch are not lost.
    useEffect(() => {
        if (reduxProjectId === projectId) {
            // Same project already loaded — just clean up any stuck "uploading" states
            // that can't be resumed (pendingFilesRef is empty on fresh mount).
            images.forEach((img: MoodBoardImage) => {
                if (
                    (img.uploading || (!img.uploaded && !img.error && !img.isFromServer)) &&
                    !pendingFilesRef.current.has(img.id)
                ) {
                    dispatch(updateMoodBoardImage({
                        id: img.id,
                        patch: { uploading: false, error: 'Upload interrupted — please remove and re-add' },
                    }))
                }
            })
            return
        }
        // Different project (or first load) — seed from server data
        dispatch(seedMoodBoard({ projectId, images: guideImages }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])

    // --- API helpers ---

    const generateUploadUrl = async (): Promise<string> => {
        const res = await fetch('/api/moodboard/generate-upload-url', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to generate upload URL')
        const { uploadUrl } = await res.json()
        return uploadUrl
    }

    const saveMoodBoardImage = async (pId: string, storageId: string, url: string) => {
        const res = await fetch('/api/moodboard/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: pId, storageId, url }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error ?? 'Failed to save mood board image')
        }
        return res.json() as Promise<{ success: boolean; imageCount: number }>
    }

    const deleteMoodBoardImage = async (pId: string, storageId: string) => {
        const res = await fetch('/api/moodboard/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: pId, storageId }),
        })
        if (!res.ok) throw new Error('Failed to remove mood board image')
        return res.json() as Promise<{ success: boolean; imageCount: number }>
    }

    // --- Image actions ---

    const addImage = (file: File) => {
        if (images.length >= 5) {
            toast.error('Maximum of 5 images allowed')
            return
        }
        const id = `${Date.now()}-${Math.random()}`
        pendingFilesRef.current.set(id, file)
        const newImage: MoodBoardImage = {
            id,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
            isFromServer: false,
        }
        dispatch(addMoodBoardImageLocal(newImage))
        toast.success('Image added to mood board')
    }

    const removeImage = async (imageId: string) => {
        const imageToRemove = images.find((img: MoodBoardImage) => img.id === imageId)
        if (!imageToRemove) return

        if (!imageToRemove.isFromServer && imageToRemove.preview.startsWith('blob:')) {
            URL.revokeObjectURL(imageToRemove.preview)
        }
        pendingFilesRef.current.delete(imageId)

        // Optimistic remove
        dispatch(removeMoodBoardImageLocal(imageId))
        toast.success('Image removed from mood board')

        if (imageToRemove.isFromServer && imageToRemove.storageId && projectId) {
            deleteMoodBoardImage(projectId, imageToRemove.storageId).catch((err) => {
                console.error(err)
                toast.error('Failed to remove image from server')
            })
        }
    }

    // Auto-upload pending images one at a time to avoid DB race conditions.
    // Each completed upload triggers an images state change which re-runs this
    // effect, picking up the next pending image.
    const uploadingRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        // Pick the first image that isn't already being uploaded
        const image = images.find(
            (img: MoodBoardImage) =>
                !img.uploaded && !img.uploading && !img.error && pendingFilesRef.current.has(img.id)
        )
        if (!image) return
        if (uploadingRef.current.has(image.id)) return

        uploadingRef.current.add(image.id)
        dispatch(updateMoodBoardImage({ id: image.id, patch: { uploading: true } }))

        const file = pendingFilesRef.current.get(image.id)!
            ; (async () => {
                try {
                    const uploadUrl = await generateUploadUrl()
                    const formData = new FormData()
                    formData.append('file', file)
                    const result = await fetch(uploadUrl, { method: 'POST', body: formData })
                    if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`)

                    const { storageId, url } = await result.json()

                    if (projectId) {
                        await saveMoodBoardImage(projectId, storageId, url)
                    }

                    pendingFilesRef.current.delete(image.id)
                    dispatch(updateMoodBoardImage({
                        id: image.id,
                        patch: { storageId, url, preview: url, uploaded: true, uploading: false, isFromServer: true },
                    }))
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Upload failed'
                    console.error(err)
                    toast.error(message)
                    dispatch(updateMoodBoardImage({ id: image.id, patch: { uploading: false, error: message } }))
                } finally {
                    uploadingRef.current.delete(image.id)
                }
            })()
        // images intentionally included to react to new pending entries
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images])

    // --- Drag & drop ---

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

        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) {
            toast.error('Please upload valid image files')
            return
        }

        const remaining = 5 - images.length
        const toAdd = files.slice(0, remaining)
        if (toAdd.length === 0) {
            toast.error('Maximum of 5 images allowed')
            return
        }

        toAdd.forEach((file) => addImage(file))
        if (toAdd.length > 1) toast.success(`${toAdd.length} images added to mood board`)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        Array.from(e.target.files || []).forEach((file) => addImage(file))
        e.target.value = ''
    }

    return {
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

export const useStyleGuide = (
    projectId: string,
    images: MoodBoardImage[],
    fileInputRef: RefObject<HTMLInputElement | null>
) => {
    const [generateStyleGuide, { isLoading: isGenerating }] = useGenerateStyleGuideMutation()
    const router = useRouter()
    const handleUploadClick = () => fileInputRef.current?.click()

    const handleGenerateStyleGuide = async () => {
        if (!projectId) {
            toast.error("Please complete the project setup before generating the style guide")
            return
        }
        if (images.length === 0) {
            toast.error("Please add images before generating the style guide")
            return
        }

        if (images.some((img) => img.uploading)) {
            toast.error('Please wait for all images to finish uploading')
            return
        }

        try {
            toast.loading('Analysing MoodBoard Images...', {
                id: 'style-guide-generation'
            })
            const result = await generateStyleGuide({ projectId }).unwrap()

            if (!result.success) {
                toast.error(result.message, { id: 'style-guide-generation' })
                return
            }
            window.dispatchEvent(new Event('credits-consumed'))
            router.refresh()
            toast.success('Style guide generated successfuly', { id: 'style-guide-generation' })

            setTimeout(() => {
                toast.success('Style guide generated! Switch to the Colours tab to see the results',
                    { duration: 5000 }
                )
            }, 1000)
        } catch (error: any) {
            const errorMessage = error?.data?.error || error?.error || error?.message || 'Failed to generate style guide'
            toast.error(errorMessage, { id: 'style-guide-generation' })
        }

    }

    return {
        handleGenerateStyleGuide,
        handleUploadClick,
        isGenerating,
    }
}

export const useUpdateContainer = (shape: GeneratedUIShape) => {
    const dispatch = useAppDispatch()
    const containerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (containerRef.current && shape.uiSpecData) {
            const timeOutId = setTimeout(() => {
                const actualHeight = containerRef.current?.offsetHeight || 0
                if (actualHeight > 0 && Math.abs(actualHeight - shape.h) > 10) {
                    dispatch(
                        updateShape({
                            id: shape.id,
                            patch: { h: actualHeight },
                        })
                    )
                }
            }, 100)
            return () => clearTimeout(timeOutId)
        }
    }, [shape.h, shape.uiSpecData, shape.id, dispatch])

    const sanitizeHtml = (html: string) => {
        const sanitized = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/data:/gi, '') // Remove data: protocols for safety

        return sanitized
    }

    return { containerRef, sanitizeHtml }
}