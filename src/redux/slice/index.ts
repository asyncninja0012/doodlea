import {Reducer} from '@reduxjs/toolkit'
import profileReducer from './profile'
import projects from './projects'
import shapes from './shapes'
import viewport from './viewport'

export const slices: Record<string, Reducer> = {
    profile: profileReducer,
    projects,
    shapes,
    viewport,
}