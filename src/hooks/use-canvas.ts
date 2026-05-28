'use client'

import { addArrow, addEllipse, addFrame, addFreeDrawShape, addGeneratedUI, addLine, addRect, addText, clearSelection, deleteSelected, FrameShape, pasteShapes, removeShape, selectShape, setTool, Shape, Tool, updateShape } from "@/redux/slice/shapes"
import { handToolDisable, handToolEnable, panEnd, panMove, panStart, Point, screenToWorld, wheelPan, wheelZoom } from "@/redux/slice/viewport"
import { AppDispatch, useAppDispatch, useAppSelector } from "@/redux/store"
import { nanoid } from "@reduxjs/toolkit"
import { set } from "date-fns"
import { is } from "date-fns/locale"
import { get } from "http"
import { LucideAlignEndHorizontal } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { toast } from "sonner"

interface TouchPointer {
    id: number
    p: Point
}

interface DraftShape {
    type: 'frame' | 'rect' | 'ellipse' | 'arrow' | 'line'
    startWorld: Point
    currentWorld: Point
}

const RAF_INTERVAL_MS = 8

export const useInfiniteCanvas = () => {
    const dispatch = useDispatch<AppDispatch>()

    const viewport = useAppSelector((s) => s.viewport)
    const entityState = useAppSelector((s) => s.shapes.shapes)

    const shapeList: Shape[] = entityState.ids
        .map((id: string) => entityState.entities[id])
        .filter((s: Shape | undefined): s is Shape => Boolean(s))

    const currentTool = useAppSelector((s) => s.shapes.tool)
    const selectedShapes = useAppSelector((s) => s.shapes.selected)

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const shapeEntites = useAppSelector((state) => state.shapes.shapes.entities)

    const hasSelectedText = Object.keys(selectedShapes).some((id) => {
        const shape = shapeEntites[id]
        return shape?.type === 'text'
    })

    useEffect(() => {
        if (hasSelectedText && !isSidebarOpen) {
            setIsSidebarOpen(true)
        }

        else if (!hasSelectedText) {
            setIsSidebarOpen(false)
        }
    }, [hasSelectedText, isSidebarOpen])

    const canvasRef = useRef<HTMLDivElement | null>(null)
    const touchMapRef = useRef<Map<number, TouchPointer>>(new Map())

    const draftShapeRef = useRef<DraftShape | null>(null)
    const freeDrawPointsRef = useRef<Point[]>([])
    const isSpacePressed = useRef(false)
    const isDrawingRef = useRef(false)
    const isMovingRef = useRef(false)
    const moveStartRef = useRef<Point | null>(null)

    const initialShapePositionsRef = useRef<
        Record<
            string, {
                x?: number
                y?: number
                points?: Point[]
                startX?: number
                startY?: number
                endX?: number
                endY?: number
            }>
    >({})

    const isPanningRef = useRef(false)
    const isErasingRef = useRef(false)
    const erasedShapesRef = useRef<Set<string>>(new Set())
    const clipboardRef = useRef<Shape[]>([])
    const isResizingRef = useRef(false)
    const resizeDataRef = useRef<{
        shapeId: string
        corner: string
        initialBounds: { x: number; y: number; w: number; h: number }
        startPoint: { x: number; y: number }
        initialFontSize?: number
    } | null>(null)

    const lastFreehandFrameRef = useRef(0)
    const freehandRafRef = useRef<number | null>(null)
    const panRafRef = useRef<number | null>(null)
    const pendingPanPointRef = useRef<Point | null>(null)

    const [, force] = useState(0)

    const requestRender = (): void => {
        force((n) => n + 1 | 0)
    }

    const localPointFromClient = (clientX: number, clientY: number): Point => {
        const el = canvasRef.current
        if (!el) return { x: clientX, y: clientY }
        const r = el.getBoundingClientRect()
        return { x: clientX - r.left, y: clientY - r.top }
    }

    const blurActiveTextInput = () => {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName === 'INPUT') {
            ; (activeElement as HTMLInputElement).blur()
        }
    }

    type WithClientXY = { clientX: number; clientY: number }

    const getLocalPoint = (e: WithClientXY): Point => localPointFromClient(e.clientX, e.clientY)

    const getShapeAtPoint = (worldPoint: Point): Shape | null => {
        for (let i = shapeList.length - 1; i >= 0; i--) {
            const shape = shapeList[i];
            if (isPointInShape(worldPoint, shape)) {
                return shape

            }
        }

        return null
    }

    const isPointInShape = (point: Point, shape: Shape): boolean => {
        switch (shape.type) {
            case 'frame':
            case 'rect':
            case 'ellipse':
            case 'generatedui':

                return (
                    point.x >= shape.x &&
                    point.x <= shape.x + shape.w &&
                    point.y >= shape.y &&
                    point.y <= shape.y + shape.h
                )

            case 'freedraw':
                const threshold = 5
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i];
                    const p2 = shape.points[i + 1];

                    if (distanceToLineSegment(point, p1, p2) <= threshold) {
                        return true;
                    }
                }

                return false
            case 'arrow':
            case 'line':
                const lineThreshold = 8;
                return (
                    distanceToLineSegment(
                        point,
                        { x: shape.startX, y: shape.startY },
                        { x: shape.endX, y: shape.endY },
                    ) <= lineThreshold
                )

            case 'text':
                if ('text' in shape && 'fontSize' in shape && 'x' in shape && 'y' in shape) {
                    const textWidth = Math.max(
                        shape.text.length * (shape.fontSize * 0.6),
                        100
                    )

                    const textHeight = shape.fontSize * 1.2
                    const padding = 8;

                    return (
                        point.x >= shape.x - 2 &&
                        point.x <= shape.x + textWidth + padding + 2 &&
                        point.y >= shape.y &&
                        point.y <= shape.y + textHeight + padding + 2
                    )
                }


            default:
                return false
        }

    }

    const distanceToLineSegment = (
        point: Point,
        lineStart: Point,
        lineEnd: Point
    ): number => {
        const A = point.x - lineStart.x
        const B = point.y - lineStart.y
        const C = lineEnd.x - lineStart.x
        const D = lineEnd.y - lineStart.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1
        if (lenSq !== 0) {
            param = dot / lenSq
        }

        let xx, yy
        if (param < 0) {
            xx = lineStart.x
            yy = lineStart.y

        } else if (param > 1) {
            xx = lineEnd.x
            yy = lineEnd.y
        } else {
            xx = lineStart.x + param * C
            yy = lineStart.y + param * D
        }

        const dx = point.x - xx
        const dy = point.y - yy

        return Math.sqrt(dx * dx + dy * dy)
    }


    const schdeulePanMove = (p: Point) => {
        pendingPanPointRef.current = p
        if (panRafRef.current === null) {
            panRafRef.current = window.requestAnimationFrame(() => {
                panRafRef.current = null
                const next = pendingPanPointRef.current

                if (next) dispatch(panMove(next))
            })
        }

    }

    const freeHandTick = (): void => {
        const now = performance.now()

        if (now - lastFreehandFrameRef.current >= RAF_INTERVAL_MS) {
            if (freeDrawPointsRef.current.length > 0) requestRender()
            lastFreehandFrameRef.current = now

        }

        if (isDrawingRef.current) {
            freehandRafRef.current = window.requestAnimationFrame(freeHandTick)
        }
    }


    const onWheel = (e: WheelEvent) => {

        e.preventDefault()
        const originScreen = localPointFromClient(e.clientX, e.clientY)

        if (e.ctrlKey || e.metaKey) {
            dispatch(wheelZoom({ deltaY: e.deltaY, originScreen }))
        } else {
            const dx = e.shiftKey ? e.deltaY : e.deltaX
            const dy = e.shiftKey ? 0 : e.deltaY
            dispatch(wheelPan({ dx: -dx, dy: -dy }))
        }

    }

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement
        const isButton = target.tagName === 'BUTTON' || target.closest('button') || target.classList.contains('pointer-events-auto') || target.closest('.pointer-events-auto')

        if (!isButton) {
            e.preventDefault()
        } else {
            console.log('Not preventing default, clicked on interactive element')
            return
        }

        const local = getLocalPoint(e)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if (touchMapRef.current.size <= 1) {
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton = e.button === 1 || e.button === 2

            if (isPanButton) {
                isPanningRef.current = true
                dispatch(panStart({ screen: local, mode: 'panning' }))
                return
            }

            if (e.button === 0) {
                if (currentTool === 'select') {
                    const hitShape = getShapeAtPoint(world)
                    if (hitShape) {
                        const isAlreadySelected = selectedShapes[hitShape.id]
                        if (!isAlreadySelected) {
                            if (!e.shiftKey) {
                                dispatch(clearSelection())
                            }
                            dispatch(selectShape(hitShape.id))
                        }

                        isMovingRef.current = true
                        moveStartRef.current = world

                        initialShapePositionsRef.current = {}
                        Object.keys(selectedShapes).forEach((id) => {
                            const shape = entityState.entities[id]
                            if (shape) {
                                if (
                                    shape.type === 'frame' ||
                                    shape.type === 'rect' ||
                                    shape.type === 'ellipse' ||
                                    shape.type === 'generatedui'
                                ) {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y,
                                    }
                                } else if (
                                    shape.type === 'freedraw'
                                ) {
                                    initialShapePositionsRef.current[id] = {
                                        points: [...shape.points]
                                    }
                                } else if (shape.type === 'arrow' || shape.type === 'line') {
                                    initialShapePositionsRef.current[id] = {
                                        startX: shape.startX,
                                        startY: shape.startY,
                                        endX: shape.endX,
                                        endY: shape.endY,
                                    }
                                } else if (shape.type === 'text') {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y,
                                    }
                                }

                            }
                        })

                        if (hitShape.type === 'frame' ||
                            hitShape.type === 'rect' ||
                            hitShape.type === 'ellipse' ||
                            hitShape.type === 'generatedui'
                        ) {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y,
                            }
                        } else if (hitShape.type === 'freedraw') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                points: [...hitShape.points]
                            }
                        } else if (hitShape.type === 'arrow' || hitShape.type === 'line') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                startX: hitShape.startX,
                                startY: hitShape.startY,
                                endX: hitShape.endX,
                                endY: hitShape.endY,
                            }
                        } else if (hitShape.type === 'text') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y,
                            }

                        }

                    } else {
                        if (!e.shiftKey) {
                            dispatch(clearSelection())
                            blurActiveTextInput()
                        }
                        // Pan when dragging on empty canvas with select tool
                        isPanningRef.current = true
                        dispatch(panStart({ screen: local, mode: 'panning' }))
                    }
                } else if (currentTool === 'eraser') {
                    isErasingRef.current = true
                    erasedShapesRef.current.clear()
                    const hitShape = getShapeAtPoint(world)

                    if (hitShape) {
                        dispatch(removeShape(hitShape.id))
                        erasedShapesRef.current.add(hitShape.id)
                    } else {
                        blurActiveTextInput()
                    }
                } else if (currentTool === 'text') {
                    dispatch(addText({ x: world.x, y: world.y }))
                    dispatch(setTool('select'))
                } else {
                    isDrawingRef.current = true
                    if (
                        currentTool === 'frame' ||
                        currentTool === 'rect' ||
                        currentTool === 'ellipse' ||
                        currentTool === 'arrow' ||
                        currentTool === 'line'
                    ) {
                        console.log('Starting to draw shape:', currentTool, 'at', world)
                        draftShapeRef.current = {
                            type: currentTool,
                            startWorld: world,
                            currentWorld: world,
                        }
                        requestRender()
                    } else if (currentTool === 'freedraw') {
                        freeDrawPointsRef.current = [world]
                        lastFreehandFrameRef.current = performance.now()
                        freehandRafRef.current = window.requestAnimationFrame(freeHandTick)
                        requestRender()
                    }
                }
            }
        }
    }

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const local = getLocalPoint(e)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if (isPanningRef.current) {
            schdeulePanMove(local)
            return
        }

        if (isErasingRef.current && currentTool === 'eraser') {
            const hitShape = getShapeAtPoint(world)
            if (hitShape && !erasedShapesRef.current.has(hitShape.id)) {
                dispatch(removeShape(hitShape.id))
                erasedShapesRef.current.add(hitShape.id)
            }
        }

        if (
            isMovingRef.current && moveStartRef.current && currentTool === 'select'
        ) {
            const deltaX = world.x - moveStartRef.current.x
            const deltaY = world.y - moveStartRef.current.y

            Object.keys(initialShapePositionsRef.current).forEach((id) => {
                const initialPos = initialShapePositionsRef.current[id]
                const shape = entityState.entities[id]

                if (shape && initialPos) {
                    if (
                        shape.type === 'frame' ||
                        shape.type === 'rect' ||
                        shape.type === 'ellipse' ||
                        shape.type === 'generatedui' ||
                        shape.type === 'text'
                    ) {
                        if (
                            typeof initialPos.x === 'number' &&
                            typeof initialPos.y === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        x: initialPos.x + deltaX,
                                        y: initialPos.y + deltaY,
                                    },
                                })
                            )
                        }
                    }

                    else if (shape.type === 'freedraw') {
                        const initialPoints = initialPos.points
                        if (initialPoints) {
                            const newPoints = initialPoints.map((point) => ({
                                x: point.x + deltaX,
                                y: point.y + deltaY,
                            }))
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        points: newPoints,
                                    },
                                })
                            )
                        }

                    } else if (shape.type === 'arrow' || shape.type === 'line') {
                        if (
                            typeof initialPos.startX === 'number' &&
                            typeof initialPos.startY === 'number' &&
                            typeof initialPos.endX === 'number' &&
                            typeof initialPos.endY === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        startX: initialPos.startX + deltaX,
                                        startY: initialPos.startY + deltaY,
                                        endX: initialPos.endX + deltaX,
                                        endY: initialPos.endY + deltaY,
                                    }
                                })
                            )
                        }
                    }
                }
            })
        }

        if (isDrawingRef.current) {
            if (draftShapeRef.current) {
                draftShapeRef.current.currentWorld = world
                requestRender()
            } else if (currentTool === 'freedraw') {
                freeDrawPointsRef.current.push(world)
            }
        }

    }

    const finalizeDrawingIfAny = (): void => {
        if (!isDrawingRef.current) return
        isDrawingRef.current = false

        if (freehandRafRef.current) {
            window.cancelAnimationFrame(freehandRafRef.current)
            freehandRafRef.current = null
        }

        const draft = draftShapeRef.current
        if (draft) {
            const x = Math.min(draft.startWorld.x, draft.currentWorld.x)
            const y = Math.min(draft.startWorld.y, draft.currentWorld.y)
            const w = Math.abs(draft.currentWorld.x - draft.startWorld.x)
            const h = Math.abs(draft.currentWorld.y - draft.startWorld.y)

            if (w > 1 && h > 1) {
                if (draft.type === 'frame') {
                    console.log('Finalizing frame at', { x, y, w, h })
                    dispatch(addFrame({ x, y, w, h }))
                } else if (draft.type === 'rect') {
                    dispatch(addRect({ x, y, w, h }))
                } else if (draft.type === 'ellipse') {
                    dispatch(addEllipse({ x, y, w, h }))
                } else if (draft.type === 'arrow') {
                    dispatch(addArrow({
                        startX: draft.startWorld.x,
                        startY: draft.startWorld.y,
                        endX: draft.currentWorld.x,
                        endY: draft.currentWorld.y,
                    }))
                } else if (draft.type === 'line') {
                    dispatch(addLine({
                        startX: draft.startWorld.x,
                        startY: draft.startWorld.y,
                        endX: draft.currentWorld.x,
                        endY: draft.currentWorld.y,
                    }))
                }
            }
            draftShapeRef.current = null
        } else if (currentTool === 'freedraw') {
            const pts = freeDrawPointsRef.current
            if (pts.length > 1) {
                dispatch(addFreeDrawShape({ points: pts }))
            }
            freeDrawPointsRef.current = []
        }

        requestRender()

    }

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        canvasRef.current?.releasePointerCapture?.(e.pointerId)

        if (isPanningRef.current) {
            isPanningRef.current = false
            dispatch(panEnd());
        }

        if (isMovingRef.current) {
            isMovingRef.current = false
            moveStartRef.current = null
            initialShapePositionsRef.current = {}
        }

        if (isErasingRef.current) {
            isErasingRef.current = false
            erasedShapesRef.current.clear()
        }

        finalizeDrawingIfAny()
    }

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        onPointerUp(e)
    }

    // Use refs so the keyboard handler always has fresh state without re-registering the listener
    const selectedShapesRef = useRef(selectedShapes)
    selectedShapesRef.current = selectedShapes
    const entityStateRef = useRef(entityState)
    entityStateRef.current = entityState
    const dispatchRef = useRef(dispatch)
    dispatchRef.current = dispatch

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent): void => {
            // Don't handle shortcuts when user is typing in an input/textarea
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const currentSelected = selectedShapesRef.current
            const currentEntities = entityStateRef.current
            const d = dispatchRef.current

            // Delete / Backspace - delete selected shapes
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selectedIds = Object.keys(currentSelected)
                if (selectedIds.length > 0) {
                    e.preventDefault()
                    d(deleteSelected())
                }
            }

            // Ctrl+C / Cmd+C - copy selected shapes
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const selectedIds = Object.keys(currentSelected)
                if (selectedIds.length > 0) {
                    e.preventDefault()
                    const shapesToCopy = selectedIds
                        .map(id => currentEntities.entities[id])
                        .filter((s): s is Shape => s !== undefined)
                    clipboardRef.current = shapesToCopy
                }
            }

            // Ctrl+V / Cmd+V - paste copied shapes
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (clipboardRef.current.length > 0) {
                    e.preventDefault()
                    const PASTE_OFFSET = 20
                    const pastedShapes: Shape[] = clipboardRef.current.map(shape => {
                        const newId = nanoid()
                        switch (shape.type) {
                            case 'frame':
                            case 'rect':
                            case 'ellipse':
                            case 'generatedui':
                                return { ...shape, id: newId, x: shape.x + PASTE_OFFSET, y: shape.y + PASTE_OFFSET }
                            case 'text':
                                return { ...shape, id: newId, x: shape.x + PASTE_OFFSET, y: shape.y + PASTE_OFFSET }
                            case 'freedraw':
                                return {
                                    ...shape,
                                    id: newId,
                                    points: shape.points.map(p => ({ x: p.x + PASTE_OFFSET, y: p.y + PASTE_OFFSET }))
                                }
                            case 'arrow':
                            case 'line':
                                return {
                                    ...shape,
                                    id: newId,
                                    startX: shape.startX + PASTE_OFFSET,
                                    startY: shape.startY + PASTE_OFFSET,
                                    endX: shape.endX + PASTE_OFFSET,
                                    endY: shape.endY + PASTE_OFFSET,
                                }
                        }
                    }) as Shape[]
                    d(pasteShapes(pastedShapes))
                    // Update clipboard to new positions so successive pastes cascade
                    clipboardRef.current = pastedShapes
                }
            }
        }

        const onKeyUp = (e: KeyboardEvent): void => {
            // reserved for future shortcuts
        }

        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('keyup', onKeyUp)
            if (freehandRafRef.current) {
                window.cancelAnimationFrame(freehandRafRef.current)
            }
            if (panRafRef.current) {
                window.cancelAnimationFrame(panRafRef.current)
            }
        }
    }, [])

    useEffect(() => {
        const handleResizeStart = (e: CustomEvent) => {
            const { shapeId, corner, bounds } = e.detail
            isResizingRef.current = true
            const shape = entityState.entities[shapeId]
            resizeDataRef.current = {
                shapeId,
                corner,
                initialBounds: bounds,
                startPoint: { x: e.detail.clientX || 0, y: e.detail.clientY || 0 },
                initialFontSize: shape?.type === 'text' ? shape.fontSize : undefined,
            }
        }

        const handleResizeMove = (e: CustomEvent) => {
            if (!isResizingRef.current || !resizeDataRef.current) return
            const { shapeId, corner, initialBounds } = resizeDataRef.current
            const { clientX, clientY } = e.detail

            const canvasEl = canvasRef.current
            if (!canvasEl) return

            const rect = canvasEl.getBoundingClientRect()
            const localX = clientX - rect.left
            const localY = clientY - rect.top
            const world = screenToWorld(
                { x: localX, y: localY },
                viewport.translate,
                viewport.scale
            )

            const shape = entityState.entities[shapeId]
            if (!shape) return

            const newBounds = { ...initialBounds }
            switch (corner) {
                case 'nw':
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.x = world.x
                    newBounds.y = world.y
                    break
                case 'ne':
                    newBounds.w = Math.max(
                        10,
                        world.x - initialBounds.x
                    )
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.y = world.y
                    break
                case 'sw':
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.h = Math.max(
                        10,
                        world.y - initialBounds.y
                    )
                    newBounds.x = world.x
                    break
                case 'se':
                    newBounds.w = Math.max(
                        10,
                        world.x - initialBounds.x
                    )
                    newBounds.h = Math.max(
                        10,
                        world.y - initialBounds.y
                    )
                    break
            }

            if (
                shape.type === 'frame' ||
                shape.type === 'rect' ||
                shape.type === 'ellipse'
            ) {
                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            x: newBounds.x,
                            y: newBounds.y,
                            w: newBounds.w,
                            h: newBounds.h,
                        },
                    })
                )
            } else if (shape.type === 'freedraw') {
                const xs = shape.points.map((p: { x: number; y: number }) => p.x)
                const ys = shape.points.map((p: { x: number; y: number }) => p.y)
                const actualMinX = Math.min(...xs)
                const actualMaxX = Math.max(...xs)
                const actualMinY = Math.min(...ys)
                const actualMaxY = Math.max(...ys)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10)
                const newActualHeight = Math.max(10, newBounds.h - 10)

                const scaleX = actualWidth > 0 ? newActualWidth / actualWidth : 1
                const scaleY = actualHeight > 0 ? newActualHeight / actualHeight : 1

                const scalePoints = shape.points.map(
                    (point: { x: number; y: number }) => ({
                        x: newActualX + (point.x - actualMinX) * scaleX,
                        y: newActualY + (point.y - actualMinY) * scaleY,
                    })
                )

                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            points: scalePoints,
                        },
                    })
                )
            } else if (shape.type === 'arrow' || shape.type === 'line') {
                const actualMinX = Math.min(shape.startX, shape.startY)
                const actualMaxX = Math.max(shape.startX, shape.startY)
                const actualMinY = Math.min(shape.startY, shape.endY)
                const actualMaxY = Math.max(shape.startY, shape.endY)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10)
                const newActualHeight = Math.max(10, newBounds.h - 10)

                let newStartX, newStartY, newEndX, newEndY
                if (actualWidth === 0) {
                    newStartX = newActualX + newActualWidth / 2
                    newEndX = newActualX + newActualWidth / 2
                    newStartY = shape.startY < shape.endY ? newActualY : newActualY + newActualHeight
                    newEndY = shape.startY < shape.endY ? newActualY + newActualHeight : newActualY
                } else if (actualHeight === 0) {
                    newStartY = newActualY + newActualHeight / 2
                    newEndY = newActualY + newActualHeight / 2
                    newStartX = shape.startX < shape.endX ? newActualX : newActualX + newActualWidth
                    newEndX = shape.startX < shape.endX ? newActualX + newActualWidth : newActualX
                } else {
                    const scaleX = actualWidth / actualWidth
                    const scaleY = newActualHeight / actualHeight

                    newStartX = newActualX + (shape.startX - actualMinX) * scaleX
                    newStartY = newActualY + (shape.startY - actualMinY) * scaleY
                    newEndX = newActualX + (shape.endX - actualMinX) * scaleX
                    newEndY = newActualY + (shape.endY - actualMinY) * scaleY

                }

                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            startX: newStartX,
                            startY: newStartY,
                            endX: newEndX,
                            endY: newEndY,
                        },
                    })
                )
            } else if (shape.type === 'text') {
                // For text, resize like a rectangle but also scale fontSize proportionally
                const origFontSize = resizeDataRef.current?.initialFontSize ?? shape.fontSize
                const scaleY = newBounds.h / initialBounds.h
                const newFontSize = Math.max(8, Math.round(origFontSize * scaleY))
                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            x: newBounds.x + 2,
                            y: newBounds.y + 2,
                            fontSize: newFontSize,
                        },
                    })
                )
            }
        }

        const handleResizeEnd = () => {
            isResizingRef.current = false
            resizeDataRef.current = null
        }

        window.addEventListener('shape-resize-start', handleResizeStart as EventListener)
        window.addEventListener('shape-resize-move', handleResizeMove as EventListener)
        window.addEventListener('shape-resize-end', handleResizeEnd as EventListener)

        return () => {
            window.removeEventListener('shape-resize-start', handleResizeStart as EventListener)
            window.removeEventListener('shape-resize-move', handleResizeMove as EventListener)
            window.removeEventListener('shape-resize-end', handleResizeEnd as EventListener)
        }
    }, [
        dispatch,
        entityState.entities,
        viewport.translate,
        viewport.scale,
    ])

    const attachCanvasRef = (ref: HTMLDivElement | null) => {
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('wheel', onWheel)
        }

        canvasRef.current = ref

        if (ref) {
            ref.addEventListener('wheel', onWheel, { passive: false })
        }

    }

    const selectTool = (tool: Tool): void => {
        dispatch(setTool(tool))

    }

    const getDraftShape = (): DraftShape | null => draftShapeRef.current
    const getFreeDrawPoints = (): ReadonlyArray<Point> => freeDrawPointsRef.current


    return {
        viewport,
        shapes: shapeList,
        currentTool,
        selectedShapes,
        onPointerDown,
        onPointerUp,
        onPointerMove,
        onPointerCancel,
        attachCanvasRef,
        selectTool,
        getDraftShape,
        getFreeDrawPoints,
        isSidebarOpen,
        hasSelectedText,
        setIsSidebarOpen,
    }


}
export const isShapeInsideFrame = (shape: Shape, frame: FrameShape): boolean => {
    const frameLeft = frame.x
    const frameRight = frame.x + frame.w
    const frameTop = frame.y
    const frameBottom = frame.y + frame.h

    switch (shape.type) {
        case 'rect':
        case 'ellipse':
        case 'frame':
            const centerX = shape.x + shape.w / 2
            const centerY = shape.y + shape.h / 2

            return (
                centerX >= frameLeft &&
                centerX <= frameRight &&
                centerY >= frameTop &&
                centerY <= frameBottom

            )
        case 'text':
            return (
                shape.x >= frameLeft &&
                shape.x <= frameRight &&
                shape.y >= frameTop &&
                shape.y <= frameBottom
            )
        case 'freedraw':
            return shape.points.some(
                (point) =>
                    point.x >= frameLeft &&
                    point.x <= frameRight &&
                    point.y >= frameTop &&
                    point.y <= frameBottom

            )
        case 'line':
        case 'arrow':
            const startInside = shape.startX >= frameLeft && shape.startX <= frameRight && shape.startY >= frameTop && shape.startY <= frameBottom
            const endInside = shape.endX >= frameLeft && shape.endX <= frameRight && shape.endY >= frameTop && shape.endY <= frameBottom
            return startInside || endInside
        default:
            return false
    }
}
export const getShapesInsideFrame = (shapes: Shape[], frame: FrameShape): Shape[] => {
    const shapesInFrame = shapes.filter((shape) => shape.id !== frame.id && isShapeInsideFrame(shape, frame))

    console.log(`Frame ${frame.frameNumber} capture:`, {
        totalShapes: shapes.length,
        captured: shapesInFrame.length,
        capturedTypes: shapesInFrame.map((s) => s.type),
    })

    return shapesInFrame
}

