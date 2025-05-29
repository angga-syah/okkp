//bar.tsx

"use client"
import React from 'react';
import { useLanguage } from "../Header/Bahasa";
import { OrderStatus } from '@/lib/order';

// Interface for props
interface OrderProgressBarProps {
  currentStatus: OrderStatus;
  revisionMessage?: string; // Optional message for document revision
}

export default function OrderProgressBar({ currentStatus, revisionMessage }: OrderProgressBarProps) {
  const { language } = useLanguage();
  
  // Define the status texts and descriptions in both languages
  const statusContent = {
    en: {
      pending_payment: {
        label: 'Pending Payment',
        description: 'Your order is awaiting payment confirmation.',
      },
      payment_verified: {
        label: 'Payment Verified',
        description: 'Your payment has been successfully verified.',
      },
      document_verification: {
        label: 'Document Verification',
        description: 'Your submitted documents are being verified.',
      },
      pending_document: {
        label: 'Document Revision',
        description: 'Please upload revised documents based on our feedback.',
        revisionPrefix: 'Revision needed: ',
      },
      processing: {
        label: 'Processing',
        description: 'Your order is currently being processed.',
      },
      completed: {
        label: 'Completed',
        description: 'Your order has been completed. Thank you!',
      },
      cancelled: {
        label: 'Cancelled',
        description: 'This order has been cancelled.',
      },
      payment_expired: {
        label: 'Payment Expired',
        description: 'Your payment has expired. Please contact us to generate a new payment link.',
      }
    },
    id: {
      pending_payment: {
        label: 'Menunggu Pembayaran',
        description: 'Pesanan Anda menunggu konfirmasi pembayaran.',
      },
      payment_verified: {
        label: 'Pembayaran Terverifikasi',
        description: 'Pembayaran Anda telah berhasil diverifikasi.',
      },
      document_verification: {
        label: 'Verifikasi Dokumen',
        description: 'Dokumen yang Anda kirimkan sedang diverifikasi.',
      },
      pending_document: {
        label: 'Revisi Dokumen',
        description: 'Mohon upload ulang dokumen berdasarkan feedback kami.',
        revisionPrefix: 'Perlu revisi: ',
      },
      processing: {
        label: 'Diproses',
        description: 'Pesanan Anda sedang diproses.',
      },
      completed: {
        label: 'Selesai',
        description: 'Pesanan Anda telah selesai. Terima kasih!',
      },
      cancelled: {
        label: 'Dibatalkan',
        description: 'Pesanan ini telah dibatalkan.',
      },
      payment_expired: {
        label: 'Pembayaran Kedaluwarsa',
        description: 'Pembayaran Anda telah kedaluwarsa. Silakan hubungi kami untuk membuat tautan pembayaran baru.',
      }
    },
  };

  // Define the order of statuses in the progress flow
  // (cancelled and payment_expired are not included as they're special statuses)
  const statusFlow = [
    'pending_payment',
    'payment_verified',
    'document_verification',
    'pending_document',
    'processing',
    'completed',
  ] as const;

  // Get current language content
  const t = language === 'id' ? statusContent.id : statusContent.en;

  // Safety check - ensure currentStatus is a valid value, default to pending_payment if not
  const safeStatus: OrderStatus = Object.keys(t).includes(currentStatus) 
    ? currentStatus 
    : 'pending_payment';

  // Special case for cancelled status
  if (safeStatus === 'cancelled') {
    return (
      <div className="mt-8 mb-6">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="font-medium text-red-700 dark:text-red-300 mb-1">
            {t.cancelled.label}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-200">
            {t.cancelled.description}
          </p>
        </div>
      </div>
    );
  }

  // Special case for payment_expired status
  if (safeStatus === 'payment_expired') {
    return (
      <div className="mt-8 mb-6">
        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="font-medium text-red-700 dark:text-red-300 mb-1">
            {t.payment_expired.label}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-200">
            {t.payment_expired.description}
          </p>
        </div>
      </div>
    );
  }

  // Find the index of the current status in the flow
  // If status is not in flow, default to first step
  const currentIndex = statusFlow.indexOf(safeStatus as any);
  const displayIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="mt-8 mb-6">
      {/* Progress bar container */}
      <div className="relative">
        {/* Track line */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-0"></div>
        
        {/* Status points */}
        <div className="flex justify-between relative z-10">
          {statusFlow.map((status, index) => {
            // Determine if this step is active, completed, or inactive
            const isActive = index === displayIndex;
            const isCompleted = index < displayIndex;
            
            // Determine styling classes based on status
            let pointClasses = "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ";
            let textClasses = "mt-2 text-xs text-center ";
            
            if (isActive) {
              pointClasses += "bg-blue-500 text-white";
              textClasses += "font-medium text-blue-600 dark:text-blue-400";
            } else if (isCompleted) {
              pointClasses += "bg-green-500 text-white";
              textClasses += "text-green-600 dark:text-green-400";
            } else {
              pointClasses += "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
              textClasses += "text-gray-500 dark:text-gray-400";
            }
            
            return (
              <div key={status} className="flex flex-col items-center w-1/6">
                <div className={pointClasses}>
                  {isCompleted ? (
                    // Checkmark for completed steps
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    // Number for active or inactive steps
                    index + 1
                  )}
                </div>
                <div className={textClasses}>
                  {t[status].label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current status description box */}
      <div className={`mt-6 p-4 rounded-lg 
        ${safeStatus === 'pending_document' 
          ? 'bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500' 
          : safeStatus === 'completed'
            ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500'
            : 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
        }`}
      >
        <h3 className={`font-medium mb-1
          ${safeStatus === 'pending_document'
            ? 'text-amber-700 dark:text-amber-300'
            : safeStatus === 'completed'
              ? 'text-green-700 dark:text-green-300'
              : 'text-blue-700 dark:text-blue-300'
          }`}
        >
          {t[safeStatus].label}
        </h3>
        <p className={`text-sm
          ${safeStatus === 'pending_document'
            ? 'text-amber-600 dark:text-amber-200'
            : safeStatus === 'completed'
              ? 'text-green-600 dark:text-green-200'
              : 'text-blue-600 dark:text-blue-200'
          }`}
        >
          {t[safeStatus].description}
        </p>
        
        {/* Show revision message if provided and we're in pending_document status */}
        {safeStatus === 'pending_document' && revisionMessage && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {t[safeStatus].revisionPrefix}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {revisionMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}