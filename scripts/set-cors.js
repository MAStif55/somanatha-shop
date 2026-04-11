require('dotenv').config({ path: '.env.local' });
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function setCors() {
    const s3Client = new S3Client({
        region: 'ru-central1',
        endpoint: 'https://storage.yandexcloud.net',
        credentials: {
            accessKeyId: process.env.YC_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.YC_S3_SECRET_ACCESS_KEY,
        },
    });

    const command = new PutBucketCorsCommand({
        Bucket: 'somanatha-media',
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'HEAD'],
                    AllowedOrigins: ['*'],
                    ExposeHeaders: ['ETag'],
                    MaxAgeSeconds: 3000,
                },
            ],
        },
    });

    try {
        await s3Client.send(command);
        console.log('CORS rules applied successfully.');
    } catch (err) {
        console.error('Error applying CORS:', err);
    }
}

setCors();
