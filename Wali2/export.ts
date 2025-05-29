//E:\kp\New folder\src\components\Wali\export.ts
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
  status?: OrderStatus;
  created_at: string;
  note?: string | null;
  revision_message?: string | null;
}

// Service pricing configuration
const getServicePrice = (serviceName: string): number => {
  const prices: Record<string, number> = {
    'E-Visa Business Single Entry': 5000000,
    'E-Visa Business Multiple Entry': 7000000,
  };
  return prices[serviceName] || 0;
};

// Format currency to Indonesian Rupiah
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Get display status from detailed status
const getDisplayStatus = (order: Order): string => {
  // Prefer detailed status if available
  const status = order.status;
  
  // Format the status for display
  switch (status) {
    case 'pending_payment':
      return 'Pending Payment';
    case 'payment_verified':
      return 'Payment Verified';
    case 'document_verification':
      return 'Document Verification';
    case 'pending_document':
      return 'Pending Document';
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'payment_expired':
      return 'Payment Expired';
    default:
      // Fallback to basic status if detailed status is not recognized
      return '';
  }
};

// Process orders to format for Excel
const processOrders = (orders: Order[]) => {
  return orders.map((order, index) => ({
    'No.': index + 1,
    'Tanggal': formatDate(order.created_at),
    'Nama Pelanggan': order.name,
    'Email': order.email,
    'Layanan': order.service_name,
    'Status': getDisplayStatus(order),
    'Nilai Invoice': formatCurrency(getServicePrice(order.service_name)),
    'Nilai Invoice (Angka)': getServicePrice(order.service_name), // For calculations
    'Catatan Admin': order.note || '-',
    'Link Pembayaran': order.payment_url || 'Belum Tersedia',
    'Hasil Layanan': order.result_file_path ? 'Tersedia' : 'Belum Tersedia',
    'Pesan Revisi': order.revision_message || '-'
  }));
};

// Main export function
export const exportToExcel = async (orders: Order[], fileName = 'data') => {
  try {
    // Process data for export
    const exportData = processOrders(orders);
   
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');
   
    // Define columns
    worksheet.columns = [
      { header: 'No.', key: 'No.', width: 5 },
      { header: 'Tanggal', key: 'Tanggal', width: 12 },
      { header: 'Nama Pelanggan', key: 'Nama Pelanggan', width: 25 },
      { header: 'Email', key: 'Email', width: 25 },
      { header: 'Layanan', key: 'Layanan', width: 30 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'Nilai Invoice', key: 'Nilai Invoice', width: 20 },
      { header: 'Nilai Invoice (Angka)', key: 'Nilai Invoice (Angka)', width: 20 },
      { header: 'Catatan Admin', key: 'Catatan Admin', width: 35 },
      { header: 'Link Pembayaran', key: 'Link Pembayaran', width: 25 },
      { header: 'Hasil Layanan', key: 'Hasil Layanan', width: 15 },
      { header: 'Pesan Revisi', key: 'Pesan Revisi', width: 35 }
    ];
   
    // Add rows
    worksheet.addRows(exportData);
   
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Format currency columns
    const currencyColumn = worksheet.getColumn('Nilai Invoice');
    currencyColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E8' } // Light green background
        };
      }
    });

    // Format numeric currency column for calculations
    const numericCurrencyColumn = worksheet.getColumn('Nilai Invoice (Angka)');
    numericCurrencyColumn.numFmt = '#,##0';
    numericCurrencyColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8FF' } // Light blue background
        };
      }
    });

    // Wrap text for potential long fields like notes and revision messages
    worksheet.getColumn('Catatan Admin').eachCell({ includeEmpty: false }, (cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    
    worksheet.getColumn('Pesan Revisi').eachCell({ includeEmpty: false }, (cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });

    // Add summary row
    const lastRow = worksheet.lastRow;
    if (lastRow && exportData.length > 0) {
      const summaryRowNumber = lastRow.number + 2;
      
      // Add total calculation
      worksheet.getCell(`G${summaryRowNumber}`).value = 'TOTAL:';
      worksheet.getCell(`G${summaryRowNumber}`).font = { bold: true };
      worksheet.getCell(`G${summaryRowNumber}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE4B5' }
      };

      // Calculate total value
      const totalValue = exportData.reduce((sum, order) => sum + (order['Nilai Invoice (Angka)'] || 0), 0);
      worksheet.getCell(`H${summaryRowNumber}`).value = totalValue;
      worksheet.getCell(`H${summaryRowNumber}`).numFmt = '#,##0';
      worksheet.getCell(`H${summaryRowNumber}`).font = { bold: true };
      worksheet.getCell(`H${summaryRowNumber}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE4B5' }
      };

      // Add formatted total
      worksheet.getCell(`G${summaryRowNumber + 1}`).value = 'TOTAL (FORMAT):';
      worksheet.getCell(`G${summaryRowNumber + 1}`).font = { bold: true };
      worksheet.getCell(`H${summaryRowNumber + 1}`).value = formatCurrency(totalValue);
      worksheet.getCell(`H${summaryRowNumber + 1}`).font = { bold: true };
    }
   
    // Generate file name with date
    const now = new Date();
    const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const finalFileName = `${fileName}-${datePart}.xlsx`;
   
    // Write and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, finalFileName);
   
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};