// E:\kp\New folder\src\components\Wali\export.ts - FIXED VERSION
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

// 🔧 FIXED: Enhanced service pricing with proper error handling and validation
const getServicePrice = (serviceName: string | null | undefined): number => {
  // 🔧 FIX: Proper null/undefined checking
  if (!serviceName || typeof serviceName !== 'string') {
    console.warn('❌ Invalid service name provided:', serviceName);
    return 0;
  }
  
  // 🔧 FIX: Trim whitespace and normalize
  const normalizedServiceName = serviceName.trim();
  
  if (!normalizedServiceName) {
    console.warn('❌ Empty service name after trimming');
    return 0;
  }
  
  // 🔧 FIX: Comprehensive price mapping based on actual services
  const prices: Record<string, number> = {
    'E-Visa Business Single Entry': 5000000,
    'E-Visa Business Multiple Entry': 7000000,
    // 🔧 FIX: Add more potential variations
    'E-Visa Business Single': 5000000,
    'E-Visa Business Multiple': 7000000,
    'Business Single Entry': 5000000,
    'Business Multiple Entry': 7000000,
  };
  
  // 🔧 FIX: Try exact match first
  let price = prices[normalizedServiceName];
  
  // 🔧 FIX: If no exact match, try case-insensitive search
  if (price === undefined) {
    const lowerServiceName = normalizedServiceName.toLowerCase();
    const matchingKey = Object.keys(prices).find(key => 
      key.toLowerCase() === lowerServiceName
    );
    
    if (matchingKey) {
      price = prices[matchingKey];
    }
  }
  
  // 🔧 FIX: If still no match, try partial matching
  if (price === undefined) {
    const lowerServiceName = normalizedServiceName.toLowerCase();
    
    if (lowerServiceName.includes('single')) {
      price = 5000000;
      console.log('✅ Matched single entry service via partial match:', normalizedServiceName);
    } else if (lowerServiceName.includes('multiple')) {
      price = 7000000;
      console.log('✅ Matched multiple entry service via partial match:', normalizedServiceName);
    }
  }
  
  // 🔧 FIX: Log unknown services for debugging
  if (price === undefined) {
    console.warn('❌ Unknown service name:', normalizedServiceName);
    console.warn('Available services:', Object.keys(prices));
    return 0;
  }
  
  return price;
};

// 🔧 FIXED: Enhanced currency formatting with error handling
const formatCurrency = (amount: number | null | undefined): string => {
  // 🔧 FIX: Handle null/undefined amounts
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
    console.error('❌ Error formatting currency:', error);
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
};

// 🔧 FIXED: Enhanced date formatting with error handling
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'Tidak ada tanggal';
  }
  
  try {
    const date = new Date(dateString);
    
    // 🔧 FIX: Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('❌ Invalid date string:', dateString);
      return 'Tanggal tidak valid';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('❌ Error formatting date:', error);
    return 'Error tanggal';
  }
};

