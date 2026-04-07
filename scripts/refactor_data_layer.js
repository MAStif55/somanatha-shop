const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src');

const MAP = {
  'getAllProducts': 'ProductRepository.getAll',
  'getNewestProducts': 'ProductRepository.getNewest',
  'getProductsByCategory': 'ProductRepository.getByCategory',
  'getProductBySlug': 'ProductRepository.getBySlug',
  'getProductById': 'ProductRepository.getById',
  'createProduct': 'ProductRepository.create',
  'updateProduct': 'ProductRepository.update',
  'deleteProduct': 'ProductRepository.delete',
  'bulkUpdateProductPrices': 'ProductRepository.bulkUpdatePrices',
  
  'getAllOrders': 'OrderRepository.getAll',
  'updateOrder': 'OrderRepository.update',
  'deleteOrder': 'OrderRepository.delete',
  
  'getSubcategories': 'CategoryRepository.getSubcategories',
  'createSubcategory': 'CategoryRepository.createSubcategory',
  'deleteSubcategory': 'CategoryRepository.deleteSubcategory',
  
  'getCategoryVariations': 'CategoryRepository.getVariations',
  'saveCategoryVariations': 'CategoryRepository.saveVariations',
  
  'getStoreSettings': 'SettingsRepository.getSettings',
  'updateStoreSettings': 'SettingsRepository.updateSettings'
};

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    });
}

function processFile(filePath) {
    if (filePath.includes('src/lib/data') || filePath.includes('src/lib/firestore-utils') || filePath.includes('src/lib/settings-service') || filePath.includes('src/lib/variations-service')) {
        return; // Skip the new layer and the legacy files we are going to delete
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Process imports
    const importRegex = /import\s*{([^}]+)}\s*from\s*['"]@\/lib\/(firestore-utils|settings-service|variations-service)['"];?/g;
    let match;
    let newReposNeeded = new Set();
    let fileContentWithoutOldImports = content;

    while ((match = importRegex.exec(content)) !== null) {
        hasChanges = true;
        const importedFns = match[1].split(',').map(s => s.trim()).filter(s => s);
        
        importedFns.forEach(fn => {
            if (MAP[fn]) {
                const repoName = MAP[fn].split('.')[0];
                newReposNeeded.add(repoName);
            }
        });
        
        fileContentWithoutOldImports = fileContentWithoutOldImports.replace(match[0], '');
    }

    if (hasChanges) {
        content = fileContentWithoutOldImports;

        // Add new import at the top
        if (newReposNeeded.size > 0) {
            const newImport = `import { ${Array.from(newReposNeeded).join(', ')} } from '@/lib/data';\n`;
            // Find a suitable place for import (after first other imports or at top)
            const firstImportMatch = content.match(/^import /m);
            if (firstImportMatch) {
               content = content.replace(firstImportMatch[0], newImport + firstImportMatch[0]);
            } else {
               content = newImport + content;
            }
        }
        
        // Replace usages
        Object.keys(MAP).forEach(oldFn => {
            const newFn = MAP[oldFn];
            // Replace word boundary oldFn with newFn
            const usageRegex = new RegExp(`\\b${oldFn}\\b`, 'g');
            content = content.replace(usageRegex, newFn);
        });

        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

processDirectory(directoryPath);
console.log('Done refactoring helper services.');
