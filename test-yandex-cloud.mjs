import fs from 'fs';
import jwt from 'jsonwebtoken';

async function testConnection() {
    try {
        console.log("Loading authorized_key.json...");
        const keyData = JSON.parse(fs.readFileSync('./authorized_key.json', 'utf8'));

        console.log("Generating JWT...");
        const payload = {
            iss: keyData.service_account_id,
            aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
        };

        const token = jwt.sign(payload, keyData.private_key, {
            algorithm: 'PS256',
            keyid: keyData.id
        });

        console.log("Requesting IAM token...");
        const res = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jwt: token })
        });

        const json = await res.json();
        if (!json.iamToken) {
            console.error("Failed to get IAM token:", JSON.stringify(json, null, 2));
            process.exit(1);
        }

        console.log("Successfully obtained IAM token!");
        const iamToken = json.iamToken;

        const FOLDER_ID = 'b1gq2s47f6s25vsqrfce';
        console.log(`\nFetching details for Folder ID: ${FOLDER_ID}`);

        const folderRes = await fetch(`https://resource-manager.api.cloud.yandex.net/resource-manager/v1/folders/${FOLDER_ID}`, {
            headers: { 'Authorization': `Bearer ${iamToken}` }
        });

        const folderJson = await folderRes.json();

        if (folderRes.ok) {
            console.log("\n✅ Connection Successful! Folder Details:");
            console.log(JSON.stringify(folderJson, null, 2));
        } else {
            console.error("\n❌ API Request Failed:");
            console.error(JSON.stringify(folderJson, null, 2));
        }

    } catch (e) {
        console.error("Exception occurred:", e);
    }
}

testConnection();
