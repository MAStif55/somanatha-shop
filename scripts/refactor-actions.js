const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Map of Repository method calls to new Server Action imports
const actionMapping = {
  // ProductRepository
  'ProductRepository.getAll(': 'getAllProducts(',
  'ProductRepository.getById(': 'getProductById(',
  'ProductRepository.getBySlug(': 'getProductBySlug(',
  'ProductRepository.getByCategory(': 'getProductsByCategory(',
  'ProductRepository.getNewest(': 'getNewestProducts(',
  'ProductRepository.create(': 'createProduct(',
  'ProductRepository.update(': 'updateProduct(',
  'ProductRepository.delete(': 'deleteProduct(',
  'ProductRepository.bulkUpdatePrices(': 'bulkUpdatePrices(',

  // CategoryRepository
  'CategoryRepository.getSubcategories(': 'getSubcategories(',
  'CategoryRepository.createSubcategory(': 'createSubcategory(',
  'CategoryRepository.deleteSubcategory(': 'deleteSubcategory(',
  'CategoryRepository.getVariations(': 'getVariations(',
  'CategoryRepository.saveVariations(': 'saveVariations(',
  'CategoryRepository.getAllVariations(': 'getAllVariations(',

  // OrderRepository
  'OrderRepository.getAll(': 'getAllOrders(',
  'OrderRepository.getById(': 'getOrderById(',
  'OrderRepository.create(': 'createOrder(',
  'OrderRepository.update(': 'updateOrder(',
  'OrderRepository.delete(': 'deleteOrder(',

  // ReviewRepository
  'ReviewRepository.getAll(': 'getAllReviews(',
  'ReviewRepository.getLatest(': 'getLatestReviews(',
  'ReviewRepository.create(': 'createReview(',
  'ReviewRepository.update(': 'updateReview(',
  'ReviewRepository.delete(': 'deleteReview(',

  // SettingsRepository
  'SettingsRepository.getSettings(': 'getSettings(',
  'SettingsRepository.updateSettings(': 'updateSettings(',

  // FunctionsRepository
  'FunctionsRepository.triggerDeploy(': 'triggerDeploy(',
  'FunctionsRepository.triggerBackup(': 'triggerBackup(',

  // StorageRepository uses dynamic logic with FormData, so we replace differently or let manual handle.
};

const adminActions = [
  'getAllProducts', 'getProductById', 'createProduct', 'updateProduct', 'deleteProduct', 'bulkUpdatePrices',
  'getSubcategories', 'createSubcategory', 'deleteSubcategory', 'getVariations', 'saveVariations', 'getAllVariations',
  'getAllOrders', 'updateOrder', 'deleteOrder', 'getOrderById',
  'getAllReviews', 'createReview', 'updateReview', 'deleteReview',
  'getSettings', 'updateSettings', 'triggerDeploy', 'triggerBackup', 'uploadFile', 'deleteFile'
];

const catalogActions = [
  'getNewestProducts', 'getProductsByCategory', 'getProductBySlug', 'getLatestReviews', 'createOrder'
];

function getImportStatements(usedActions) {
  const adminSet = new Set();
  const catalogSet = new Set();

  usedActions.forEach(action => {
    if (adminActions.includes(action)) adminSet.add(action);
    if (catalogActions.includes(action)) catalogSet.add(action);
  });

  let imports = '';
  if (adminSet.size > 0) {
    imports += `import { ${Array.from(adminSet).join(', ')} } from '@/actions/admin-actions';\n`;
  }
  if (catalogSet.size > 0) {
    imports += `import { ${Array.from(catalogSet).join(', ')} } from '@/actions/catalog-actions';\n`;
  }
  return imports;
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We ONLY refactor if it has 'use client' OR it's a component
  const isComponent = filePath.includes('components') || filePath.includes('hooks') || filePath.includes('contexts');
  if (!content.includes("'use client'") && !content.includes('"use client"') && !isComponent) {
    return false; // Skip pure Server Components (pages, layouts)
  }

  // Check if it imports from @/lib/data
  const importRegex = /import\s+\{[^}]+\}\s+from\s+['"]@\/lib\/data['"];?/g;
  if (!importRegex.test(content)) {
    return false;
  }

  // Find which action mapping is used
  const usedActions = new Set();
  let newContent = content;

  Object.entries(actionMapping).forEach(([repoCall, actionCall]) => {
    if (newContent.includes(repoCall)) {
      usedActions.add(actionCall.replace('(', ''));
      newContent = newContent.split(repoCall).join(actionCall);
    }
  });

  // Special case for StorageRepository because it needs formData
  if (newContent.includes('StorageRepository.uploadFile(')) {
     // Leave it as manual refactor since it needs FormData
     console.log(`[Manual Override Required for Storage] ${filePath}`);
     return false;
  }
  if (newContent.includes('StorageRepository.deleteFile(')) {
    newContent = newContent.split('StorageRepository.deleteFile(').join('deleteFile(');
    usedActions.add('deleteFile');
  }

  if (usedActions.size > 0) {
    const importReplacement = getImportStatements(usedActions);
    newContent = newContent.replace(importRegex, importReplacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Refactored: ${filePath}`);
    return true;
  } else {
      // It imports @/lib/data but we didn't map the calls. E.g. types or we missed something.
      // We will blindly remove the repo imports if they aren't used.
      console.log(`Warning/Skip (No calls mapped but imported): ${filePath}`);
      return false;
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      refactorFile(filePath);
    }
  }
}

walk(SRC_DIR);
console.log('Done refactoring.');
