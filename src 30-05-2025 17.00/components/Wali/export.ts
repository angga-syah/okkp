// src/components/Wali/export.ts - COMPLETELY FIXED VERSION
"use client"
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { OrderStatus } from '@/lib/order'; 

interface Order {
  id: string;
  name: string;
  email: string;
  service_name: string;
  invoice_id: string | null;
  payment_url: string | null;
  document_path: string | null;
  result_file_path?: string | null;
  download_password?: string | null;
  status?: OrderStatus | string;
  created_at: string;
  note?: string | null;
  revision_message?: string | null;
  language?: string | null;
  updated_at?: string;
}

// Enhanced service pricing with proper error handling and validation
const getServicePrice = (serviceName: string | null | undefined): number => {
  if (!serviceName || typeof serviceName !== 'string') {
    console.warn('Invalid service name provided:', serviceName);
    return 0;
  }
  
  const normalizedServiceName = serviceName.trim();
  
  if (!normalizedServiceName) {
    console.warn('Empty service name after trimming');
    return 0;
  }
  
  // Comprehensive price mapping based on actual services
  const prices: Record<string, number> = {
    'E-Visa Business Single Entry': 5000000,
    'E-Visa Business Multiple Entry': 7000000,
    'E-Visa Business Single': 5000000,
    'E-Visa Business Multiple': 7000000,
    'Business Single Entry': 5000000,
    'Business Multiple Entry': 7000000,
  };
  
  // Try exact match first
  let price = prices[normalizedServiceName];
  
  // If no exact match, try case-insensitive search
  if (price === undefined) {
    const lowerServiceName = normalizedServiceName.toLowerCase();
    const matchingKey = Object.keys(prices).find(key => 
      key.toLowerCase() === lowerServiceName
    );
    
    if (matchingKey) {
      price = prices[matchingKey];
    }
  }
  
  // If still no match, try partial matching
  if (price === undefined) {
    const lowerServiceName = normalizedServiceName.toLowerCase();
    
    if (lowerServiceName.includes('single')) {
      price = 5000000;
      console.log('Matched single entry service via partial match:', normalizedServiceName);
    } else if (lowerServiceName.includes('multiple')) {
      price = 7000000;
      console.log('Matched multiple entry service via partial match:', normalizedServiceName);
    }
  }
  
  // Log unknown services for debugging
  if (price === undefined) {
    console.warn('Unknown service name:', normalizedServiceName);
    console.warn('Available services:', Object.keys(prices));
    return 0;
  }
  
  return price;
};

// Enhanced currency formatting with error handling
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
};

// Enhanced date formatting with error handling
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'Tidak ada tanggal';
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Tanggal tidak valid';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error tanggal';
  }
};

