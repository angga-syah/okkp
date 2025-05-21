// customer.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/sb_client';
import { useLanguage } from "../Header/Bahasa";
import { motion } from "framer-motion";
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from '../Order/turnstile';
import OrderProgressBar from './bar';
import { useSearchParams } from 'next/navigation';
import { OrderStatus } from '@/lib/order';
import { getStatusColor } from '../Wali/status';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8,
      ease: "easeOut"
    } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

const slideIn = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 12,
      duration: 0.6 
    } 
  }
};

// Rate limiting helper
const useRateLimiter = () => {
  const [searchCount, setSearchCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null);
  
  useEffect(() => {
    // Retrieve search count from localStorage
    const storedSearchData = localStorage.getItem('orderSearchData');
    if (storedSearchData) {
      try {
        const { count, timestamp } = JSON.parse(storedSearchData);
        const now = Date.now();
        const hoursPassed = (now - timestamp) / (1000 * 60 * 60);
        
        // Reset if more than 24 hours have passed
        if (hoursPassed >= 24) {
          localStorage.setItem('orderSearchData', JSON.stringify({ count: 0, timestamp: now }));
          setSearchCount(0);
          setIsRateLimited(false);
          setRateLimitReset(null);
        } else {
          setSearchCount(count);
          
          // Apply rate limiting if necessary
          if (count >= 20) {
            setIsRateLimited(true);
            // Calculate when the rate limit will reset
            const resetTime = timestamp + (24 * 60 * 60 * 1000);
            setRateLimitReset(resetTime);
          }
        }
      } catch {
        // Handle JSON parse error - reset the data (removed unused 'error' variable)
        localStorage.setItem('orderSearchData', JSON.stringify({ count: 0, timestamp: Date.now() }));
      }
    } else {
      // Initialize if not exists
      localStorage.setItem('orderSearchData', JSON.stringify({ count: 0, timestamp: Date.now() }));
    }
  }, []);
  
  const incrementSearchCount = () => {
    const now = Date.now();
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    
    localStorage.setItem('orderSearchData', JSON.stringify({ 
      count: newCount, 
      timestamp: now 
    }));
    
    // Check if rate limit has been reached
    if (newCount >= 5) {
      setIsRateLimited(true);
      setRateLimitReset(now + (24 * 60 * 60 * 1000));
    }
    
    return newCount;
  };
  
  return { 
    searchCount, 
    isRateLimited, 
    rateLimitReset, 
    incrementSearchCount,
  };
};

interface Order {
  id: string;
  name: string | string[];
  email: string | string[];
  service_name: string | string[];
  invoice_id: string | string[] | null;
  payment_url: string | null;
  document_path: string | null;
  status: OrderStatus;
  created_at: string;
  revision_message?: string | null;
}

interface CustomerContentProps {
  initialEmail: string;
  initialInvoiceId: string;
}

// Define type for search error
interface SearchError {
  message: string;
}

