import { defineConfig } from '@prisma/client'

export default defineConfig({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_J8HrdNVLY5bD@ep-wispy-mode-a1ig5233-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    },
  },
})
