const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../public/images/moon');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Background dark disk to guarantee visibility on both light and dark themes
const bgDisk = '<circle cx="256" cy="256" r="240" fill="#0B0F19" stroke="#1F2937" stroke-width="12" />';

// Faint background sphere (the unlit part of the moon)
const unlitSphere = '<circle cx="256" cy="256" r="180" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="4" />';

const phases = {
    new_moon: '',
    waxing_crescent: '<path d="M 256,76 A 180,180 0 0,1 256,436 A 135,180 0 0,0 256,76 Z" fill="#FFFFFF" />',
    first_quarter: '<path d="M 256,76 A 180,180 0 0,1 256,436 Z" fill="#FFFFFF" />',
    waxing_gibbous: '<path d="M 256,76 A 180,180 0 0,1 256,436 A 135,180 0 0,1 256,76 Z" fill="#FFFFFF" />',
    full_moon: '<circle cx="256" cy="256" r="180" fill="#FFFFFF" />',
    waning_gibbous: '<path d="M 256,76 A 180,180 0 0,0 256,436 A 135,180 0 0,0 256,76 Z" fill="#FFFFFF" />',
    last_quarter: '<path d="M 256,76 A 180,180 0 0,0 256,436 Z" fill="#FFFFFF" />',
    waning_crescent: '<path d="M 256,76 A 180,180 0 0,0 256,436 A 135,180 0 0,1 256,76 Z" fill="#FFFFFF" />'
};

async function generate() {
    console.log('Generating schematic moon icons...');
    for (const [name, pathMarkup] of Object.entries(phases)) {
        const svg = `
            <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                ${bgDisk}
                ${unlitSphere}
                ${pathMarkup}
            </svg>
        `;
        
        const outputPath = path.join(targetDir, `${name}.png`);
        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);
        
        console.log(`Generated ${name}.png (${fs.statSync(outputPath).size} bytes)`);
    }
    console.log('All icons generated successfully!');
}

generate().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
