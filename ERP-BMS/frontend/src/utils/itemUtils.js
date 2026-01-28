import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const exportToCSV = (items, filename = 'items') => {
  const headers = [
    'Name',
    'SKU',
    'Description',
    'Category',
    'Price',
    'Cost',
    'Quantity',
    'Created At'
  ];

  const csvContent = [
    headers.join(','),
    ...items.map(item => [
      `"${item.name}"`,
      `"${item.sku || ''}"`,
      `"${item.description || ''}"`,
      `"${item.category || ''}"`,
      item.price,
      item.cost || '',
      item.quantity,
      new Date(item.createdAt).toLocaleDateString()
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportToExcel = (items, filename = 'items') => {
  const data = items.map(item => ({
    'Name': item.name,
    'SKU': item.sku || '',
    'Description': item.description || '',
    'Category': item.category || '',
    'Price': item.price,
    'Cost': item.cost || '',
    'Quantity': item.quantity,
    'Created At': new Date(item.createdAt).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (items, filename = 'items') => {
  const doc = new jsPDF();
  const title = 'Items List';
  const headers = [['Name', 'SKU', 'Category', 'Price', 'Quantity']];
  
  const data = items.map(item => [
    item.name,
    item.sku || '-',
    item.category || '-',
    `$${parseFloat(item.price).toFixed(2)}`,
    item.quantity.toString()
  ]);

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add table
  doc.autoTable({
    head: headers,
    body: data,
    startY: 40,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const importFromCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Transform data to match our item structure
        const items = jsonData.map(row => ({
          name: row['Name'] || row['name'] || '',
          sku: row['SKU'] || row['sku'] || '',
          description: row['Description'] || row['description'] || '',
          category: row['Category'] || row['category'] || '',
          price: parseFloat(row['Price'] || row['price'] || 0),
          cost: row['Cost'] || row['cost'] ? parseFloat(row['Cost'] || row['cost']) : null,
          quantity: parseInt(row['Quantity'] || row['quantity'] || 0, 10)
        }));
        
        resolve(items);
      } catch (error) {
        reject(new Error('Error parsing file. Please make sure it\'s a valid CSV/Excel file.'));
      }
    };
    
    reader.onerror = (error) => {
      reject(new Error('Error reading file.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const printItems = (items) => {
  const printWindow = window.open('', '_blank');
  
  const tableContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Items List</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #3498db; color: white; text-align: left; padding: 10px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .date { color: #7f8c8d; }
          @media print {
            button { display: none; }
            @page { size: landscape; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Items List</h1>
          <div class="date">Generated on: ${new Date().toLocaleString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.sku || '-'}</td>
                <td>${item.category || '-'}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td>${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()" style="margin-left: 10px;">Close</button>
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(tableContent);
  printWindow.document.close();
};
