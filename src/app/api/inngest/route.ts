import { inngest } from '@/inngest/client'
import {
    autoSaveProjectWorkflow,
    handlePolarSubscriptionCreated,
    handlePolarSubscriptionUpdated,
    handlePolarSubscriptionRevoked,
    handlePolarSubscriptionActive,
    handlePolarSubscriptionCanceled,
    handlePolarOrderCreated,
} from '@/inngest/functions'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        autoSaveProjectWorkflow,
        handlePolarSubscriptionCreated,
        handlePolarSubscriptionUpdated,
        handlePolarSubscriptionRevoked,
        handlePolarSubscriptionActive,
        handlePolarSubscriptionCanceled,
        handlePolarOrderCreated,
    ]
})