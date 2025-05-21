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
    'ID Pesanan': order.id,
    'Tanggal': formatDate(order.created_at),
    'Nama Pelanggan': order.name,
    'Email': order.email,
    'Layanan': order.service_name,
    'Status': getDisplayStatus(order),
    'Catatan Admin': order.note || '-', // Tambahkan kolom catatan
    'Invoice ID': order.invoice_id || '-',
    'Hasil Layanan': order.result_file_path ? 'Tersedia' : 'Belum Tersedia',
    'Pesan Revisi': order.revision_message || '-' // Tambahkan pesan revisi untuk kelengkapan
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
      { header: 'ID Pesanan', key: 'ID Pesanan', width: 15 },
      { header: 'Tanggal', key: 'Tanggal', width: 12 },
      { header: 'Nama Pelanggan', key: 'Nama Pelanggan', width: 25 },
      { header: 'Email', key: 'Email', width: 25 },
      { header: 'Layanan', key: 'Layanan', width: 30 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Catatan Admin', key: 'Catatan Admin', width: 35 }, // Tambahkan kolom catatan
      { header: 'Invoice ID', key: 'Invoice ID', width: 20 },
      { header: 'Hasil Layanan', key: 'Hasil Layanan', width: 15 },
      { header: 'Pesan Revisi', key: 'Pesan Revisi', width: 35 } // Tambahkan kolom pesan revisi
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

    // Wrap text for potential long fields like notes and revision messages
    worksheet.getColumn('Catatan Admin').eachCell({ includeEmpty: false }, (cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    
    worksheet.getColumn('Pesan Revisi').eachCell({ includeEmpty: false }, (cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
   
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