"use client"
import React, { useState, useEffect, useRef } from 'react';

// Define unified order status types
export type OrderStatus =
  | 'pending_payment'
  | 'payment_verified'
  | 'document_verification'
  | 'pending_document'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'payment_expired'

// Helper function to get status display text
export function getStatusText(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    'pending_payment': 'Menunggu Pembayaran',
    'payment_verified': 'Pembayaran Terverifikasi',
    'document_verification': 'Verifikasi Dokumen',
    'pending_document': 'Menunggu Dokumen',
    'processing': 'Sedang Diproses',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'payment_expired': 'Pembayaran Kadaluarsa',
  };
  
  return statusMap[status] || status;
}

// Helper function to get status color
export function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    'pending_payment': 'bg-yellow-100 text-yellow-800',
    'payment_verified': 'bg-green-100 text-green-800',
    'document_verification': 'bg-purple-100 text-purple-800',
    'pending_document': 'bg-purple-100 text-purple-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'payment_expired': 'bg-red-100 text-red-800'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

// A simplified function for updating order status
export async function updateOrderStatus(
  supabaseClient: any,
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
     
    if (error) {
      throw error;
    }
   
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating order status:', err);
    return { success: false, error: err };
  }
}

// A React component for status selector - UPDATED WITH VISUAL STATE
export function StatusSelector({
  order,
  onChange
}: {
  order: { id: string; status: string };
  onChange: (orderId: string, newStatus: OrderStatus) => void;
}): React.ReactElement {
  // Add state to track visual selection before confirmation
  const [visualStatus, setVisualStatus] = useState<string>(order.status);
  const lastRealStatus = useRef(order.status);
  
  // Update visual state when actual status changes
  useEffect(() => {
    // Only update if the real order status has changed
    if (order.status !== lastRealStatus.current) {
      setVisualStatus(order.status);
      lastRealStatus.current = order.status;
    }
  }, [order.status]);
  
  // Add a separate manual reset function
  // This will be called when the modal is canceled
  // We'll add a global event listener to handle this
  useEffect(() => {
    const handleStatusChangeCanceled = () => {
      setVisualStatus(order.status);
    };
    
    // Create and listen for a custom event
    window.addEventListener('status_change_canceled', handleStatusChangeCanceled);
    
    return () => {
      window.removeEventListener('status_change_canceled', handleStatusChangeCanceled);
    };
  }, [order.status]);
  
  // Handle the selection change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    // Update visual state immediately
    setVisualStatus(newStatus);
    // Trigger the confirmation process
    onChange(order.id, newStatus);
  };
  
  return (
    <select
      value={visualStatus} // Use visualStatus instead of order.status
      onChange={handleStatusChange}
      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs w-full mb-2"
    >      
      <option value="pending_payment">Menunggu Pembayaran</option>
      <option value="payment_verified">Pembayaran Terverifikasi</option>
      <option value="document_verification">Verifikasi Dokumen</option>
      <option value="pending_document">Menunggu Dokumen</option>
      <option value="processing">Sedang Diproses</option>
      <option value="completed">Selesai</option>
      <option value="cancelled">Dibatalkan</option>
      <option value="payment_expired">Pembayaran Kadaluarsa</option>
    </select>
  );
}