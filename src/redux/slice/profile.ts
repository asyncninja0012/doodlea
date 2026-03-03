import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ProfileState {
  id: string | null
  name: string | null
  email: string | null
  image: string | null
  slug: string | null
  hasSubscription: boolean
  credits: number
  plan: string | null
  createdAt: string | null
}

const initialState: ProfileState = {
  id: null,
  name: null,
  email: null,
  image: null,
  slug: null,
  hasSubscription: false,
  credits: 0,
  plan: null,
  createdAt: null,
}

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile(_state, action: PayloadAction<ProfileState>) {
      return action.payload
    },
    updateCredits(state, action: PayloadAction<number>) {
      state.credits = action.payload
    },
    clearProfile() {
      return initialState
    },
  },
})

export const { setProfile, updateCredits, clearProfile } = profileSlice.actions
export default profileSlice.reducer