// Comprehensive status mapping based on actual database schema
const getDisplayStatus = (order: Order): string => {
  const status = order.status;
  
  if (!status || typeof status !== 'string') {
    console.warn('Invalid status for order:', order.id, status);
    return 'Status Tidak Diketahui';
  }
  
  const statusMapping: Record<string, string> = {
    'pending_payment': 'Menunggu Pembayaran',
    'payment_verified': 'Pembayaran Terverifikasi', 
    'document_verification': 'Verifikasi Dokumen',
    'pending_document': 'Menunggu Dokumen',
    'processing': 'Sedang Diproses',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'payment_expired': 'Pembayaran Kedaluwarsa',
    
    'pending': 'Menunggu',
    'process': 'Diproses',
    'revision': 'Revisi',
    'verified': 'Terverifikasi',
    'expired': 'Kedaluwarsa',
    'rejected': 'Ditolak',
    'approved': 'Disetujui',
    
    'Pending Payment': 'Menunggu Pembayaran',
    'Payment Verified': 'Pembayaran Terverifikasi',
    'Document Verification': 'Verifikasi Dokumen',
    'Pending Document': 'Menunggu Dokumen',
    'Processing': 'Sedang Diproses',
    'Completed': 'Selesai',
    'Cancelled': 'Dibatalkan',
    'Payment Expired': 'Pembayaran Kedaluwarsa',
  };
  
  const displayStatus = statusMapping[status];
  if (displayStatus) {
    return displayStatus;
  }
  
  const lowerStatus = status.toLowerCase();
  const matchingKey = Object.keys(statusMapping).find(key => 
    key.toLowerCase() === lowerStatus
  );
  
  if (matchingKey) {
    return statusMapping[matchingKey];
  }
  
  console.warn('Unknown status:', status, 'for order:', order.id);
  
  return status.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// 🔧 COMPLETELY FIXED: Order processing with proper array handling
const processOrders = (orders: Order[]): Array<Record<string, any>> => {
  console.log(`processOrders called with ${orders?.length || 0} orders`);
  
  // 🔧 FIX: Proper validation
  if (!orders) {
    console.error('Orders is null or undefined');
    return [];
  }
  
  if (!Array.isArray(orders)) {
    console.error('Orders is not an array, type:', typeof orders);
    return [];
  }
  
  if (orders.length === 0) {
    console.warn('Orders array is empty');
    return [];
  }
  
  console.log(`Processing ${orders.length} orders for export...`);
  
  // 🔧 FIX: Use proper map function without filtering nulls initially
  const processedOrders = orders.map((order, index) => {
    try {
      // 🔧 FIX: Better validation
      if (!order) {
        console.warn(`Invalid order at index ${index}: null/undefined`);
        return null;
      }
      
      if (typeof order !== 'object') {
        console.warn(`Invalid order at index ${index}: not an object, type: ${typeof order}`);
        return null;
      }
      
      // 🔧 FIX: Validate required fields
      if (!order.id) {
        console.warn(`Order at index ${index} missing ID`);
        return null;
      }
      
      // Get service price with proper error handling
      const servicePrice = getServicePrice(order.service_name);
      
      // 🔧 COMPLETELY FIXED: Comprehensive data mapping with proper null checks
      const processedOrder = {
        'No.': index + 1,
        'ID Pesanan': order.id || 'N/A',
        'Tanggal Dibuat': formatDate(order.created_at),
        'Tanggal Update': formatDate(order.updated_at),
        'Nama Pelanggan': order.name || 'Tidak ada nama',
        'Email': order.email || 'Tidak ada email',
        'Layanan': order.service_name || 'Layanan tidak diketahui',
        'Status': getDisplayStatus(order),
        'Nilai Invoice': formatCurrency(servicePrice),
        'Nilai Invoice (Angka)': servicePrice,
        'Catatan Admin': order.note || '-',
        'ID Invoice': order.invoice_id || 'Belum ada',
        'Link Pembayaran': order.payment_url || 'Belum tersedia',
        'Path Dokumen': order.document_path ? 'Ada' : 'Tidak ada',
        'File Hasil': order.result_file_path ? 'Tersedia' : 'Belum tersedia',
        'Password Download': order.download_password || 'Tidak ada',
        'Pesan Revisi': order.revision_message || '-',
        'Bahasa': order.language || 'Tidak diketahui',
      };
      
      // 🔧 FIX: Log processed order for debugging (only for first few orders)
      if (index < 3) {
        console.log(`Processed order ${index + 1}:`, {
          id: processedOrder['ID Pesanan'],
          name: processedOrder['Nama Pelanggan'],
          service: processedOrder['Layanan'],
          status: processedOrder['Status']
        });
      }
      
      return processedOrder;
    } catch (error) {
      console.error(`Error processing order at index ${index}:`, error);
      console.error('Order data:', order);
      return {
        'No.': index + 1,
        'ID Pesanan': order?.id || 'Error',
        'Nama Pelanggan': 'Gagal memproses data pesanan ini',
        'Error': error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
  
  // 🔧 FIX: Filter out null entries and validate result
  const validProcessedOrders: Record<string, any>[] = [];
  
  processedOrders.forEach(order => {
    if (order !== null && order !== undefined && typeof order === 'object') {
      validProcessedOrders.push(order);
    }
  });
  
  console.log(`Successfully processed ${validProcessedOrders.length} valid orders out of ${orders.length} total`);
  
  if (validProcessedOrders.length === 0) {
    console.error('No valid orders after processing!');
  }
  
  return validProcessedOrders;
};

// 🔧 COMPLETELY FIXED: Excel generation with comprehensive error handling
export const exportToExcel = async (orders: Order[], fileName = 'data'): Promise<boolean> => {
  try {
    console.log('======= STARTING EXCEL EXPORT =======');
    console.log('Input validation:', {
      ordersType: typeof orders,
      isArray: Array.isArray(orders),
      length: orders?.length || 0,
      fileName: fileName
    });
    
    // 🔧 FIXED: Enhanced input validation
    if (!orders) {
      console.error('Export failed: orders is null or undefined');
      throw new Error('Tidak ada data untuk diekspor - data kosong');
    }
    
    if (!Array.isArray(orders)) {
      console.error('Export failed: orders is not an array, type:', typeof orders);
      throw new Error('Format data tidak valid - bukan array');
    }
    
    if (orders.length === 0) {
      console.warn('Export failed: orders array is empty');
      throw new Error('Tidak ada data untuk diekspor - array kosong');
    }
    
    console.log(`Starting Excel export with ${orders.length} orders`);
    
    // 🔧 COMPLETELY FIXED: Process data with enhanced error handling
    console.log('Processing orders data...');
    const exportData = processOrders(orders);
    
    if (!exportData || !Array.isArray(exportData)) {
      console.error('processOrders returned invalid data:', typeof exportData);
      throw new Error('Gagal memproses data untuk ekspor');
    }
    
    if (exportData.length === 0) {
      console.error('No valid orders after processing');
      console.error('Original orders sample:', orders.slice(0, 2));
      throw new Error('Tidak ada data valid untuk diekspor setelah diproses');
    }
    
    console.log(`Successfully processed ${exportData.length} valid orders for Excel export`);
    console.log('Sample processed data:', exportData[0]);
    
    // Create workbook and worksheet
    console.log('Creating Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Pesanan E-Visa');
    
    // 🔧 ENHANCED: Column definitions with proper widths
    const columnDefinitions = [
      { header: 'No.', key: 'No.', width: 5 },
      { header: 'ID Pesanan', key: 'ID Pesanan', width: 15 },
      { header: 'Tanggal Dibuat', key: 'Tanggal Dibuat', width: 12 },
      { header: 'Tanggal Update', key: 'Tanggal Update', width: 12 },
      { header: 'Nama Pelanggan', key: 'Nama Pelanggan', width: 25 },
      { header: 'Email', key: 'Email', width: 30 },
      { header: 'Layanan', key: 'Layanan', width: 35 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'Nilai Invoice', key: 'Nilai Invoice', width: 20 },
      { header: 'Nilai Invoice (Angka)', key: 'Nilai Invoice (Angka)', width: 20 },
      { header: 'Catatan Admin', key: 'Catatan Admin', width: 35 },
      { header: 'ID Invoice', key: 'ID Invoice', width: 20 },
      { header: 'Link Pembayaran', key: 'Link Pembayaran', width: 25 },
      { header: 'Path Dokumen', key: 'Path Dokumen', width: 15 },
      { header: 'File Hasil', key: 'File Hasil', width: 15 },
      { header: 'Password Download', key: 'Password Download', width: 20 },
      { header: 'Pesan Revisi', key: 'Pesan Revisi', width: 35 },
      { header: 'Bahasa', key: 'Bahasa', width: 10 }
    ];
    
    console.log('Setting up worksheet columns...');
    worksheet.columns = columnDefinitions;
    
    // 🔧 COMPLETELY FIXED: Add rows with comprehensive error handling
    try {
      console.log(`📝 Adding ${exportData.length} rows to worksheet...`);
      
      // 🔧 FIX: Add rows one by one with error tracking
      let addedRows = 0;
      let failedRows = 0;
      
      exportData.forEach((rowData, index) => {
        try {
          if (!rowData || typeof rowData !== 'object') {
            console.warn(`Invalid row data at index ${index}:`, rowData);
            failedRows++;
            return;
          }
          
          // 🔧 FIX: Validate row data has required keys
          const requiredKeys = ['No.', 'ID Pesanan', 'Nama Pelanggan'];
          const hasRequiredKeys = requiredKeys.some(key => rowData[key] !== undefined);
          
          if (!hasRequiredKeys) {
            console.warn(`Row ${index} missing required keys:`, Object.keys(rowData));
            failedRows++;
            return;
          }
          
          worksheet.addRow(rowData);
          addedRows++;
          
          // Log progress for large datasets
          if (addedRows % 100 === 0) {
            console.log(`📝 Added ${addedRows} rows...`);
          }
        } catch (rowError) {
          console.error(`Error adding row ${index + 1}:`, rowError);
          console.error('Row data that failed:', rowData);
          failedRows++;
        }
      });
      
      console.log(`Successfully added ${addedRows} rows to worksheet (${failedRows} failed)`);
      
      if (addedRows === 0) {
        throw new Error('Tidak berhasil menambahkan data apapun ke Excel');
      }
      
    } catch (error) {
      console.error('Critical error adding rows:', error);
      throw new Error('Gagal menambahkan data ke worksheet: ' + (error instanceof Error ? error.message : String(error)));
    }
    
    // 🔧 ENHANCED: Apply styling with error handling
    try {
      console.log('🎨 Applying styling to worksheet...');
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      if (headerRow) {
        headerRow.font = { bold: true, size: 11 };
        headerRow.height = 25;
        
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
          };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            wrapText: true 
          };
        });
      }
      
      // Enhanced currency column formatting
      const currencyColumn = worksheet.getColumn('Nilai Invoice');
      if (currencyColumn) {
        currencyColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' }
            };
            cell.alignment = { horizontal: 'right' };
          }
        });
      }
      
      // Numeric currency column
      const numericCurrencyColumn = worksheet.getColumn('Nilai Invoice (Angka)');
      if (numericCurrencyColumn) {
        numericCurrencyColumn.numFmt = '#,##0';
        numericCurrencyColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0F8FF' }
            };
            cell.alignment = { horizontal: 'right' };
          }
        });
      }
      
      // Text wrapping for long content
      const textColumns = ['Catatan Admin', 'Pesan Revisi', 'Link Pembayaran'];
      textColumns.forEach(columnName => {
        const column = worksheet.getColumn(columnName);
        if (column) {
          column.eachCell({ includeEmpty: false }, (cell) => {
            cell.alignment = { 
              wrapText: true, 
              vertical: 'top',
              horizontal: 'left'
            };
          });
        }
      });
      
      console.log('Successfully applied styling to worksheet');
      
    } catch (error) {
      console.error('Error applying styles:', error);
      // Continue without styling - not critical
    }
    
    // 🔧 ENHANCED: Add summary with error handling
    try {
      const lastRow = worksheet.lastRow;
      if (lastRow && exportData.length > 0) {
        const summaryRowNumber = lastRow.number + 2;
        
        // Summary header
        const summaryHeaderCell = worksheet.getCell(`A${summaryRowNumber}`);
        summaryHeaderCell.value = 'RINGKASAN:';
        summaryHeaderCell.font = { bold: true, size: 12 };
        
        // Total orders
        const totalOrdersLabelCell = worksheet.getCell(`A${summaryRowNumber + 1}`);
        totalOrdersLabelCell.value = 'Total Pesanan:';
        const totalOrdersValueCell = worksheet.getCell(`B${summaryRowNumber + 1}`);
        totalOrdersValueCell.value = exportData.length;
        totalOrdersValueCell.font = { bold: true };
        
        // Total value calculation with error handling
        let totalValue = 0;
        let validPriceCount = 0;
        
        exportData.forEach(order => {
          const price = order['Nilai Invoice (Angka)'];
          if (typeof price === 'number' && !isNaN(price)) {
            totalValue += price;
            validPriceCount++;
          }
        });
        
        const totalValueLabelCell = worksheet.getCell(`A${summaryRowNumber + 2}`);
        totalValueLabelCell.value = 'Total Nilai:';
        const totalValueCell = worksheet.getCell(`B${summaryRowNumber + 2}`);
        totalValueCell.value = formatCurrency(totalValue);
        totalValueCell.font = { bold: true };
        
        const totalValueNumericLabelCell = worksheet.getCell(`A${summaryRowNumber + 3}`);
        totalValueNumericLabelCell.value = 'Total Nilai (Angka):';
        const totalValueNumericCell = worksheet.getCell(`B${summaryRowNumber + 3}`);
        totalValueNumericCell.value = totalValue;
        totalValueNumericCell.numFmt = '#,##0';
        totalValueNumericCell.font = { bold: true };
        
        // Export info
        const exportInfoLabelCell = worksheet.getCell(`A${summaryRowNumber + 5}`);
        exportInfoLabelCell.value = 'Diekspor pada:';
        const exportInfoValueCell = worksheet.getCell(`B${summaryRowNumber + 5}`);
        exportInfoValueCell.value = formatDate(new Date().toISOString());
        
        console.log(`Added summary: ${exportData.length} orders, total value: ${formatCurrency(totalValue)}`);
      }
    } catch (error) {
      console.error('Error adding summary:', error);
      // Continue without summary - not critical
    }
    
    // 🔧 ENHANCED: File generation and download with error handling
    try {
      const now = new Date();
      const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const timePart = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Sanitize filename
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const finalFileName = `${sanitizedFileName}-${datePart}-${timePart}.xlsx`;
      
      console.log('Generating Excel file:', finalFileName);
      
      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Generated Excel file is empty');
      }
      
      console.log(`Generated Excel file successfully, size: ${buffer.byteLength} bytes`);
      
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      if (blob.size === 0) {
        throw new Error('Generated blob is empty');
      }
      
      saveAs(blob, finalFileName);
      
      console.log('🎉 ======= EXCEL EXPORT COMPLETED SUCCESSFULLY =======');
      console.log(`File: ${finalFileName}, Records: ${exportData.length}, Size: ${blob.size} bytes`);
      
      return true;
      
    } catch (error) {
      console.error('Error generating/saving file:', error);
      throw new Error('Gagal menyimpan file Excel: ' + (error instanceof Error ? error.message : String(error)));
    }
    
  } catch (error) {
    console.error('======= EXCEL EXPORT FAILED =======');
    console.error('Excel export error details:', error);
    
    // Enhanced user-friendly error messages
    let userMessage = 'Terjadi kesalahan tidak diketahui';
    
    if (error instanceof Error) {
      if (error.message.includes('tidak ada data')) {
        userMessage = error.message;
      } else if (error.message.includes('format data')) {
        userMessage = 'Format data tidak valid. Silakan coba lagi.';
      } else if (error.message.includes('memproses data')) {
        userMessage = 'Gagal memproses data. Silakan periksa data dan coba lagi.';
      } else if (error.message.includes('worksheet')) {
        userMessage = 'Gagal membuat Excel worksheet. Silakan coba lagi.';
      } else if (error.message.includes('file Excel')) {
        userMessage = 'Gagal menyimpan file Excel. Silakan coba lagi.';
      } else {
        userMessage = `Gagal mengekspor data: ${error.message}`;
      }
    }
    
    // Show user-friendly error
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(userMessage);
    }
    
    return false;
  }
};

