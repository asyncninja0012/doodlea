import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { MoodBoardImage } from '@/hooks/use-styles'

interface MoodBoardState {
    projectId: string | null
    images: MoodBoardImage[]
}

const initialState: MoodBoardState = {
    projectId: null,
    images: [],
}

const moodboardSlice = createSlice({
    name: 'moodboard',
    initialState,
    reducers: {
        seedMoodBoard(state, action: PayloadAction<{ projectId: string; images: MoodBoardImage[] }>) {
            state.projectId = action.payload.projectId
            state.images = action.payload.images
        },
        addMoodBoardImageLocal(state, action: PayloadAction<MoodBoardImage>) {
            if (state.images.length < 5) {
                state.images.push(action.payload)
            }
        },
        updateMoodBoardImage(state, action: PayloadAction<{ id: string; patch: Partial<MoodBoardImage> }>) {
            const index = state.images.findIndex((img) => img.id === action.payload.id)
            if (index !== -1) {
                state.images[index] = { ...state.images[index], ...action.payload.patch }
            }
        },
        removeMoodBoardImageLocal(state, action: PayloadAction<string>) {
            state.images = state.images.filter((img) => img.id !== action.payload)
        },
        clearMoodBoard(state) {
            state.projectId = null
            state.images = []
        },
    },
})

export const {
    seedMoodBoard,
    addMoodBoardImageLocal,
    updateMoodBoardImage,
    removeMoodBoardImageLocal,
    clearMoodBoard,
} = moodboardSlice.actions

export default moodboardSlice.reducer
