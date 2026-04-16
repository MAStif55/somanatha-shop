const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY.trim(),
    secretAccessKey: process.env.YANDEX_S3_SECRET_KEY.trim(),
  },
});

async function main() {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: 'levprav-media' }));
    console.log('Bucket created successfully!');
  } catch (err) {
    if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
        console.log('Bucket already exists.');
    } else {
        console.error(err);
    }
  }
}
main();