const renderShapeOnCanvas = (ctx: CanvasRenderingContext2D, shape: Shape, frameX: number, frameY: number) => {
    ctx.save()
    switch (shape.type) {
        case 'frame':
        case 'rect':
        case 'ellipse':
            const relativeX = shape.x - frameX
            const relativeY = shape.y - frameY

            if (shape.type === 'rect' || shape.type === 'frame') {
                ctx.strokeStyle = shape.stroke && shape.stroke !== 'transparent' ? shape.stroke : '#ffffff'
                ctx.lineWidth = shape.strokeWidth || 2

                const borderRadius = shape.type === 'rect' ? 8 : 0
                ctx.beginPath()
                ctx.roundRect(relativeX, relativeY, shape.w, shape.h, borderRadius)
                ctx.stroke()
            } else if (shape.type === 'ellipse') {
                ctx.strokeStyle = shape.stroke && shape.stroke !== 'transparent' ? shape.stroke : '#ffffff'
                ctx.lineWidth = shape.strokeWidth || 2
                ctx.beginPath()
                ctx.ellipse(
                    relativeX + shape.w / 2,
                    relativeY + shape.h / 2,
                    shape.w / 2,
                    shape.h / 2,
                    0,
                    0,
                    2 * Math.PI
                )
                ctx.stroke()

            }
            break

        case 'text':
            const textRelativeX = shape.x - frameX
            const textRelativeY = shape.y - frameY

            ctx.fillStyle = shape.fill || '#ffffff'
            ctx.font = `${shape.fontSize || 16}px ${shape.fontFamily || 'Excalifont'}`
            ctx.textBaseline = 'top'
            ctx.fillText(shape.text, textRelativeX, textRelativeY)
            break
        case 'freedraw':
            if (shape.points.length > 1) {
                ctx.strokeStyle = shape.stroke || "#ffffff"
                ctx.lineWidth = shape.strokeWidth || 2
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                ctx.beginPath()
                ctx.moveTo(shape.points[0].x - frameX, shape.points[0].y - frameY)

                for (let i = 1; i < shape.points.length; i++) {
                    const point = shape.points[i]
                    ctx.lineTo(point.x - frameX, point.y - frameY)
                }
                ctx.stroke()
            }
            break

        case 'line':
            ctx.strokeStyle = shape.stroke || '#ffffff'
            ctx.lineWidth = shape.strokeWidth || 2
            ctx.beginPath()
            ctx.moveTo(shape.startX - frameX, shape.startY - frameY)
            ctx.lineTo(shape.endX - frameX, shape.endY - frameY)
            ctx.stroke()
            break
        case 'arrow':
            ctx.strokeStyle = shape.stroke || '#ffffff'
            ctx.lineWidth = shape.strokeWidth || 2
            ctx.beginPath()
            ctx.moveTo(shape.startX - frameX, shape.startY - frameY)
            ctx.lineTo(shape.endX - frameX, shape.endY - frameY)
            ctx.stroke()


            const headLength = 10
            const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX)
            ctx.fillStyle = shape.stroke || '#ffffff'
            ctx.beginPath()
            ctx.moveTo(shape.endX - frameX, shape.endY - frameY)
            ctx.lineTo(
                shape.endX - frameX - headLength * Math.cos(angle - Math.PI / 6),
                shape.endY - frameY - headLength * Math.sin(angle - Math.PI / 6)

            )
            ctx.lineTo(
                shape.endX - frameX - headLength * Math.cos(angle + Math.PI / 6),
                shape.endY - frameY - headLength * Math.sin(angle + Math.PI / 6)
            )
            ctx.closePath()
            ctx.fill()
            break

    }
    ctx.restore()

}
const generateFrameSnapshot = async (frame: FrameShape, allShapes: Shape[]): Promise<Blob> => {
    const shapesInFrame = getShapesInsideFrame(allShapes, frame)
    const canvas = document.createElement('canvas')
    canvas.width = frame.w
    canvas.height = frame.h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.clip()

    shapesInFrame.forEach((shape) => {
        renderShapeOnCanvas(ctx, shape, frame.x, frame.y)
    })
    ctx.restore()
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
            } else {
                reject(new Error('Failed to generate frame snapshot'))
            }
        }, 'image/png', 1.0)
    })
}

