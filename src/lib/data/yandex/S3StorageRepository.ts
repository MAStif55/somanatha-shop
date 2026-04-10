import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageRepository } from '../interfaces';

// ============================================================================
// YANDEX OBJECT STORAGE (S3-COMPATIBLE)
// ============================================================================

const BUCKET_NAME = process.env.YC_S3_BUCKET || 'somanatha-media';
const REGION = process.env.YC_S3_REGION || 'ru-central1';
const ENDPOINT = process.env.YC_S3_ENDPOINT || 'https://storage.yandexcloud.net';

const s3Client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
        accessKeyId: process.env.YC_S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.YC_S3_SECRET_ACCESS_KEY || '',
    },
});

export class S3StorageRepository implements IStorageRepository {

    async uploadFile(path: string, file: File | Blob): Promise<string> {
        const buffer = Buffer.from(await file.arrayBuffer());

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: path,
            Body: buffer,
            ContentType: (file as File).type || 'application/octet-stream',
        }));

        // Return the public URL for the uploaded file
        return `${ENDPOINT}/${BUCKET_NAME}/${path}`;
    }

    async deleteFile(urlOrPath: string): Promise<void> {
        try {
            // Extract the key from a full URL or use the path directly
            let key = urlOrPath;
            if (urlOrPath.startsWith('http')) {
                const url = new URL(urlOrPath);
                // Handle both path-style and vhost-style URLs
                key = url.pathname.startsWith(`/${BUCKET_NAME}/`)
                    ? url.pathname.slice(`/${BUCKET_NAME}/`.length)
                    : url.pathname.slice(1);
            }

            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            }));
        } catch (error) {
            console.error('Error deleting file from S3:', error);
            throw error;
        }
    }
}