export default function Customer({ initialEmail, initialInvoiceId }: CustomerContentProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState<string>(initialEmail || '');
  const [invoiceId, setInvoiceId] = useState<string>(initialInvoiceId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  
  // Use imported turnstile hook
  const { 
    siteKey, 
    turnstileToken, 
    turnstileVisible,
    turnstileRef,
    setTurnstileVisible,
    setSubmissionAttempts,
    handleTurnstileSuccess,
    handleTurnstileError,
    handleTurnstileExpire,
    resetTurnstile
  } = useTurnstile();
  
  // Rate limiting integration
  const { 
    searchCount, 
    isRateLimited, 
    rateLimitReset, 
    incrementSearchCount 
  } = useRateLimiter();

  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email'); 
    const invoiceIdParam = searchParams.get('invoiceId');
    
    if (emailParam) setEmail(emailParam);
    if (invoiceIdParam) setInvoiceId(invoiceIdParam);
  }, [searchParams]);

  // Content translations
  const content = {
    en: {
      title: "Order Tracking",
      findOrderTitle: "Find Your Order",
      emailLabel: "Email Address",
      invoiceIdLabel: "Invoice ID",
      searchButton: "Search Order",
      searchingText: "Searching...",
      noOrderError: "No order found with the provided information. Please check your email and invoice ID.",
      orderDetailsTitle: "Order Details",
      orderId: "Order ID",
      orderDate: "Order Date",
      customerName: "Customer Name",
      email: "Email",
      service: "Service",
      status: "Status",
      invoiceId: "Invoice ID",
      payment: "Payment",
      paymentButton: "Go to Payment Page",
      document: "Document",
      viewDocumentButton: "View Document",
      uploadRevisionButton: "Upload Revised Document",
      documentUploadTitle: "Upload Revised Document",
      fileInputLabel: "Select or drop your document here",
      uploadButton: "Upload Document",
      uploadingText: "Uploading...",
      uploadSuccessMessage: "Document uploaded successfully! We'll review it shortly.",
      uploadErrorMessage: "Failed to upload document. Please try again.",
      cancelButton: "Cancel",
      rateLimitError: "You have exceeded the maximum number of searches. Please try again in 24 hours.",
      formErrors: {
        invalidEmail: "Please enter a valid email address",
        invalidInvoice: "Invoice ID must be at least 6 characters",
      },
      remainingSearches: "Remaining searches today: {count}",
      statusMessages: {
        pending: "Your order is pending due to payment or document verification, or because payment hasn't been completed yet. Please complete the payment if you haven't already.",
        processing: "Your order is currently being processed. We'll notify you when it's completed.",
        completed: "Your order has been completed. Thank you!",
        cancelled: "This order has been cancelled. Please contact support if you have any questions."
      },
      // Add status translations
      statusLabels: {
        pending_payment: "Pending Payment",
        payment_verified: "Payment Verified",
        document_verification: "Document Verification",
        pending_document: "Document Revision",
        processing: "Processing",
        completed: "Completed",
        cancelled: "Cancelled",
        payment_expired: "Payment Expired"
      }
    },
    id: {
      title: "Pelacakan Pesanan",
      findOrderTitle: "Temukan Pesanan Anda",
      emailLabel: "Alamat Email",
      invoiceIdLabel: "No. Invoice",
      searchButton: "Cari Pesanan",
      searchingText: "Mencari...",
      noOrderError: "Tidak ditemukan pesanan dengan informasi yang diberikan. Harap periksa email dan No. Invoice Anda.",
      orderDetailsTitle: "Detail Pesanan",
      orderId: "ID Pesanan",
      orderDate: "Tanggal Pesanan",
      customerName: "Nama Pelanggan",
      email: "Email",
      service: "Layanan",
      status: "Status",
      invoiceId: "No. Invoice",
      payment: "Pembayaran",
      paymentButton: "Pergi ke Halaman Pembayaran",
      document: "Dokumen",
      viewDocumentButton: "Lihat Dokumen",
      uploadRevisionButton: "Unggah Dokumen Revisi",
      documentUploadTitle: "Unggah Dokumen Revisi",
      fileInputLabel: "Pilih atau drop dokumen Anda di sini",
      uploadButton: "Unggah Dokumen",
      uploadingText: "Mengunggah...",
      uploadSuccessMessage: "Dokumen berhasil diunggah! Kami akan segera mereviewnya.",
      uploadErrorMessage: "Gagal mengunggah dokumen. Silakan coba lagi.",
      cancelButton: "Batal",
      verifyHuman: "Verifikasi bahwa Anda manusia",
      rateLimitError: "Anda telah melebihi jumlah maksimum pencarian. Silakan coba lagi dalam 24 jam.",
      formErrors: {
        invalidEmail: "Masukkan alamat email yang valid",
        invalidInvoice: "No. Invoice harus minimal 6 karakter",
        captchaRequired: "Harap selesaikan verifikasi"
      },
      remainingSearches: "Sisa pencarian hari ini: {count}",
      statusMessages: {
        pending: "Pesanan Anda tertunda karena menunggu verifikasi pembayaran atau dokumen, atau mungkin pembayaran belum dilakukan, silakan selesaikan pembayaran jika Anda belum melakukannya.",
        processing: "Pesanan Anda sedang diproses. Kami akan memberi tahu Anda ketika selesai.",
        completed: "Pesanan Anda telah selesai. Terima kasih!",
        cancelled: "Pesanan ini telah dibatalkan. Silakan hubungi dukungan jika Anda memiliki pertanyaan."
      },
      // Add status translations
      statusLabels: {
        pending_payment: "Menunggu Pembayaran",
        payment_verified: "Pembayaran Terverifikasi",
        document_verification: "Verifikasi Dokumen",
        pending_document: "Revisi Dokumen",
        processing: "Diproses",
        completed: "Selesai",
        cancelled: "Dibatalkan",
        payment_expired: "Pembayaran Kedaluwarsa"
      }
    }
  };

  // Current language content
  const t = language === 'id' ? content.id : content.en;
  
  // Get translated status label function
  const getStatusLabel = (status: OrderStatus): string => {
    return t.statusLabels[status] || status;
  };
  
  // Format remaining time until rate limit reset
  const formatRateLimitReset = () => {
    if (!rateLimitReset) return "";
    
    const now = Date.now();
    const timeLeft = Math.max(0, rateLimitReset - now);
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursLeft}h ${minutesLeft}m`;
  };
  
  // Map traditional status to detailed progress status
  const mapStatusToProgressStatus = (status: string): OrderStatus => {
    switch (status) {
      case 'pending_payment':
        return 'pending_payment';
      case 'payment_verified':
        return 'payment_verified';
      case 'document_verification':
        return 'document_verification';
      case 'pending_document':
        return 'pending_document';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'payment_expired':
        return 'payment_expired';
      default:
        // Return a safe default if we get an unknown status
        return 'pending_payment';
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    // Reset previous errors
    setFormError(null);
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError(t.formErrors.invalidEmail);
      return false;
    }
    
    // Invoice ID validation
    if (invoiceId.trim().length < 6) {
      setFormError(t.formErrors.invalidInvoice);
      return false;
    }
    
    return true;
  };

  const searchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiting
    if (isRateLimited) {
      setError(t.rateLimitError);
      return;
    }
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Increment search count and check if rate limit is reached
    const newCount = incrementSearchCount();
    if (newCount >= 5) {
      setError(t.rateLimitError);
      return;
    }
    
    // Reset states
    setError(null);
    setSuccessMessage(null);
    setOrder(null);
    setLoading(true);
    setSearched(true);
    
    try {
      
      // First try to search by exact email and invoice ID match
      const { data: orderResults, error: searchError } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('email', email.trim())
        .eq('invoice_id', invoiceId.trim());
      
      // Initialize properly as null if undefined
      let orders: any[] | null = orderResults || null;
      
      // Only try alternative searches if exact match fails
      if ((!orders || orders.length === 0) && !searchError) {
        // Try with email as array and exact invoice ID
        const { data: arrayEmailResults, error: arrayEmailError } = await supabaseClient
          .from('orders')
          .select('*')
          .contains('email', [email.trim()])
          .eq('invoice_id', invoiceId.trim());
          
        if (!arrayEmailError && arrayEmailResults && arrayEmailResults.length > 0) {
          orders = arrayEmailResults;
        }
        
        // If still no results, try with invoice ID as array and exact email
        if ((!orders || orders.length === 0) && !arrayEmailError) {
          const { data: arrayInvoiceResults, error: arrayInvoiceError } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('email', email.trim())
            .contains('invoice_id', [invoiceId.trim()]);
            
          if (!arrayInvoiceError && arrayInvoiceResults && arrayInvoiceResults.length > 0) {
            orders = arrayInvoiceResults;
          }
        }
      }
      
      if (!orders || orders.length === 0) {
        setError(t.noOrderError);
        // Reset Turnstile after failed search
        resetTurnstile();
        // Increment submission attempts for brute force protection
        setSubmissionAttempts(prevAttempts => prevAttempts + 1);
      } else {
        // Return the most recent order if multiple found
        // Sort by created_at in descending order
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Process the order with additional progress information
        const foundOrder = orders[0];
        
        // Ensure status is a valid OrderStatus type
        let processedStatus: OrderStatus;
        
        if (typeof foundOrder.status === 'string' && foundOrder.status) {
          // First, check if we need to map the status
          processedStatus = mapStatusToProgressStatus(foundOrder.status);
        } else {
          // If status is undefined, null, or not a string, use a default
          processedStatus = 'pending_payment';
        }
        
        // Create a safe processed order object
        const processedOrder: Order = {
          ...foundOrder,
          status: processedStatus,
          // Ensure other required fields have default values if missing
          id: foundOrder.id || '',
          name: foundOrder.name || '',
          email: foundOrder.email || '',
          service_name: foundOrder.service_name || '',
          invoice_id: foundOrder.invoice_id || null,
          payment_url: foundOrder.payment_url || null,
          document_path: foundOrder.document_path || null,
          created_at: foundOrder.created_at || new Date().toISOString(),
          revision_message: foundOrder.revision_message || null
        };
        
        setOrder(processedOrder);
        
        // Reset submission attempts on successful search
        setSubmissionAttempts(0);
      }
    } catch (err: unknown) {
      // Fix: Add proper typing for the error
      const errorMessage = err instanceof Error ? err.message : 'Failed to search for order';
      console.error('Search error:', err);
      setError(errorMessage);
      // Reset Turnstile after error
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };
  
  // Handle document file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentFile(e.target.files[0]);
    }
  };
  
  // Handle document drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDocumentFile(e.dataTransfer.files[0]);
    }
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Handle document upload
  const uploadDocument = async () => {
    if (!documentFile || !order) return;
    
    setUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', documentFile);
      formData.append('orderId', order.id);
      
      const response = await fetch('/api/upload-revision', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      // Update the local order state to reflect the document upload
      setOrder({
        ...order,
        status: 'document_verification', // change status to document verification
        document_path: URL.createObjectURL(documentFile), // temporarily show the file
      });
      
      // Show success message with success styling instead of error styling
      setSuccessMessage(t.uploadSuccessMessage);
      setError(null); // Clear any existing errors
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Close the upload form
      setShowUploadForm(false);
      setDocumentFile(null);
    } catch (err: unknown) {
      // Fix: Add proper typing for the error
      const errorMessage = err instanceof Error ? err.message : t.uploadErrorMessage;
      console.error('Upload error:', err);
      setError(errorMessage);
      setSuccessMessage(null);
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Function to view document
  //const viewDocument = (orderId: string) => {
    //try {
      //const timestamp = Date.now();
      //const url = `/api/documents/${orderId}?timestamp=${timestamp}`;
      //window.open(url, '_blank');
    //} catch (err: unknown) {
      //const errorMessage = err instanceof Error ? err.message : language === 'id' ? "Kesalahan tidak diketahui" : "Unknown error";
      //setError(`${language === 'id' ? 'Gagal membuka dokumen: ' : 'Failed to open document: '}${errorMessage}`);
    //}
  //};

  // Helper function to display values (handling both string and array types)
  const displayValue = (value: string | string[] | null | undefined): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  };

  // Function to format date to DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      // Fix: Removed unused 'error' variable
      return dateString;
    }
  };

  // Set Turnstile visible when form is touched
  useEffect(() => {
    if (email.trim() || invoiceId.trim()) {
      setTurnstileVisible(true);
    }
  }, [email, invoiceId, setTurnstileVisible]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <motion.h1 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white"
      >
        {t.title}
      </motion.h1>
      
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.findOrderTitle}</h2>
        
        {!isRateLimited ? (
          <>
            <form onSubmit={searchOrder} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.emailLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t.emailLabel}
                  autoComplete="off"
                />
              </div>
              
              <div>
                <label htmlFor="invoiceId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.invoiceIdLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="invoiceId"
                  required
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t.invoiceIdLabel}
                  autoComplete="off"
                />
              </div>
              
              {/* Form error message */}
              {formError && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}
              
              {/* Display remaining searches */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t.remainingSearches.replace('{count}', (5 - searchCount).toString())}
              </div>
              
              {/* Add Turnstile component */}
              {turnstileVisible && (
                <div className="mt-4">
                  <div className="flex justify-center">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={siteKey || ''}
                      onSuccess={handleTurnstileSuccess}
                      onError={handleTurnstileError}
                      onExpire={handleTurnstileExpire}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading || !email.trim() || !invoiceId.trim() || !turnstileToken}
                className={`w-full py-3 px-4 text-white font-medium rounded-md transition duration-150 ${
                  loading || !email.trim() || !invoiceId.trim() || !turnstileToken
                    ? 'bg-gray-400 dark:bg-gray-600' 
                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t.searchingText}
                  </span>
                ) : (
                  t.searchButton
                )}
              </button>
            </form>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{t.rateLimitError}</p>
                {rateLimitReset && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {formatRateLimitReset()}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Order Details Section */}
      {order && (
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-6"
        >
          <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <motion.h2 
              variants={slideIn}
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              {t.orderDetailsTitle}
            </motion.h2>
          </div>
          
          {/* Progress Bar */}
          {order.status && (
            <OrderProgressBar 
              currentStatus={order.status}
              revisionMessage={order.revision_message || undefined}
            />
          )}
          
          <div className="p-6">
            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
            >
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.orderId}</h3>
                <p className="font-mono text-sm text-gray-900 dark:text-gray-200">{order.id}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.orderDate}</h3>
                <p className="text-gray-900 dark:text-gray-200">{formatDate(order.created_at)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.customerName}</h3>
                <p className="text-gray-900 dark:text-gray-200">{displayValue(order.name)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.email}</h3>
                <p className="text-gray-900 dark:text-gray-200">{displayValue(order.email)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.service}</h3>
                <p className="text-gray-900 dark:text-gray-200">{displayValue(order.service_name)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.status}</h3>
                <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </motion.div>
              
              {order.invoice_id && (
                <motion.div variants={slideIn}>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.invoiceId}</h3>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-200">{displayValue(order.invoice_id)}</p>
                </motion.div>
              )}
            </motion.div>
            
            <motion.div 
              variants={staggerContainer}
              className="border-t border-gray-200 dark:border-gray-600 pt-6 flex flex-col gap-4"
            >
              {order.payment_url && order.status === 'pending_payment' && (
                <motion.div variants={slideIn}>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t.payment}</h3>
                  <a 
                    href={order.payment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md text-sm transition duration-150"
                  >
                    {t.paymentButton}
                  </a>
                </motion.div>
              )}
              {/*
              {order.document_path && (
                <motion.div variants={slideIn}>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t.document}</h3>
                  <button
                    onClick={() => viewDocument(order.id)}
                    className="inline-flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-md text-sm transition duration-150"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {t.viewDocumentButton}
                  </button>
                </motion.div>
              )}*/}
              
              {/* Show Document Upload Button for Pending Document status */}
              {order.status === 'pending_document' && !showUploadForm && (
                <motion.div variants={slideIn}>
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="inline-flex items-center bg-amber-100 hover:bg-amber-200 dark:bg-amber-700 dark:hover:bg-amber-600 text-amber-800 dark:text-amber-200 font-medium py-2 px-4 rounded-md text-sm transition duration-150"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    {t.uploadRevisionButton}
                  </button>
                </motion.div>
              )}
              
              {/* Document Upload Form */}
              {showUploadForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20"
                >
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">
                    {t.documentUploadTitle}
                  </h3>
                  
                  <div 
                    className={`border-2 border-dashed ${documentFile ? 'border-amber-400' : 'border-gray-300'} dark:border-gray-600 rounded-lg p-6 mb-4 text-center cursor-pointer hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <svg className="mx-auto h-10 w-10 text-amber-500 dark:text-amber-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    
                    {documentFile ? (
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                        {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t.fileInputLabel}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowUploadForm(false);
                        setDocumentFile(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition duration-150"
                    >
                      {t.cancelButton}
                    </button>
                    
                    <button
                      onClick={uploadDocument}
                      disabled={!documentFile || uploadLoading}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md transition duration-150 flex items-center ${
                        !documentFile || uploadLoading
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
                      }`}
                    >
                      {uploadLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t.uploadingText}
                        </>
                      ) : (
                        t.uploadButton
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
      
      {/* Notification Container at the Bottom */}
      <div className="mt-6 mb-2">
        {/* No results message - moved to bottom but still within container */}
        {searched && !loading && !error && !order && !isRateLimited && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-lg mb-4"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">{t.noOrderError}</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Error message - moved to bottom but still within container */}
        {error && !isRateLimited && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg mb-4"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Success message - moved to bottom but still within container */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded-lg mb-4"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );}