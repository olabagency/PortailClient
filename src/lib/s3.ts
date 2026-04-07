import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3 = new S3Client({
  region: process.env.S3_REGION!,
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

export const BUCKET = process.env.S3_BUCKET_NAME!

export async function generatePresignedUploadUrl(key: string, contentType: string, expiresIn = 300) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  return getSignedUrl(s3, command, { expiresIn })
}

export async function generatePresignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

export async function deleteS3Object(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
