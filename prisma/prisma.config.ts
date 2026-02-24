// Prisma configuration for database connection
// Used by the Prisma Client at runtime

export default {
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_J8HrdNVLY5bD@ep-wispy-mode-a1ig5233-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  },
}
