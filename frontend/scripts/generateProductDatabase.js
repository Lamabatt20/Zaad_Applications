const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1) Read the Excel file
const filePath = 'C:\\Users\\Loor Ibrahim\\Downloads\\freshberry_food_items.xlsx';
if (!fs.existsSync(filePath)) {
  console.error(`❌ Excel file not found at: ${filePath}`);
  process.exit(1);
}

const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(worksheet);

// 2) Transform data to match our structure
const products = (data || [])
  .map(item => ({
    barcode: item && item.Barcode != null ? String(item.Barcode).trim() : '',
    name: item && item.Item ? String(item.Item).trim() : '',
    category: item && item['Detected Category'] ? String(item['Detected Category']).trim() : ''
  }))
  .filter(p => p.barcode && p.name); // require barcode & name

console.log(`Processing ${products.length} products...`);

// 3) Create the JavaScript export code
let fileContent = `export const productDatabase = [\n`;

products.forEach((p, index) => {
  const barcode = p.barcode.replace(/'/g, "\\'");
  const name = p.name.replace(/'/g, "\\'");
  const category = (p.category || '').replace(/'/g, "\\'");
  fileContent += `  { barcode: '${barcode}', name: '${name}', category: '${category}' }`;
  if (index < products.length - 1) {
    fileContent += ',';
  }
  fileContent += '\n';
});

fileContent += `];\n\n`;

fileContent += `export const searchProductByBarcode = (barcode) => {
  const code = String(barcode).trim();
  return productDatabase.find(product => product.barcode === code) || null;
};

export const getAllProducts = () => {
  return productDatabase;
};

export const searchByCategory = (category) => {
  const cat = String(category || '').toLowerCase();
  return productDatabase.filter(product => (product.category || '').toLowerCase() === cat);
};
`;

// 4) Write to file (frontend/utils/productDatabase.js)
const utilsDir = path.join(__dirname, '..', 'utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}
const outputPath = path.join(utilsDir, 'productDatabase.js');
fs.writeFileSync(outputPath, fileContent);

console.log(`✓ Successfully updated productDatabase.js with ${products.length} products`);
const sizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
console.log(`File size: ${sizeMB} MB`);
