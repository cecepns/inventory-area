import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Generate stock report in Excel format
export const generateStockExcel = (products, summary) => {
  // Create Excel workbook
  const wb = XLSX.utils.book_new();
  
  // Format data for Excel
  const excelData = products.map(product => ({
    'Product ID': product.id,
    'Product Name': product.name,
    'SKU': product.sku,
    'Description': product.description || '',
    'Category': product.category || '',
    'Current Stock': product.current_stock,
    'Min Stock': product.min_stock,
    'Max Stock': product.max_stock,
    'Unit Price': product.unit_price,
    'Expiration Date': product.expiration_date ? new Date(product.expiration_date).toLocaleDateString() : '',
    'Location': product.location_code || '',
    'Area': product.area_name || '',
    'Stock Status': product.stock_status,
    'Expiry Status': product.expiry_status,
    'Stock Value': product.current_stock * product.unit_price
  }));

  // Create summary data
  const summaryData = Object.entries(summary).map(([key, value]) => ({
    'Metric': key,
    'Value': value
  }));

  // Create worksheets
  const ws1 = XLSX.utils.json_to_sheet(excelData);
  const ws2 = XLSX.utils.json_to_sheet(summaryData);

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, ws1, 'Stock Report');
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Generate Excel file
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  
  return buffer;
};

// Generate warehouse layout PDF
export const generateWarehouseLayoutPDF = (areas, locations) => {
  // Create PDF
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text('Warehouse Layout Report', 20, 30);
  
  // Add generation date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);

  let yPosition = 60;

  // Add areas summary
  doc.setFontSize(16);
  doc.text('Warehouse Areas Summary', 20, yPosition);
  yPosition += 20;

  doc.setFontSize(10);
  areas.forEach(area => {
    const locationsInArea = locations.filter(loc => loc.area_id === area.id);
    const occupiedLocations = locationsInArea.filter(loc => loc.is_occupied);
    
    doc.text(`• ${area.name} (${area.type}):`, 25, yPosition);
    doc.text(`${locationsInArea.length} locations, ${occupiedLocations.length} occupied`, 50, yPosition + 5);
    yPosition += 15;

    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Add detailed location list
  yPosition += 10;
  doc.setFontSize(16);
  doc.text('Detailed Location Inventory', 20, yPosition);
  yPosition += 20;

  doc.setFontSize(10);
  let currentArea = null;

  locations.forEach(location => {
    if (location.area_name !== currentArea) {
      currentArea = location.area_name;
      yPosition += 5;
      doc.setFontSize(12);
      doc.text(`${currentArea || 'Unassigned'}:`, 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
    }

    const status = location.product_name ? 'Occupied' : 'Empty';
    doc.text(`  ${location.location_code}: ${status}`, 25, yPosition);
    
    if (location.product_name) {
      doc.text(`${location.product_name} (${location.sku}) - Stock: ${location.current_stock}`, 80, yPosition);
    }
    
    yPosition += 8;

    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Generate PDF buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  
  return pdfArrayBuffer;
};

// Generate near expiry report in Excel format
export const generateNearExpiryExcel = (products, months) => {
  // Create Excel workbook
  const wb = XLSX.utils.book_new();
  
  // Format data for Excel
  const excelData = products.map(product => ({
    'Product ID': product.id,
    'Product Name': product.name,
    'SKU': product.sku,
    'Description': product.description || '',
    'Category': product.category || '',
    'Current Stock': product.current_stock,
    'Expiration Date': product.expiration_date ? new Date(product.expiration_date).toLocaleDateString() : '',
    'Days Until Expiry': product.days_until_expiry,
    'Location': product.location_code || '',
    'Area': product.area_name || '',
    'Unit Price': product.unit_price,
    'Stock Value': product.current_stock * product.unit_price,
    'Expiry Status': product.expiry_status
  }));

  // Create summary
  const summary = {
    'Total Products Near Expiry': products.length,
    'Expired': products.filter(p => p.expiry_status === 'Expired').length,
    'Expiring Within 30 Days': products.filter(p => p.days_until_expiry <= 30).length,
    'Expiring Within 90 Days': products.filter(p => p.days_until_expiry <= 90).length,
    'Total Stock Value': products.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0),
    'Report Period': `${months} months ahead`
  };

  const summaryData = Object.entries(summary).map(([key, value]) => ({
    'Metric': key,
    'Value': value
  }));

  // Create worksheets
  const ws1 = XLSX.utils.json_to_sheet(excelData);
  const ws2 = XLSX.utils.json_to_sheet(summaryData);

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, ws1, 'Near Expiry Report');
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  // Generate Excel file
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  
  return buffer;
};

// Helper function to download file
export const downloadFile = (buffer, filename, contentType) => {
  // Handle both Buffer (from XLSX) and ArrayBuffer (from jsPDF)
  const blob = new Blob([buffer], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
