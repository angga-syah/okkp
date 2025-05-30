//status.tsx

"use client"
import React from 'react';
import { OrderStatus } from '@/lib/order';

// Status display helper function
export function getStatusDisplay(status: string): string {
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
      return status;
  }
}

// Function untuk mendapatkan kelas warna status
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
    case 'payment_verified':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
    case 'completed':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
    case 'processing':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100';
    case 'document_verification':
      return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100';
    case 'pending_document':
      return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100';
    case 'payment_expired':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
  }
}

// Komponen untuk menampilkan status
export function StatusBadge({ status }: { status: string }): React.ReactElement {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
      {getStatusDisplay(status)}
    </span>
  );
}

// Komponen selector status dengan pilihan terbatas
export function StatusSelectorLimit({
  order,
  onChange
}: {
  order: { id: string; status: string };
  onChange: (orderId: string, newStatus: OrderStatus) => void;
}): React.ReactElement {
  
  // Tentukan status berikutnya berdasarkan status saat ini
  const getNextStatuses = (currentStatus: string): OrderStatus[] => {
    // Status yang selalu ditampilkan
    const fixedStatuses: OrderStatus[] = [
      'document_verification',
      'processing', 
      'completed',
      'cancelled'
    ];
    
    // Status saat ini selalu ditampilkan pertama
    if (fixedStatuses.includes(currentStatus as OrderStatus)) {
      // Tampilkan status saat ini sebagai pilihan pertama
      const currentIndex = fixedStatuses.indexOf(currentStatus as OrderStatus);
      const reorderedStatuses = [...fixedStatuses];
      
      // Pindahkan status saat ini ke depan
      if (currentIndex > 0) {
        reorderedStatuses.splice(currentIndex, 1);
        reorderedStatuses.unshift(currentStatus as OrderStatus);
      }
      
      return reorderedStatuses;
    }
    
    // Untuk status lainnya, tampilkan status saat ini + fixed statuses
    return [currentStatus as OrderStatus, ...fixedStatuses];
  };
  
  const availableStatuses = getNextStatuses(order.status);
  
  return (
    <select
      value={order.status}
      onChange={(e) => onChange(order.id, e.target.value as OrderStatus)}
      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs w-full mb-2"
    >      
      {availableStatuses.map((status) => (
        <option key={status} value={status}>
          {getStatusDisplay(status)}
        </option>
      ))}
    </select>
  );
}