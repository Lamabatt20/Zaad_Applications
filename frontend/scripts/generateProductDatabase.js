const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Simple Excel → JS converter for product DB generation.
const filePath = 'C:\\Users\\Loor Ibrahim\\Downloads\\freshberry_food_items.xlsx';

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Excel file not found at: ${filePath}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error('❌ No worksheet found in the Excel file.');
    process.exit(1);
  }

  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values || [];

  // Convert rows to plain objects keyed by header names.
  const data = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const record = {};
    headers.forEach((header, idx) => {
      if (!header || idx === 0) return; // idx 0 is ExcelJS placeholder
      const cell = row.getCell(idx);
      const value = cell.text || cell.value || '';
      record[String(header).trim()] = typeof value === 'string' ? value.trim() : String(value).trim();
    });
    data.push(record);
  });

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
}

main().catch(err => {
  console.error('❌ Failed to generate product database:', err);
  process.exit(1);
});
