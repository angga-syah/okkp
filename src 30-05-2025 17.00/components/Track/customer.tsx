// customer.tsx - Enhanced Security Version

"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseClient } from '@/lib/sb_client';
import { useLanguage } from "../Header/Bahasa";
import { motion } from "framer-motion";
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from '../Order/turnstile';
import OrderProgressBar from './bar';
import { useSearchParams } from 'next/navigation';
import { OrderStatus } from '@/lib/order';
import { getStatusColor } from '../Wali/status';
import { SecurityValidator, EnhancedRateLimiter } from '@/lib/enhanced-security';

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

// Enhanced rate limiting with stricter controls for serverless environment
const useEnhancedRateLimiter = () => {
  const [searchCount, setSearchCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [nextAllowedAttempt, setNextAllowedAttempt] = useState<number>(0);
  const [sessionLocked, setSessionLocked] = useState(false);
  
  // Stricter limits for Vercel hobby/Supabase free tier
  const MAX_SEARCHES_PER_HOUR = 3;
  const MAX_SEARCHES_PER_DAY = 10;
  const MAX_CONSECUTIVE_FAILURES = 3;
  const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  const PROGRESSIVE_DELAY_BASE = 10000; // 10 seconds base delay
  const SESSION_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes session lockout
  
  // Form interaction tracking for bot detection
  const [formStartTime] = useState(Date.now());
  const [userInteractions, setUserInteractions] = useState({
    mouseMovements: 0,
    keystrokes: 0,
    focusEvents: 0,
    clipboardEvents: 0
  });

  // Track user interactions for bot detection
  useEffect(() => {
    let mouseMoveCount = 0;
    let keystrokeCount = 0;
    let focusCount = 0;
    let clipboardCount = 0;

    const handleMouseMove = () => {
      mouseMoveCount++;
      if (mouseMoveCount % 10 === 0) { // Update every 10 movements to reduce re-renders
        setUserInteractions(prev => ({ ...prev, mouseMovements: mouseMoveCount }));
      }
    };

    const handleKeyDown = () => {
      keystrokeCount++;
      setUserInteractions(prev => ({ ...prev, keystrokes: keystrokeCount }));
    };

    const handleFocus = () => {
      focusCount++;
      setUserInteractions(prev => ({ ...prev, focusEvents: focusCount }));
    };

    const handlePaste = () => {
      clipboardCount++;
      setUserInteractions(prev => ({ ...prev, clipboardEvents: clipboardCount }));
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('keydown', handleKeyDown, { passive: true });
    document.addEventListener('focusin', handleFocus, { passive: true });
    document.addEventListener('paste', handlePaste, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Initialize rate limiter from localStorage with enhanced error handling
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('orderSearchData');
      if (storedData) {
        const data = JSON.parse(storedData);
        const now = Date.now();
        
        // Validate stored data structure
        if (typeof data === 'object' && data.timestamp && typeof data.timestamp === 'number') {
          const hoursPassed = (now - data.timestamp) / (1000 * 60 * 60);
          
          // Reset daily if more than 24 hours have passed
          if (hoursPassed >= 24) {
            const resetData = { 
              count: 0, 
              timestamp: now,
              failures: 0,
              lastFailure: null,
              sessionLocked: false
            };
            localStorage.setItem('orderSearchData', JSON.stringify(resetData));
            setSearchCount(0);
            setIsRateLimited(false);
            setRateLimitReset(null);
            setConsecutiveFailures(0);
            setNextAllowedAttempt(0);
            setSessionLocked(false);
          } else {
            // Load existing data with validation
            setSearchCount(Math.max(0, Math.min(data.count || 0, MAX_SEARCHES_PER_DAY)));
            setConsecutiveFailures(Math.max(0, Math.min(data.failures || 0, 10)));
            
            // Check session lockout
            if (data.sessionLocked && data.sessionLockTime) {
              const sessionLockEnd = data.sessionLockTime + SESSION_LOCKOUT_DURATION;
              if (now < sessionLockEnd) {
                setSessionLocked(true);
                setIsRateLimited(true);
                setRateLimitReset(sessionLockEnd);
              }
            }
            
            // Check progressive delay
            if (data.lastFailure && data.failures > 0) {
              const delayDuration = Math.min(
                PROGRESSIVE_DELAY_BASE * Math.pow(2, Math.min(data.failures - 1, 5)),
                300000 // Max 5 minutes
              );
              const nextAttempt = data.lastFailure + delayDuration;
              
              if (now < nextAttempt) {
                setNextAllowedAttempt(nextAttempt);
                setIsRateLimited(true);
              }
            }
            
            // Apply rate limiting
            if (data.count >= MAX_SEARCHES_PER_HOUR || data.count >= MAX_SEARCHES_PER_DAY) {
              setIsRateLimited(true);
              if (data.count >= MAX_SEARCHES_PER_DAY) {
                setRateLimitReset(data.timestamp + LOCKOUT_DURATION);
              } else {
                setRateLimitReset(data.timestamp + (60 * 60 * 1000));
              }
            }
          }
        } else {
          throw new Error('Invalid stored data structure');
        }
      } else {
        // Initialize new session
        const initialData = { 
          count: 0, 
          timestamp: Date.now(),
          failures: 0,
          lastFailure: null,
          sessionLocked: false
        };
        localStorage.setItem('orderSearchData', JSON.stringify(initialData));
      }
    } catch (error) {
      console.warn('Rate limiter initialization error:', error);
      // Reset on any error to prevent exploitation
      try {
        const resetData = { 
          count: 0, 
          timestamp: Date.now(),
          failures: 0,
          lastFailure: null,
          sessionLocked: false
        };
        localStorage.setItem('orderSearchData', JSON.stringify(resetData));
      } catch (storageError) {
        console.error('localStorage not available:', storageError);
        // If localStorage is not available, use in-memory state only
      }
    }
  }, [LOCKOUT_DURATION, SESSION_LOCKOUT_DURATION]);
  
  // Enhanced bot detection
  const detectBotBehavior = useCallback((isSuccess: boolean): boolean => {
    const now = Date.now();
    const formDuration = now - formStartTime;
    
    // Check for bot-like behavior patterns
    const botIndicators: string[] = [];
    
    // Too fast form completion (less than 5 seconds)
    if (formDuration < 5000) {
      botIndicators.push('FAST_COMPLETION');
    }
    
    // No mouse movements but form completed
    if (userInteractions.mouseMovements === 0 && formDuration > 1000) {
      botIndicators.push('NO_MOUSE_MOVEMENT');
    }
    
    // Too many keystrokes for the form fields (indicating copy-paste or automation)
    if (userInteractions.keystrokes > 100) {
      botIndicators.push('EXCESSIVE_KEYSTROKES');
    }
    
    // Multiple clipboard events (indicating automated pasting)
    if (userInteractions.clipboardEvents > 2) {
      botIndicators.push('MULTIPLE_PASTE_EVENTS');
    }
    
    // No focus events but form submitted
    if (userInteractions.focusEvents === 0) {
      botIndicators.push('NO_FOCUS_EVENTS');
    }
    
    // Log bot indicators for monitoring (only in development)
    if (process.env.NODE_ENV === 'development' && botIndicators.length > 0) {
      console.warn('Bot behavior detected:', botIndicators);
    }
    
    // Consider it bot behavior if multiple indicators are present
    return botIndicators.length >= 2;
  }, [formStartTime, userInteractions]);
  
  const incrementSearchCount = useCallback((isSuccess: boolean = false) => {
    const now = Date.now();
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    
    let newFailures = consecutiveFailures;
    let lastFailure: number | null = null;
    let shouldLockSession = false;
    
    if (!isSuccess) {
      newFailures = consecutiveFailures + 1;
      lastFailure = now;
      setConsecutiveFailures(newFailures);
      
      // Check for bot behavior
      const isBotBehavior = detectBotBehavior(isSuccess);
      
      // Session lockout for too many consecutive failures or bot behavior
      if (newFailures >= MAX_CONSECUTIVE_FAILURES || isBotBehavior) {
        shouldLockSession = true;
        setSessionLocked(true);
        setIsRateLimited(true);
        setRateLimitReset(now + SESSION_LOCKOUT_DURATION);
      } else {
        // Progressive delay
        const delayDuration = Math.min(
          PROGRESSIVE_DELAY_BASE * Math.pow(2, newFailures - 1),
          300000 // Max 5 minutes
        );
        const nextAttempt = now + delayDuration;
        setNextAllowedAttempt(nextAttempt);
        setIsRateLimited(true);
      }
    } else {
      // Reset failures on success
      newFailures = 0;
      setConsecutiveFailures(0);
      setNextAllowedAttempt(0);
      setSessionLocked(false);
    }
    
    const dataToStore = { 
      count: newCount, 
      timestamp: now,
      failures: newFailures,
      lastFailure: lastFailure,
      sessionLocked: shouldLockSession,
      sessionLockTime: shouldLockSession ? now : null,
      userAgent: navigator.userAgent.substring(0, 100), // Store limited UA for tracking
      lastActivity: now
    };
    
    try {
      localStorage.setItem('orderSearchData', JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to update rate limit data:', error);
    }
    
    // Check if rate limit has been reached
    if (newCount >= MAX_SEARCHES_PER_HOUR || newCount >= MAX_SEARCHES_PER_DAY) {
      setIsRateLimited(true);
      if (newCount >= MAX_SEARCHES_PER_DAY) {
        setRateLimitReset(now + LOCKOUT_DURATION);
      } else {
        setRateLimitReset(now + (60 * 60 * 1000));
      }
    }
    
    return newCount;
  }, [searchCount, consecutiveFailures, detectBotBehavior, LOCKOUT_DURATION, SESSION_LOCKOUT_DURATION]);
  
  const getRemainingTime = useCallback(() => {
    if (sessionLocked && rateLimitReset) {
      return Math.max(0, rateLimitReset - Date.now());
    }
    if (nextAllowedAttempt && nextAllowedAttempt > 0) {
      return Math.max(0, nextAllowedAttempt - Date.now());
    }
    if (rateLimitReset) {
      return Math.max(0, rateLimitReset - Date.now());
    }
    return 0;
  }, [sessionLocked, rateLimitReset, nextAllowedAttempt]);
  
  return { 
    searchCount, 
    isRateLimited, 
    rateLimitReset, 
    incrementSearchCount,
    remainingTime: getRemainingTime(),
    maxSearches: MAX_SEARCHES_PER_HOUR,
    consecutiveFailures,
    sessionLocked,
    userInteractions
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
  
  // Enhanced security validation states
  const [inputValidation, setInputValidation] = useState({
    email: { isValid: true, message: '' },
    invoiceId: { isValid: true, message: '' }
  });

  // Security monitoring state
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);

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
  
  // Enhanced rate limiting integration
  const { 
    searchCount, 
    isRateLimited, 
    rateLimitReset, 
    incrementSearchCount,
    remainingTime,
    maxSearches,
    consecutiveFailures,
    sessionLocked,
    userInteractions
  } = useEnhancedRateLimiter();

  const searchParams = useSearchParams();

  // Enhanced URL parameter validation
  useEffect(() => {
    try {
      const emailParam = searchParams.get('email'); 
      const invoiceIdParam = searchParams.get('invoiceId');
      
      if (emailParam) {
        // Enhanced validation for URL parameters
        const emailValidation = SecurityValidator.validateAndSanitize(emailParam, {
          maxLength: 254,
          checkXSS: true,
          checkSQLInjection: true
        });
        
        if (emailValidation.isValid && SecurityValidator.validateEmail(emailValidation.sanitized)) {
          setEmail(emailValidation.sanitized);
        } else {
          console.warn('Invalid email parameter detected');
          setSecurityAlerts(prev => [...prev, 'INVALID_EMAIL_PARAMETER']);
        }
      }
      
      if (invoiceIdParam) {
        const invoiceValidation = SecurityValidator.validateAndSanitize(invoiceIdParam, {
          maxLength: 50,
          checkXSS: true,
          checkSQLInjection: true,
          checkPathTraversal: true
        });
        
        if (invoiceValidation.isValid) {
          setInvoiceId(invoiceValidation.sanitized);
        } else {
          console.warn('Invalid invoice ID parameter detected');
          setSecurityAlerts(prev => [...prev, 'INVALID_INVOICE_PARAMETER']);
        }
      }
    } catch (error) {
      console.warn('URL parameter validation error:', error);
      setSecurityAlerts(prev => [...prev, 'URL_PARAMETER_ERROR']);
    }
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
      rateLimitError: "Too many search attempts. Please wait before trying again.",
      progressiveDelayError: "Please wait {seconds} seconds before next attempt.",
      sessionLockedError: "Session temporarily locked due to suspicious activity. Please wait {minutes} minutes.",
      formErrors: {
        invalidEmail: "Please enter a valid email address",
        invalidInvoice: "Invoice ID must be 6-50 characters and contain only letters, numbers, and hyphens",
        captchaRequired: "Please complete verification",
        suspiciousInput: "Invalid input detected. Please check your entry.",
        botDetected: "Automated behavior detected. Please try again.",
      },
      remainingSearches: "Remaining searches this hour: {count}",
      securityWarning: "Multiple failed attempts detected. Additional verification required.",
      statusMessages: {
        pending: "Your order is pending due to payment or document verification, or because payment hasn't been completed yet. Please complete the payment if you haven't already.",
        processing: "Your order is currently being processed. We'll notify you when it's completed.",
        completed: "Your order has been completed. Thank you!",
        cancelled: "This order has been cancelled. Please contact support if you have any questions."
      },
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
      rateLimitError: "Terlalu banyak percobaan pencarian. Silakan tunggu sebelum mencoba lagi.",
      progressiveDelayError: "Silakan tunggu {seconds} detik sebelum percobaan berikutnya.",
      sessionLockedError: "Sesi dikunci sementara karena aktivitas mencurigakan. Silakan tunggu {minutes} menit.",
      formErrors: {
        invalidEmail: "Masukkan alamat email yang valid",
        invalidInvoice: "No. Invoice harus 6-50 karakter dan hanya boleh mengandung huruf, angka, dan tanda hubung",
        captchaRequired: "Harap selesaikan verifikasi",
        suspiciousInput: "Input yang mencurigakan terdeteksi. Silakan periksa entri Anda.",
        botDetected: "Terdeteksi perilaku otomatis. Silakan coba lagi.",
      },
      remainingSearches: "Sisa pencarian jam ini: {count}",
      securityWarning: "Beberapa percobaan gagal terdeteksi. Verifikasi tambahan diperlukan.",
      statusMessages: {
        pending: "Pesanan Anda tertunda karena menunggu verifikasi pembayaran atau dokumen, atau mungkin pembayaran belum dilakukan, silakan selesaikan pembayaran jika Anda belum melakukannya.",
        processing: "Pesanan Anda sedang diproses. Kami akan memberi tahu Anda ketika selesai.",
        completed: "Pesanan Anda telah selesai. Terima kasih!",
        cancelled: "Pesanan ini telah dibatalkan. Silakan hubungi dukungan jika Anda memiliki pertanyaan."
      },
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
  
  // Format remaining time with enhanced display
  const formatRemainingTime = useCallback(() => {
    if (remainingTime <= 0) return "";
    
    const seconds = Math.ceil(remainingTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, [remainingTime]);
  
  // Map traditional status to detailed progress status
  const mapStatusToProgressStatus = (status: string): OrderStatus => {
    const validStatuses: OrderStatus[] = [
      'pending_payment', 'payment_verified', 'document_verification',
      'pending_document', 'processing', 'completed', 'cancelled', 'payment_expired'
    ];
    
    if (validStatuses.includes(status as OrderStatus)) {
      return status as OrderStatus;
    }
    
    return 'pending_payment';
  };
  
  // Enhanced form validation with comprehensive security checks
  const validateForm = useCallback((): boolean => {
    setFormError(null);
    let isValid = true;
    
    // Validate and sanitize email
    const emailValidation = SecurityValidator.validateAndSanitize(email.trim(), {
      maxLength: 254,
      checkXSS: true,
      checkSQLInjection: true
    });
    
    if (!emailValidation.isValid) {
      setInputValidation(prev => ({
        ...prev,
        email: { isValid: false, message: t.formErrors.suspiciousInput }
      }));
      setFormError(t.formErrors.suspiciousInput);
      setSecurityAlerts(prev => [...prev, 'SUSPICIOUS_EMAIL_INPUT']);
      return false;
    }
    
    if (!SecurityValidator.validateEmail(emailValidation.sanitized)) {
      setInputValidation(prev => ({
        ...prev,
        email: { isValid: false, message: t.formErrors.invalidEmail }
      }));
      setFormError(t.formErrors.invalidEmail);
      isValid = false;
    } else {
      setInputValidation(prev => ({
        ...prev,
        email: { isValid: true, message: '' }
      }));
    }
    
    // Validate and sanitize invoice ID
    const invoiceValidation = SecurityValidator.validateAndSanitize(invoiceId.trim(), {
      maxLength: 50,
      checkXSS: true,
      checkSQLInjection: true,
      checkPathTraversal: true
    });
    
    if (!invoiceValidation.isValid) {
      setInputValidation(prev => ({
        ...prev,
        invoiceId: { isValid: false, message: t.formErrors.suspiciousInput }
      }));
      setFormError(t.formErrors.suspiciousInput);
      setSecurityAlerts(prev => [...prev, 'SUSPICIOUS_INVOICE_INPUT']);
      return false;
    }
    
    // Enhanced invoice ID validation
    const invoicePattern = /^[a-zA-Z0-9\-]{6,50}$/;
    if (!invoicePattern.test(invoiceValidation.sanitized)) {
      setInputValidation(prev => ({
        ...prev,
        invoiceId: { isValid: false, message: t.formErrors.invalidInvoice }
      }));
      setFormError(t.formErrors.invalidInvoice);
      isValid = false;
    } else {
      setInputValidation(prev => ({
        ...prev,
        invoiceId: { isValid: true, message: '' }
      }));
    }
    
    return isValid;
  }, [email, invoiceId, t.formErrors]);

  // Enhanced search order function with comprehensive security
  const searchOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for session lockout
    if (sessionLocked) {
      const minutes = Math.ceil(remainingTime / 60000);
      setError(t.sessionLockedError.replace('{minutes}', minutes.toString()));
      return;
    }
    
    // Check rate limiting
    if (isRateLimited) {
      if (remainingTime > 0) {
        const seconds = Math.ceil(remainingTime / 1000);
        setError(t.progressiveDelayError.replace('{seconds}', seconds.toString()));
      } else {
        setError(t.rateLimitError);
      }
      return;
    }
    
    // Validate form with enhanced security
    if (!validateForm()) {
      return;
    }
    
    // Check turnstile token
    if (!turnstileToken) {
      setFormError(t.formErrors.captchaRequired);
      return;
    }
    
    // Reset states
    setError(null);
    setSuccessMessage(null);
    setOrder(null);
    setLoading(true);
    setSearched(true);
    
    try {
      // Sanitize inputs before database query
      const sanitizedEmail = SecurityValidator.validateAndSanitize(email.trim(), {
        maxLength: 254,
        checkXSS: true,
        checkSQLInjection: true
      }).sanitized;
      
      const sanitizedInvoiceId = SecurityValidator.validateAndSanitize(invoiceId.trim(), {
        maxLength: 50,
        checkXSS: true,
        checkSQLInjection: true,
        checkPathTraversal: true
      }).sanitized;
      
      // Add delay to prevent timing attacks
      const startTime = Date.now();
      const minDelay = 1000; // Minimum 1 second delay
      
// Use exact match only for security with additional constraints
      const { data: orderResults, error: searchError } = await supabaseClient
        .from('orders')
        .select(`
          id,
          name,
          email,
          service_name,
          invoice_id,
          payment_url,
          document_path,
          status,
          created_at,
          revision_message
        `)
        .eq('email', sanitizedEmail)
        .eq('invoice_id', sanitizedInvoiceId)
        .limit(1)
        .single(); // Use single() to ensure only one result
      
      // Ensure minimum delay to prevent timing attacks
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
      }
      
      if (searchError) {
        console.error('Database search error:', searchError);
        
        // Don't expose internal error details
        if (searchError.code === 'PGRST116') {
          // No rows returned - this is expected for not found
          incrementSearchCount(false);
          setError(t.noOrderError);
        } else {
          // Other database errors
          incrementSearchCount(false);
          setError('Service temporarily unavailable. Please try again later.');
        }
        
        resetTurnstile();
        setSubmissionAttempts(prevAttempts => prevAttempts + 1);
        return;
      }
      
      if (!orderResults) {
        incrementSearchCount(false);
        setError(t.noOrderError);
        resetTurnstile();
        setSubmissionAttempts(prevAttempts => prevAttempts + 1);
        return;
      }
      
      // Record successful attempt
      incrementSearchCount(true);
      
      // Process the order with additional validation
      const foundOrder = orderResults;
      
      // Validate order data integrity
      if (!foundOrder.id || !foundOrder.email || !foundOrder.invoice_id) {
        setError('Invalid order data. Please contact support.');
        return;
      }
      
      // Ensure status is a valid OrderStatus type
      const processedStatus: OrderStatus = mapStatusToProgressStatus(foundOrder.status || 'pending_payment');
      
      // Create a safe processed order object with sanitization
      const processedOrder: Order = {
        id: SecurityValidator.validateAndSanitize(foundOrder.id, { maxLength: 50 }).sanitized,
        name: foundOrder.name || '',
        email: SecurityValidator.validateAndSanitize(foundOrder.email, { maxLength: 254 }).sanitized,
        service_name: foundOrder.service_name || '',
        invoice_id: foundOrder.invoice_id || null,
        payment_url: foundOrder.payment_url || null,
        document_path: foundOrder.document_path || null,
        status: processedStatus,
        created_at: foundOrder.created_at || new Date().toISOString(),
        revision_message: foundOrder.revision_message || null
      };
      
      setOrder(processedOrder);
      setSubmissionAttempts(0); // Reset on success
      
    } catch (err: unknown) {
      // Record failed attempt
      incrementSearchCount(false);
      
      // Enhanced error handling without exposing internal details
      let errorMessage = 'An unexpected error occurred';
      
      if (err instanceof Error) {
        console.error('Search error details:', err);
        
        // Categorize errors without exposing details
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
      }
      
      setError(errorMessage);
      resetTurnstile();
      setSecurityAlerts(prev => [...prev, 'SEARCH_ERROR']);
    } finally {
      setLoading(false);
    }
  }, [
    sessionLocked, remainingTime, isRateLimited, validateForm, turnstileToken, 
    email, invoiceId, incrementSearchCount, resetTurnstile, setSubmissionAttempts,
    t.sessionLockedError, t.progressiveDelayError, t.rateLimitError, 
    t.formErrors.captchaRequired, t.noOrderError
  ]);
  
  // Enhanced file validation with comprehensive security checks
  const validateFile = useCallback((file: File): { isValid: boolean; message?: string } => {
    // File size limit (10MB for serverless environment)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, message: 'File size must be less than 10MB' };
    }
    
    if (file.size === 0) {
      return { isValid: false, message: 'Empty files are not allowed' };
    }
    
    // Comprehensive allowed file types for Vercel/Supabase
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/rar'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Only PDF, DOC, DOCX, JPG, PNG, ZIP, and RAR files are allowed' };
    }
    
    // Enhanced file name validation
    const nameValidation = SecurityValidator.validateAndSanitize(file.name, {
      maxLength: 255,
      checkXSS: true,
      checkPathTraversal: true
    });
    
    if (!nameValidation.isValid) {
      return { isValid: false, message: 'Invalid file name detected' };
    }
    
    // Check for malicious file extensions
    const fileName = file.name.toLowerCase();
    const maliciousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar',
      '.php', '.asp', '.aspx', '.jsp', '.html', '.htm', '.ps1', '.sh'
    ];
    
    for (const ext of maliciousExtensions) {
      if (fileName.includes(ext)) {
        return { isValid: false, message: 'File type not allowed for security reasons' };
      }
    }
    
    // Check for suspicious file name patterns
    const suspiciousPatterns = [
      /\.\./,           // Directory traversal
      /\//,             // Path separators
      /\\/,             // Windows path separators
      /[\x00-\x1F]/,    // Control characters
      /^\.+$/,          // Hidden files
      /\.(php|jsp|asp|exe|bat|cmd|scr|vbs|js|jar|html|htm)$/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        return { isValid: false, message: 'File name contains invalid characters' };
      }
    }
    
    return { isValid: true };
  }, []);
  
  // Handle document file selection with enhanced validation
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      
      if (validation.isValid) {
        setDocumentFile(file);
        setError(null);
      } else {
        setError(validation.message || 'Invalid file');
        setDocumentFile(null);
        setSecurityAlerts(prev => [...prev, 'INVALID_FILE_UPLOAD']);
      }
    }
  }, [validateFile]);
  
  // Handle document drop with validation
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);
      
      if (validation.isValid) {
        setDocumentFile(file);
        setError(null);
      } else {
        setError(validation.message || 'Invalid file');
        setDocumentFile(null);
        setSecurityAlerts(prev => [...prev, 'INVALID_FILE_DROP']);
      }
    }
  }, [validateFile]);
  
  // Prevent default drag behavior
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // Enhanced document upload with better error handling and security
  const uploadDocument = useCallback(async () => {
    if (!documentFile || !order) return;
    
    // Validate file again before upload
    const validation = validateFile(documentFile);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid file');
      return;
    }
    
    setUploadLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', documentFile);
      formData.append('orderId', order.id);
      
      // Add security headers
      const response = await fetch('/api/upload-revision', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          // Turnstile token will be included via cookie by the hook
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error('Too many upload attempts. Please wait before trying again.');
        } else if (response.status === 413) {
          throw new Error('File size too large. Maximum 10MB allowed.');
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid file or request');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
        }
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }
      
      // Update the local order state to reflect the document upload
      setOrder({
        ...order,
        status: 'document_verification',
        document_path: result.path || order.document_path,
      });
      
      setSuccessMessage(t.uploadSuccessMessage);
      setError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Close the upload form
      setShowUploadForm(false);
      setDocumentFile(null);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.uploadErrorMessage;
      console.error('Upload error:', err);
      setError(errorMessage);
      setSuccessMessage(null);
      setSecurityAlerts(prev => [...prev, 'UPLOAD_ERROR']);
    } finally {
      setUploadLoading(false);
    }
  }, [documentFile, order, validateFile, t.uploadSuccessMessage, t.uploadErrorMessage]);

  // Helper function to display values safely
  const displayValue = useCallback((value: string | string[] | null | undefined): string => {
    if (Array.isArray(value)) {
      return value.map(v => SecurityValidator.validateAndSanitize(v, { maxLength: 200 }).sanitized).join(', ');
    }
    return SecurityValidator.validateAndSanitize(value || '', { maxLength: 200 }).sanitized;
  }, []);

  // Enhanced date formatting with error handling
  const formatDate = useCallback((dateString: string): string => {
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
      return dateString;
    }
  }, []);

  // Set Turnstile visible when form is touched
  useEffect(() => {
    if (email.trim() || invoiceId.trim()) {
      setTurnstileVisible(true);
    }
  }, [email, invoiceId, setTurnstileVisible]);

  // Enhanced input change handlers with real-time validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Basic length check before setting
    if (value.length <= 254) {
      setEmail(value);
    }
    
    // Clear previous validation on change
    setInputValidation(prev => ({
      ...prev,
      email: { isValid: true, message: '' }
    }));
    setFormError(null);
  }, []);

  const handleInvoiceIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Basic length and pattern check before setting
    if (value.length <= 50 && /^[a-zA-Z0-9\-]*$/.test(value)) {
      setInvoiceId(value);
    }
    
    // Clear previous validation on change
    setInputValidation(prev => ({
      ...prev,
      invoiceId: { isValid: true, message: '' }
    }));
    setFormError(null);
  }, []);

  // Memoized security status for performance
  const securityStatus = useMemo(() => {
    return {
      hasSecurityAlerts: securityAlerts.length > 0,
      alertCount: securityAlerts.length,
      isHighRisk: consecutiveFailures > 2 || securityAlerts.length > 3,
      userInteractionScore: userInteractions.mouseMovements + userInteractions.keystrokes + userInteractions.focusEvents
    };
  }, [securityAlerts.length, consecutiveFailures, userInteractions]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <motion.h1 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900 dark:text-white"
      >
        {t.title}
      </motion.h1>
      
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
      >
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.findOrderTitle}</h2>
        
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
                  onChange={handleEmailChange}
                  className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                    !inputValidation.email.isValid 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  placeholder={t.emailLabel}
                  autoComplete="off"
                  maxLength={254}
                  spellCheck={false}
                />
                {!inputValidation.email.isValid && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {inputValidation.email.message}
                  </p>
                )}
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
                  onChange={handleInvoiceIdChange}
                  className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                    !inputValidation.invoiceId.isValid 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  placeholder={t.invoiceIdLabel}
                  autoComplete="off"
                  maxLength={50}
                  pattern="[a-zA-Z0-9\-]{6,50}"
                  spellCheck={false}
                />
                {!inputValidation.invoiceId.isValid && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {inputValidation.invoiceId.message}
                  </p>
                )}
              </div>
              
              {/* Form error message */}
              {formError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                </div>
              )}
              
              {/* Security warning for multiple failures */}
              {(consecutiveFailures > 2 || securityStatus.isHighRisk) && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t.securityWarning}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Display remaining searches */}
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>{t.remainingSearches.replace('{count}', (maxSearches - searchCount).toString())}</span>
                {securityStatus.userInteractionScore > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Human activity detected
                  </span>
                )}
              </div>
              
              {/* Turnstile component */}
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
                disabled={loading || !email.trim() || !invoiceId.trim() || !turnstileToken || isRateLimited}
                className={`w-full py-3 px-4 text-white font-medium rounded-md transition duration-200 ${
                  loading || !email.trim() || !invoiceId.trim() || !turnstileToken || isRateLimited
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transform hover:scale-[1.02] active:scale-[0.98]'
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
            className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {sessionLocked ? 
                    t.sessionLockedError.replace('{minutes}', Math.ceil(remainingTime / 60000).toString()) :
                    t.rateLimitError
                  }
                </p>
                {remainingTime > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {language === 'id' ? 'Coba lagi dalam: ' : 'Try again in: '}{formatRemainingTime()}
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
          className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden mb-6"
        >
          <div className="bg-gray-100 dark:bg-gray-700 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <motion.h2 
              variants={slideIn}
              className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white"
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
          
          <div className="p-4 sm:p-6">
            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6"
            >
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.orderId}</h3>
                <p className="font-mono text-sm break-all text-gray-900 dark:text-gray-200">{order.id}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.orderDate}</h3>
                <p className="text-gray-900 dark:text-gray-200">{formatDate(order.created_at)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.customerName}</h3>
                <p className="text-gray-900 dark:text-gray-200 break-words">{displayValue(order.name)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.email}</h3>
                <p className="text-gray-900 dark:text-gray-200 break-all">{displayValue(order.email)}</p>
              </motion.div>
              
              <motion.div variants={slideIn}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.service}</h3>
                <p className="text-gray-900 dark:text-gray-200 break-words">{displayValue(order.service_name)}</p>
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
                  <p className="font-mono text-sm break-all text-gray-900 dark:text-gray-200">{displayValue(order.invoice_id)}</p>
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
                    className="inline-block bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md text-sm transition duration-200 transform hover:scale-105 active:scale-95"
                  >
                    {t.paymentButton}
                  </a>
                </motion.div>
              )}
              
              {/* Document Upload Button for Pending Document status */}
              {order.status === 'pending_document' && !showUploadForm && (
                <motion.div variants={slideIn}>
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="inline-flex items-center bg-amber-100 hover:bg-amber-200 dark:bg-amber-700 dark:hover:bg-amber-600 text-amber-800 dark:text-amber-200 font-medium py-2 px-4 rounded-md text-sm transition duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    {t.uploadRevisionButton}
                  </button>
                </motion.div>
              )}
              
              {/* Enhanced Document Upload Form */}
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
                    className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer transition-all duration-200 ${
                      documentFile 
                        ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
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
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.rar,.zip"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    
                    {documentFile ? (
                      <div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">
                          {documentFile.name}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {language === 'id' ? 'Klik untuk mengganti file' : 'Click to change file'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {t.fileInputLabel}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {language === 'id' ? 'PDF, RAR, ZIP, DOC, DOCX, JPG, PNG (maks. 10MB)' : 'PDF, RAR, ZIP, DOC, DOCX, JPG, PNG (max. 10MB)'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowUploadForm(false);
                        setDocumentFile(null);
                        setError(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition duration-200 order-2 sm:order-1"
                    >
                      {t.cancelButton}
                    </button>
                    
                    <button
                      onClick={uploadDocument}
                      disabled={!documentFile || uploadLoading}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md transition duration-200 flex items-center justify-center order-1 sm:order-2 ${
                        !documentFile || uploadLoading
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 transform hover:scale-105 active:scale-95'
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
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                          </svg>
                          {t.uploadButton}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
      
      {/* Enhanced Notification Container */}
      <div className="mt-6 mb-2 space-y-4">
        {/* No results message */}
        {searched && !loading && !error && !order && !isRateLimited && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-lg"
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
        
        {/* Error message */}
        {error && !isRateLimited && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg"
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
        
        {/* Success message */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded-lg"
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

      {/* Development Mode Security Status (only visible in development) */}
      {process.env.NODE_ENV === 'development' && securityStatus.hasSecurityAlerts && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
          <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
            Security Status (Dev Mode)
          </h4>
          <div className="text-xs text-purple-600 dark:text-purple-300 space-y-1">
            <p>Security Alerts: {securityStatus.alertCount}</p>
            <p>User Interactions: {securityStatus.userInteractionScore}</p>
            <p>Risk Level: {securityStatus.isHighRisk ? 'High' : 'Normal'}</p>
            <p>Recent Alerts: {securityAlerts.slice(-3).join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}