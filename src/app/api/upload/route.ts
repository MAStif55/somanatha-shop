import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, fileType, tempId } = body;

        if (!fileName || !fileType) {
            return NextResponse.json({ success: false, error: 'fileName and fileType are required' }, { status: 400 });
        }

        // Generate unique name to prevent collisions
        const uuid = crypto.randomUUID();
        // Clean Cyrillic or space issues from fileName for the storage key
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Finalized orders have a 24-character hex ObjectId. Temporary ones have a random base-36 string.
        const isFinalOrder = tempId && /^[a-f\d]{24}$/i.test(tempId);
        const folder = isFinalOrder 
            ? `orders/${tempId}` 
            : (tempId ? `temp-uploads/${tempId}` : 'temp-uploads/temp');
            
        const s3Key = `${folder}/${uuid}-${safeName}`;

        // Prepare the PutObject command
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: fileType,
        });

        // Generate the presigned URL valid for 15 minutes (900 seconds)
        const uploadUrl = await getSignedUrl(s3Client as any, command as any, { expiresIn: 900 });
        const publicUrl = `${ENDPOINT}/${BUCKET_NAME}/${s3Key}`;

        return NextResponse.json({
            success: true,
            uploadUrl,
            publicUrl,
            s3Key,
        });
    } catch (error: any) {
        console.error('[API Upload] Error generating presigned URL:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