export const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url;
    link.download = filename
    document.body.appendChild(link);
    link.click()
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

}

export const useFrame = (shape: FrameShape) => {
    const [isGenerating, setIsGenerating] = useState(false)
    const dispatch = useAppDispatch()

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.shapes?.entities || {}).filter((shape): shape is Shape => shape !== undefined))

    const handleGenerateDesign = async () => {
        try {
            setIsGenerating(true)
            const snapshot = await generateFrameSnapshot(shape, allShapes)
            downloadBlob(snapshot, `frame-${shape.frameNumber}-snapShot.png`)
            setIsGenerating(false)

            const formData = new FormData()
            formData.append('image', snapshot, `frame-${shape.frameNumber}-snapshot.png`)
            formData.append('frameNumber', shape.frameNumber.toString())

            const urlParams = new URLSearchParams(window.location.search)
            const projectId = urlParams.get('project')
            if (projectId) {
                formData.append('projectId', projectId)
            }

            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(
                    `API request failed ${response.status} ${response.statusText}-${errorText}`
                )
            }

            // Find any existing generated UIs for this frame to offset the new one
            const existingGeneratedUIs = allShapes.filter(
                (s) => s.type === 'generatedui' && (s as any).sourceFrameId === shape.id
            )
            
            const initialX = shape.x + shape.w + 50
            let rightmostX = initialX
            
            existingGeneratedUIs.forEach(ui => {
                const uiRightEdge = ui.x + ui.w + 50
                if (uiRightEdge > rightmostX) {
                    rightmostX = uiRightEdge
                }
            })

            const generatedUIPosition = {
                x: rightmostX,
                y: shape.y,
                w: Math.max(400, shape.w),
                h: Math.max(300, shape.h),
            }

            const generatedUIId = nanoid()
            dispatch(
                addGeneratedUI({
                    ...generatedUIPosition,
                    id: generatedUIId,
                    uiSpecData: null,
                    sourceFrameId: shape.id
                })
            )

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedMarkup = ''

            let lastUpdatedTime = 0
            const UPDATE_THROTTLE_MS = 200

            if (reader) {
                console.log('✅ Stream connected, waiting for chunks...')
                try {
                    let isFirstChunk = true
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) {
                            console.log('✅ Stream finished reading.')
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: { uiSpecData: accumulatedMarkup },
                                })
                            )
                            break
                        }
                        
                        if (isFirstChunk) {
                            console.log('✅ Received first chunk on frontend!')
                            isFirstChunk = false
                            window.dispatchEvent(new Event('credits-consumed'))
                        }
                        
                        const chunk = decoder.decode(value)
                        accumulatedMarkup += chunk

                        const now = Date.now()
                        if (now - lastUpdatedTime >= UPDATE_THROTTLE_MS) {
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: { uiSpecData: accumulatedMarkup },
                                })
                            )
                            lastUpdatedTime = now
                        }
                    }
                } catch (error) {
                    console.error('❌ Error reading stream on frontend:', error)
                } finally {
                    reader.releaseLock()
                }
            } else {
                console.error('❌ Response body does not have a reader')
            }


        } catch (error) {
            toast.error(`Failed to generate UI design ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setIsGenerating(false)
        }
    }

    return {
        isGenerating,
        handleGenerateDesign,
    }
}

export const useInspiration = () => {
    const [isInspirationOpen, setIsInspirationOpen] = useState(false)

    const toggleInspiration = () => {
        setIsInspirationOpen(!isInspirationOpen);
    }

    const openInspiration = () => {
        setIsInspirationOpen(true)
    }

    const closeInspiration = () => {
        setIsInspirationOpen(false)
    }

    return {
        isInspirationOpen,
        toggleInspiration,
        openInspiration,
        closeInspiration,
    }
}