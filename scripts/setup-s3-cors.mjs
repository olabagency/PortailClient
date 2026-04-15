/**
 * Configure le CORS du bucket Scaleway S3.
 * Lancer UNE SEULE FOIS : node scripts/setup-s3-cors.mjs
 */

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['http://localhost:3000', 'https://*.vercel.app', 'https://olab.agency'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3000,
    },
  ],
}

try {
  await s3.send(new PutBucketCorsCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    CORSConfiguration: corsConfig,
  }))
  console.log('✅ CORS configuré avec succès sur le bucket', process.env.S3_BUCKET_NAME)
} catch (err) {
  console.error('❌ Erreur :', err.message)
  if (err.message.includes('credentials')) {
    console.error('→ Vérifie S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY dans .env.local')
  }
}