// 🔧 FIXED: Comprehensive status mapping based on actual database schema
const getDisplayStatus = (order: Order): string => {
  const status = order.status;
  
  if (!status || typeof status !== 'string') {
    console.warn('❌ Invalid status for order:', order.id, status);
    return 'Status Tidak Diketahui';
  }
  
  // 🔧 FIX: Comprehensive status mapping based on database schema
  const statusMapping: Record<string, string> = {
    // Primary statuses from database
    'pending_payment': 'Menunggu Pembayaran',
    'payment_verified': 'Pembayaran Terverifikasi', 
    'document_verification': 'Verifikasi Dokumen',
    'pending_document': 'Menunggu Dokumen',
    'processing': 'Sedang Diproses',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'payment_expired': 'Pembayaran Kedaluwarsa',
    
    // Alternative variations that might exist
    'pending': 'Menunggu',
    'process': 'Diproses',
    'revision': 'Revisi',
    'verified': 'Terverifikasi',
    'expired': 'Kedaluwarsa',
    'rejected': 'Ditolak',
    'approved': 'Disetujui',
    
    // English versions (fallback)
    'Pending Payment': 'Menunggu Pembayaran',
    'Payment Verified': 'Pembayaran Terverifikasi',
    'Document Verification': 'Verifikasi Dokumen',
    'Pending Document': 'Menunggu Dokumen',
    'Processing': 'Sedang Diproses',
    'Completed': 'Selesai',
    'Cancelled': 'Dibatalkan',
    'Payment Expired': 'Pembayaran Kedaluwarsa',
  };
  
  // 🔧 FIX: Try exact match first
  const displayStatus = statusMapping[status];
  if (displayStatus) {
    return displayStatus;
  }
  
  // 🔧 FIX: Try case-insensitive match
  const lowerStatus = status.toLowerCase();
  const matchingKey = Object.keys(statusMapping).find(key => 
    key.toLowerCase() === lowerStatus
  );
  
  if (matchingKey) {
    return statusMapping[matchingKey];
  }
  
  // 🔧 FIX: Log unknown status for debugging
  console.warn('❌ Unknown status:', status, 'for order:', order.id);
  
  // 🔧 FIX: Return formatted version of unknown status
  return status.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// 🔧 FIXED: Enhanced order processing with better error handling
const processOrders = (orders: Order[]): Array<Record<string, any>> => {
  if (!orders || !Array.isArray(orders)) {
    console.error('❌ Invalid orders data provided to processOrders');
    return [];
  }
  
  const processedOrders = orders.map((order, index) => {
    try {
      // 🔧 FIX: Validate order object
      if (!order || typeof order !== 'object') {
        console.warn('❌ Invalid order at index:', index);
        return null;
      }
      
      // 🔧 FIX: Get service price with proper error handling
      const servicePrice = getServicePrice(order.service_name);
      
      // 🔧 FIX: Comprehensive data mapping with null checks
      return {
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
    } catch (error) {
      console.error('❌ Error processing order at index:', index, error);
      return {
        'No.': index + 1,
        'ID Pesanan': order?.id || 'Error',
        'Error': 'Gagal memproses data pesanan ini'
      };
    }
  }).filter(order => order !== null); // Remove null entries
  
  console.log(`✅ Processed ${processedOrders.length} orders out of ${orders.length} total`);
  return processedOrders;
};

// 🔧 FIXED: Enhanced Excel generation with comprehensive error handling
export const exportToExcel = async (orders: Order[], fileName = 'data'): Promise<boolean> => {
  try {
    console.log('📊 Starting Excel export with', orders?.length || 0, 'orders');
    
    // 🔧 FIX: Validate input
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      console.warn('❌ No orders to export');
      throw new Error('Tidak ada data untuk diekspor');
    }
    
    // 🔧 FIX: Process data with error handling
    const exportData = processOrders(orders);
    
    if (exportData.length === 0) {
      console.warn('❌ No valid orders after processing');
      throw new Error('Tidak ada data valid untuk diekspor');
    }
    
    console.log(`✅ Processing ${exportData.length} valid orders`);
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Pesanan E-Visa');
    
    // 🔧 FIX: Enhanced column definitions with proper widths
    worksheet.columns = [
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
    
    // Add rows with error handling
    try {
      worksheet.addRows(exportData);
      console.log('✅ Added', exportData.length, 'rows to worksheet');
    } catch (error) {
      console.error('❌ Error adding rows:', error);
      throw new Error('Gagal menambahkan data ke worksheet');
    }
    
    // 🔧 FIX: Enhanced styling with error handling
    try {
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.height = 25;
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' } // Blue header
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
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
      
      // 🔧 FIX: Enhanced currency column formatting
      const currencyColumn = worksheet.getColumn('Nilai Invoice');
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
      
      // 🔧 FIX: Numeric currency column
      const numericCurrencyColumn = worksheet.getColumn('Nilai Invoice (Angka)');
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
      
      // 🔧 FIX: Text wrapping for long content
      const textColumns = ['Catatan Admin', 'Pesan Revisi', 'Link Pembayaran'];
      textColumns.forEach(columnName => {
        const column = worksheet.getColumn(columnName);
        column.eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { 
            wrapText: true, 
            vertical: 'top',
            horizontal: 'left'
          };
        });
      });
      
      console.log('✅ Applied styling to worksheet');
      
    } catch (error) {
      console.error('❌ Error applying styles:', error);
      // Continue without styling
    }
    
    // 🔧 FIX: Enhanced summary with error handling
    try {
      const lastRow = worksheet.lastRow;
      if (lastRow && exportData.length > 0) {
        const summaryRowNumber = lastRow.number + 2;
        
        // Summary header
        worksheet.getCell(`A${summaryRowNumber}`).value = 'RINGKASAN:';
        worksheet.getCell(`A${summaryRowNumber}`).font = { bold: true, size: 12 };
        
        // Total orders
        worksheet.getCell(`A${summaryRowNumber + 1}`).value = 'Total Pesanan:';
        worksheet.getCell(`B${summaryRowNumber + 1}`).value = exportData.length;
        worksheet.getCell(`B${summaryRowNumber + 1}`).font = { bold: true };
        
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
        
        worksheet.getCell(`A${summaryRowNumber + 2}`).value = 'Total Nilai:';
        worksheet.getCell(`B${summaryRowNumber + 2}`).value = formatCurrency(totalValue);
        worksheet.getCell(`B${summaryRowNumber + 2}`).font = { bold: true };
        
        worksheet.getCell(`A${summaryRowNumber + 3}`).value = 'Total Nilai (Angka):';
        worksheet.getCell(`B${summaryRowNumber + 3}`).value = totalValue;
        worksheet.getCell(`B${summaryRowNumber + 3}`).numFmt = '#,##0';
        worksheet.getCell(`B${summaryRowNumber + 3}`).font = { bold: true };
        
        // Export info
        worksheet.getCell(`A${summaryRowNumber + 5}`).value = 'Diekspor pada:';
        worksheet.getCell(`B${summaryRowNumber + 5}`).value = formatDate(new Date().toISOString());
        
        console.log(`✅ Added summary: ${exportData.length} orders, total value: ${formatCurrency(totalValue)}`);
      }
    } catch (error) {
      console.error('❌ Error adding summary:', error);
      // Continue without summary
    }
    
    // 🔧 FIX: Enhanced file naming with sanitization
    try {
      const now = new Date();
      const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const timePart = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      
      // 🔧 FIX: Sanitize filename
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const finalFileName = `${sanitizedFileName}-${datePart}-${timePart}.xlsx`;
      
      console.log('📁 Generating file:', finalFileName);
      
      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, finalFileName);
      
      console.log('🎉 Excel export completed successfully:', finalFileName);
      return true;
      
    } catch (error) {
      console.error('❌ Error generating/saving file:', error);
      throw new Error('Gagal menyimpan file Excel');
    }
    
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    
    // 🔧 FIX: User-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui';
    
    // Show user-friendly error
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`Gagal mengekspor data: ${errorMessage}`);
    }
    
    return false;
  }
};

// 🔧 FIX: Add utility function to validate orders data
export const validateOrdersData = (orders: any[]): { valid: Order[]; invalid: any[]; errors: string[] } => {
  const valid: Order[] = [];
  const invalid: any[] = [];
  const errors: string[] = [];
  
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
  
  return { valid, invalid, errors };
};

// 🔧 FIX: Export with validation
export const exportToExcelWithValidation = async (orders: any[], fileName = 'data'): Promise<boolean> => {
  const validation = validateOrdersData(orders);
  
  if (validation.errors.length > 0) {
    console.warn('⚠️ Data validation warnings:', validation.errors);
  }
  
  if (validation.valid.length === 0) {
    console.error('❌ No valid orders to export');
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Tidak ada data valid untuk diekspor!\n\nError:\n' + validation.errors.join('\n'));
    }
    return false;
  }
  
  console.log(`✅ Exporting ${validation.valid.length} valid orders (${validation.invalid.length} invalid)`);
  
  return exportToExcel(validation.valid, fileName);
};