// 🔧 ENHANCED: Validation utility function
export const validateOrdersData = (orders: any[]): { valid: Order[]; invalid: any[]; errors: string[] } => {
  const valid: Order[] = [];
  const invalid: any[] = [];
  const errors: string[] = [];
  
  console.log('Validating orders data...');
  
  if (!Array.isArray(orders)) {
    errors.push('Data bukan berupa array');
    return { valid, invalid, errors };
  }
  
  orders.forEach((order, index) => {
    if (!order) {
      errors.push(`Order ${index + 1}: Data kosong`);
      invalid.push({ index, order, error: 'Data kosong' });
      return;
    }
    
    if (!order.id) {
      errors.push(`Order ${index + 1}: ID tidak ada`);
      invalid.push({ index, order, error: 'ID tidak ada' });
      return;
    }
    
    if (!order.name) {
      errors.push(`Order ${index + 1}: Nama tidak ada`);
      invalid.push({ index, order, error: 'Nama tidak ada' });
      return;
    }
    
    if (!order.email) {
      errors.push(`Order ${index + 1}: Email tidak ada`);
      invalid.push({ index, order, error: 'Email tidak ada' });
      return;
    }
    
    if (!order.service_name) {
      errors.push(`Order ${index + 1}: Service name tidak ada`);
      invalid.push({ index, order, error: 'Service name tidak ada' });
      return;
    }
    
    valid.push(order as Order);
  });
  
  console.log(`Validation complete: ${valid.length} valid, ${invalid.length} invalid`);
  
  return { valid, invalid, errors };
};

// 🔧 ENHANCED: Export with validation wrapper
export const exportToExcelWithValidation = async (orders: any[], fileName = 'data'): Promise<boolean> => {
  console.log('Starting export with validation...');
  
  const validation = validateOrdersData(orders);
  
  if (validation.errors.length > 0) {
    console.warn('Data validation warnings:', validation.errors.slice(0, 5)); // Show first 5 errors
  }
  
  if (validation.valid.length === 0) {
    console.error('No valid orders to export');
    const errorSummary = validation.errors.slice(0, 10).join('\n'); // Show first 10 errors
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`Tidak ada data valid untuk diekspor!\n\nError (${validation.errors.length} total):\n${errorSummary}${validation.errors.length > 10 ? '\n...' : ''}`);
    }
    return false;
  }
  
  console.log(`Exporting ${validation.valid.length} valid orders (${validation.invalid.length} invalid skipped)`);
  
  return exportToExcel(validation.valid, fileName);
};