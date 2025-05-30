//components/Order/index.tsx - Fixed Version with Email Display Fix
"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { useLanguage } from "../Header/Bahasa";
import { services, Service, translations } from './data';
import { useFileUpload } from './upload';
import { useTurnstile } from './turnstile';
import {
  isSuspiciousSubmission,
  validateName,
  validateEmail,
  collectBrowserData
} from './validasi';
import { createOrderComplete } from './service';

// Enhanced security configuration
const SECURITY_CONFIG = {
  MIN_FORM_TIME: 2000, // Minimum time to fill form (2 seconds)
  MAX_FORM_TIME: 3600000, // Maximum time to fill form (1 hour)
  MAX_INPUT_LENGTHS: {
    name: 100,
    email: 254
  },
  DEBOUNCE_DELAY: 300, // Debounce for input validation
  MAX_SUBMISSION_ATTEMPTS: 3,
  LOCKOUT_DURATION: 300000, // 5 minutes lockout
} as const;

// Enhanced input sanitization
function sanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    // Remove dangerous patterns
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    // Encode HTML entities
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
    
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

// Enhanced validation with security checks
function enhancedValidateName(name: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters' };
  }
  
  if (name.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.name) {
    return { isValid: false, message: 'Name is too long' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i, /javascript/i, /vbscript/i, /onload/i, /onerror/i,
    /<|>/, /["']/g, /\\/g, /\n|\r/g
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(name)) {
      return { isValid: false, message: 'Name contains invalid characters' };
    }
  }
  
  // Allow international names
  const nameRegex = /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F'-]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, message: 'Name contains invalid characters' };
  }
  
  return { isValid: true };
}

function enhancedValidateEmail(email: string): { isValid: boolean; message?: string } {
  if (!email || email.trim().length === 0) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (email.length > SECURITY_CONFIG.MAX_INPUT_LENGTHS.email) {
    return { isValid: false, message: 'Email is too long' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i, /javascript/i, /vbscript/i, /onload/i, /onerror/i,
    /<|>/, /\n|\r/g, /\s{2,}/g, /\.{2,}/g
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      return { isValid: false, message: 'Email contains invalid characters' };
    }
  }
  
  // RFC 5322 compliant validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }
  
  return { isValid: true };
}

// Enhanced form security tracker
class FormSecurityTracker {
  private static instance: FormSecurityTracker;
  private attempts: Map<string, { count: number; lastAttempt: number; blocked: boolean }> = new Map();
  private formStartTime: number = Date.now();
  
  static getInstance(): FormSecurityTracker {
    if (!FormSecurityTracker.instance) {
      FormSecurityTracker.instance = new FormSecurityTracker();
    }
    return FormSecurityTracker.instance;
  }
  
  setFormStartTime(): void {
    this.formStartTime = Date.now();
  }
  
  checkSubmissionTime(): { isValid: boolean; message?: string } {
    const now = Date.now();
    const timeTaken = now - this.formStartTime;
    
    if (timeTaken < SECURITY_CONFIG.MIN_FORM_TIME) {
      return { isValid: false, message: 'Form submitted too quickly' };
    }
    
    if (timeTaken > SECURITY_CONFIG.MAX_FORM_TIME) {
      return { isValid: false, message: 'Form session expired, please refresh' };
    }
    
    return { isValid: true };
  }
  
  checkAttemptLimit(identifier: string): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return { allowed: true };
    }
    
    // Check if lockout has expired
    if (record.blocked && (now - record.lastAttempt) > SECURITY_CONFIG.LOCKOUT_DURATION) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return { allowed: true };
    }
    
    if (record.blocked) {
      const remainingTime = SECURITY_CONFIG.LOCKOUT_DURATION - (now - record.lastAttempt);
      return { allowed: false, remainingTime: Math.ceil(remainingTime / 1000) };
    }
    
    record.count++;
    record.lastAttempt = now;
    
    if (record.count > SECURITY_CONFIG.MAX_SUBMISSION_ATTEMPTS) {
      record.blocked = true;
      return { allowed: false, remainingTime: Math.ceil(SECURITY_CONFIG.LOCKOUT_DURATION / 1000) };
    }
    
    return { allowed: true };
  }
}

// Debounced input hook for performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export default function Services() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];
  
  // Form state
  const [selectedService, setSelectedService] = useState<Service>(services[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [invoiceId, setInvoiceId] = useState(""); // Added invoice ID state
  
  // FIXED: Add separate state to preserve email for success display
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  
  // Security state
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [formTouched, setFormTouched] = useState(false);
  
  // Refs
  const formRef = useRef<HTMLFormElement | null>(null);
  const securityTracker = useMemo(() => FormSecurityTracker.getInstance(), []);
  
  // Debounced values for validation
  const debouncedName = useDebounce(customerName, SECURITY_CONFIG.DEBOUNCE_DELAY);
  const debouncedEmail = useDebounce(customerEmail, SECURITY_CONFIG.DEBOUNCE_DELAY);
  
  // Custom hooks
  const {
    siteKey,
    turnstileToken,
    turnstileVisible,
    turnstileRef,
    setTurnstileVisible,
    setSubmissionAttempts,
    handleTurnstileSuccess,
    handleTurnstileError,
    handleTurnstileExpire
  } = useTurnstile();
  
  const {
    documents,
    uploadStatus,
    error: fileUploadError,
    handleFileChange: originalHandleFileChange,
    resetFileUpload
  } = useFileUpload(language as 'en' | 'id');
  
  // Initialize form security tracker
  useEffect(() => {
    securityTracker.setFormStartTime();
  }, [securityTracker]);
  
  // Enhanced input validation with debouncing
  useEffect(() => {
    if (debouncedName && formTouched) {
      const validation = enhancedValidateName(debouncedName);
      setNameError(validation.isValid ? "" : validation.message || "Invalid name");
    }
  }, [debouncedName, formTouched]);
  
  useEffect(() => {
    if (debouncedEmail && formTouched) {
      const validation = enhancedValidateEmail(debouncedEmail);
      setEmailError(validation.isValid ? "" : validation.message || "Invalid email");
    }
  }, [debouncedEmail, formTouched]);
  
  // Show Turnstile when form starts being filled
  useEffect(() => {
    if ((customerName.trim().length > 2 || customerEmail.trim().length > 3) && !turnstileVisible) {
      setTurnstileVisible(true);
    }
  }, [customerName, customerEmail, turnstileVisible, setTurnstileVisible]);
  
  // Lockout timer
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutTime]);
  
  // Enhanced file upload handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Additional security checks
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(language === 'id' ? 'Ukuran file terlalu besar (maksimal 10MB)' : 'File size too large (max 10MB)');
      return;
    }
    
    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|php|js|jsp|asp|aspx|bat|cmd|scr|pif|com|vbs|ps1)$/i,
      /[<>:"|?*\x00-\x1f]/,
      /^\./,
      /\.\./
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      setError(language === 'id' ? 'Nama file tidak valid' : 'Invalid file name');
      return;
    }
    
    originalHandleFileChange(e);
    setTurnstileVisible(true);
    setFormTouched(true);
    setError("");
  }, [originalHandleFileChange, language,setTurnstileVisible]);
  
  // Enhanced event handlers with security
  const handleServiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedServiceId = parseInt(e.target.value);
    if (isNaN(selectedServiceId) || selectedServiceId < 1) {
      setError(language === 'id' ? 'Layanan tidak valid' : 'Invalid service');
      return;
    }
    
    const service = services.find(s => s.id === selectedServiceId);
    if (service) {
      setSelectedService(service);
      setError("");
    }
  }, [language]);
  
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = sanitizeInput(value, SECURITY_CONFIG.MAX_INPUT_LENGTHS.name);
    setCustomerName(sanitized);
    setFormTouched(true);
    
    // Clear error when user starts typing again
    if (nameError) setNameError("");
  }, [nameError]);
  
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = sanitizeInput(value, SECURITY_CONFIG.MAX_INPUT_LENGTHS.email);
    setCustomerEmail(sanitized);
    setFormTouched(true);
    
    // Clear error when user starts typing again
    if (emailError) setEmailError("");
  }, [emailError]);
  
  const handlePaymentRedirect = useCallback(() => {
    if (paymentUrl) {
      // Use window.open for better security
      const newWindow = window.open(paymentUrl, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        // Fallback if popup blocked
        window.location.href = paymentUrl;
      }
    }
  }, [paymentUrl]);
  
  // Enhanced form submission with comprehensive security
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    // Reset messages
    setError("");
    setSuccessMessage("");
    setPaymentUrl("");
    setInvoiceId(""); // Clear invoice ID
    
    // Check if form is locked
    if (isLocked) {
      setError(
        language === 'id' 
          ? `Formulir terkunci. Coba lagi dalam ${lockoutTime} detik.`
          : `Form locked. Try again in ${lockoutTime} seconds.`
      );
      return;
    }
    
    // Check submission attempts
    const browserData = collectBrowserData();
    const attemptCheck = securityTracker.checkAttemptLimit(browserData.sessionId);
    
    if (!attemptCheck.allowed) {
      setIsLocked(true);
      setLockoutTime(attemptCheck.remainingTime || 300);
      setError(
        language === 'id'
          ? `Terlalu banyak percobaan. Coba lagi dalam ${attemptCheck.remainingTime} detik.`
          : `Too many attempts. Try again in ${attemptCheck.remainingTime} seconds.`
      );
      return;
    }
    
    // Check form timing
    const timingCheck = securityTracker.checkSubmissionTime();
    if (!timingCheck.isValid) {
      setError(
        language === 'id'
          ? 'Waktu pengisian formulir tidak valid. Silakan refresh halaman.'
          : 'Invalid form timing. Please refresh the page.'
      );
      return;
    }
    
    // Enhanced validation
    const nameValidation = enhancedValidateName(customerName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.message || "Invalid name");
      setError(t.messages.invalidName);
      return;
    }
    
    const emailValidation = enhancedValidateEmail(customerEmail);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.message || "Invalid email");
      setError(t.messages.invalidEmail);
      return;
    }
    
    // Turnstile validation
    if (!turnstileToken) {
      setError(t.messages.securityVerification);
      return;
    }
    
    // Document validation
    if (!documents['allRequirements']) {
      setError(t.messages.uploadRequired);
      return;
    }
    
    // FIXED: Store submitted data before clearing form
    setSubmittedEmail(customerEmail.trim().toLowerCase());
    setSubmittedName(customerName.trim());
    
    setLoading(true);
    setSubmissionAttempts(prev => prev + 1);
    
    // Show processing message for long requests
    const processingTimeout = setTimeout(() => {
      setSuccessMessage(
        language === 'id' 
          ? "Sedang memproses pesanan Anda. Mohon tunggu..."
          : "Processing your order. Please wait..."
      );
    }, 3000);
    
    try {
      // Prepare form data with enhanced security
      const formData = new FormData();
      formData.append('customerName', customerName.trim());
      formData.append('customerEmail', customerEmail.trim().toLowerCase());
      formData.append('serviceId', selectedService.id.toString());
      formData.append('serviceName', selectedService.name);
      formData.append('amount', selectedService.price.toString());
      formData.append('allRequirements', documents['allRequirements']);
      formData.append('turnstileToken', turnstileToken);
      formData.append('sessionId', browserData.sessionId);
      formData.append('language', language);
      formData.append('sendPaymentLinkByEmail', 'true'); // Ensure this is set
      
      // Add security metadata
      formData.append('securityMetadata', JSON.stringify({
        formStartTime: securityTracker['formStartTime'],
        submissionTime: Date.now(),
        userAgent: navigator.userAgent.substring(0, 200), // Limit for security
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }));
      
      const result = await createOrderComplete(
        formData,
        browserData,
        browserData.sessionId,
        language
      );
      
      clearTimeout(processingTimeout);
      
      if (result.success) {
        setSuccessMessage(t.messages.orderSuccess);
        
        // Set both payment URL and invoice ID
        if (result.paymentUrl) {
          setPaymentUrl(result.paymentUrl);
        }
        if (result.invoiceId) {
          setInvoiceId(result.invoiceId);
        }
        
        // Reset form on success (but keep submitted data for display)
        if (formRef.current) {
          formRef.current.reset();
        }
        setCustomerName("");
        setCustomerEmail("");
        resetFileUpload();
        setSubmissionAttempts(0);
        setFormTouched(false);
        setNameError("");
        setEmailError("");
        
        // Auto-redirect if configured
        if (result.paymentUrl && process.env.NEXT_PUBLIC_AUTO_REDIRECT === 'true') {
          setTimeout(() => {
            window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
          }, 1500);
        }
      } else {
        setError(result.message || t.messages.submissionError);
        
        // Reset Turnstile on error
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
      }
      
    } catch (error: any) {
      clearTimeout(processingTimeout);
      
      // Handle different types of errors
      let errorMessage = t.messages.submissionError;
      
      if (error.message) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          errorMessage = error.message;
          setIsLocked(true);
          setLockoutTime(60); // 1 minute default lockout
        } else if (error.message.includes('timeout')) {
          errorMessage = language === 'id' 
            ? 'Koneksi timeout. Silakan coba lagi.'
            : 'Connection timeout. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = language === 'id'
            ? 'Masalah jaringan. Periksa koneksi internet Anda.'
            : 'Network issue. Check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setLoading(false);
    }
  }, [
    loading, isLocked, lockoutTime, language, customerName, customerEmail, 
    turnstileToken, documents, selectedService, t.messages, securityTracker,
    setSubmissionAttempts, resetFileUpload, turnstileRef
  ]);
  
  // Render component with enhanced mobile responsiveness - FIXED MOBILE PADDING
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-8 sm:pb-12 md:pb-16 px-2 sm:px-4 overflow-hidden">
      {/* Decorative elements - Optimized for mobile */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-100/20 dark:bg-blue-900/10 rounded-full blur-2xl -translate-y-1/4 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/20 dark:bg-blue-900/10 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>
      
      {/* Animated particles - Reduced for mobile performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-blue-400/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 - 50 + "%", 
              y: -20,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: ["0%", "100%"],
              x: `calc(${Math.random() * 100 - 50}% + ${Math.sin(index) * 30}px)`
            }}
            transition={{ 
              duration: Math.random() * 15 + 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              left: `${(index + 1) * 25}%`
            }}
          />
        ))}
      </div>
      
      {/* Form Card - Enhanced mobile responsive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl bg-white dark:bg-gray-800 p-3 sm:p-6 md:p-8 lg:p-10 shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl z-10 border border-blue-100/50 dark:border-blue-900/50 relative overflow-hidden"
      >
        {/* Decorative corner accents */}
        <div className="absolute -top-8 -right-8 sm:-top-16 sm:-right-16 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20"></div>
        <div className="absolute -bottom-8 -left-8 sm:-bottom-16 sm:-left-16 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-20"></div>
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative mb-4 sm:mb-6 md:mb-8"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {t.pageTitle}
          </h2>
          <div className="h-1 w-16 sm:w-20 md:w-24 bg-gradient-to-r from-blue-400 to-blue-600 mx-auto mt-2 rounded-full"></div>
          <p className="text-gray-500 dark:text-gray-400 text-center mt-2 sm:mt-3 text-xs sm:text-sm">
            {t.pageSubtitle}
          </p>
        </motion.div>
        
        {/* Success state with payment instructions - FIXED EMAIL DISPLAY */}
        {(paymentUrl || successMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            {/* Success Message */}
            <div className="p-3 sm:p-4 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 border-l-4 border-green-500 rounded-r-lg flex items-center mb-4 sm:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm sm:text-base">{successMessage || t.messages.orderSuccess}</span>
            </div>

            {/* FIXED: Display the stored submitted email */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-700 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {language === 'id' ? 'Periksa Email Anda' : 'Check Your Email'}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      {language === 'id' 
                        ? `Kami telah mengirim informasi pesanan dan ${paymentUrl ? 'link pembayaran' : 'instruksi pembayaran'} ke:`
                        : `We have sent order information and ${paymentUrl ? 'payment link' : 'payment instructions'} to:`
                      }
                    </p>
                    {/* FIXED: Use submittedEmail instead of customerEmail */}
                    <p className="font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 sm:px-3 py-1 rounded-lg border break-all">
                      {submittedEmail || 'your email address'}
                    </p>
                    {invoiceId && (
                      <p className="font-medium text-gray-600 dark:text-gray-400">
                        {language === 'id' ? 'ID Pesanan:' : 'Order ID:'} <span className="text-blue-600 dark:text-blue-400">{invoiceId}</span>
                      </p>
                    )}
                    <div className="mt-3 sm:mt-4 space-y-1">
                      <p className="flex items-center justify-center sm:justify-start text-xs sm:text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{language === 'id' ? 'Cek folder inbox email' : 'Check your email inbox'}</span>
                      </p>
                      <p className="flex items-center justify-center sm:justify-start text-xs sm:text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{language === 'id' ? 'Periksa folder spam jika perlu' : 'Check spam folder if needed'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Mobile optimized */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              {/* Tombol "Kembali ke Beranda" hanya muncul jika proses sudah selesai (tidak loading) */}
              {!loading && (
                <motion.button
                  onClick={() => window.location.href = '/'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 sm:px-6 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 sm:py-3 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2 text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span>{language === 'id' ? 'Kembali ke Beranda' : 'Back to Homepage'}</span>
                </motion.button>
              )}
              
              {/* Tombol "Pay Now" tetap dengan kondisi yang sama */}
              {paymentUrl && (
                <motion.button
                  onClick={handlePaymentRedirect}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 sm:px-6 bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2 text-sm sm:text-base"
                >
                  <span>{language === 'id' ? 'Bayar Sekarang' : 'Pay Now'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Main Form */}
        {!paymentUrl && !successMessage && (
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Left Column - Form Fields */}
            <div className="w-full lg:w-1/2">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Service Selection */}
                <div className="mb-6 sm:mb-8">
                  <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.formLabels.selectService}
                  </label>
                  <div className="relative">
                    <select
                      id="service-select"
                      value={selectedService.id}
                      onChange={handleServiceChange}
                      className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:text-white transition duration-150 text-sm sm:text-base appearance-none"
                      disabled={loading}
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - Rp{service.price.toLocaleString("id-ID")}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 text-gray-700 dark:text-gray-300">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Honeypot field */}
                <div className="hidden">
                  <input
                    type="text"
                    name="bot_check"
                    id="bot_check"
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>
                
                {/* Name Input */}
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="customerName"
                      value={customerName}
                      onChange={handleNameChange}
                      placeholder={t.formLabels.fullName}
                      className={`pl-8 sm:pl-10 block w-full rounded-lg border ${
                        nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/30'
                      } bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 shadow-sm focus:ring-2 dark:text-white transition duration-150 text-sm sm:text-base`}
                      required
                      maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTHS.name}
                      autoComplete="name"
                      disabled={loading || isLocked}
                    />
                  </div>
                  {nameError && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-500">
                      {nameError}
                    </p>
                  )}
                </div>
                
                {/* Email Input */}
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="customerEmail"
                      value={customerEmail}
                      onChange={handleEmailChange}
                      placeholder={t.formLabels.email}
                      className={`pl-8 sm:pl-10 block w-full rounded-lg border ${
                        emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/30'
                      } bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 shadow-sm focus:ring-2 dark:text-white transition duration-150 text-sm sm:text-base`}
                      required
                      maxLength={SECURITY_CONFIG.MAX_INPUT_LENGTHS.email}
                      autoComplete="email"
                      disabled={loading || isLocked}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-500">
                      {emailError}
                    </p>
                  )}
                </div>
                
                {/* File Upload Section */}
                <div className="mt-4 sm:mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.formLabels.uploadDocuments} (pdf/jpg/png/zip)
                  </label>
                  <label 
                    htmlFor="file-upload-all" 
                    className={`flex items-center justify-center px-3 sm:px-4 py-4 border border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
                      uploadStatus['allRequirements']
                        ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                    } ${loading || isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {uploadStatus['allRequirements'] ? (
                      <div className="flex items-center text-xs sm:text-sm text-green-600 dark:text-green-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate max-w-xs">
                          {uploadStatus['allRequirements'].name} ({uploadStatus['allRequirements'].size})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-2 sm:py-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <p className="font-medium text-center">{t.formLabels.uploadInstructions}</p>
                        <p className="text-xs mt-1 text-center px-2">{t.formLabels.uploadDescription}</p>
                      </div>
                    )}
                  </label>
                  <input
                    id="file-upload-all"
                    name="file-upload-all"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.zip"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={loading || isLocked}
                  />
                  {fileUploadError && (
                    <p className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-500">
                      {fileUploadError}
                    </p>
                  )}
                </div>
                
                {/* Turnstile verification */}
                <div className="mt-3 sm:mt-4">
                  <div className="flex justify-center">
                    {turnstileVisible ? (
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={siteKey}
                        onSuccess={handleTurnstileSuccess}
                        onError={handleTurnstileError}
                        onExpire={handleTurnstileExpire}
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {language === 'id' 
                          ? 'Mulai mengisi formulir untuk verifikasi keamanan'
                          : 'Start filling the form for security verification'
                        }
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Price Summary */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 sm:mt-8"
                >
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.formLabels.totalPrice}</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                        Rp{selectedService.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading || isLocked || !formTouched || nameError !== "" || emailError !== ""}
                  whileHover={{ scale: loading || isLocked ? 1 : 1.02 }}
                  whileTap={{ scale: loading || isLocked ? 1 : 0.98 }}
                  className={`w-full py-2 sm:py-3 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2 text-sm sm:text-base ${
                    loading || isLocked || !formTouched || nameError !== "" || emailError !== ""
                      ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t.formLabels.processing}</span>
                    </>
                  ) : isLocked ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>
                        {language === 'id' 
                          ? `Terkunci (${lockoutTime}s)`
                          : `Locked (${lockoutTime}s)`
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t.formLabels.orderNow}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </motion.button>
                
                {/* Error Messages */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 sm:mt-4 p-3 sm:p-4 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-l-4 border-red-500 rounded-r-lg flex items-start"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-sm">{error}</span>
                  </motion.div>
                )}
                
                {/* Security indicators */}
                <div className="mt-3 sm:mt-4 flex items-center justify-center space-x-2 sm:space-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t.formLabels.securePayment}</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t.formLabels.encryptedData}</span>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Right Column - Requirements and Info (Hidden on mobile, shown on large screens) */}
            <div className="hidden lg:block lg:w-1/2 space-y-4 sm:space-y-6">
              {/* Requirements Section */}
              <div className="bg-gray-50 dark:bg-gray-700/40 p-4 sm:p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t.requirements.title}
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {selectedService.requirementKeys.map((reqKey, index) => (
                    <li key={index} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t.requirements.items[reqKey as keyof typeof t.requirements.items]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            
{/* Process Info Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.processInfo.title}
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {t.processInfo.items.map((item, index) => (
                    <p key={index} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      <span>{item.text}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Mobile-only Requirements Section (Collapsible) */}
            <div className="lg:hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-white">
                      {t.requirements.title}
                    </span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <div className="mt-2 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <ul className="space-y-2 text-xs sm:text-sm">
                    {selectedService.requirementKeys.map((reqKey, index) => (
                      <li key={index} className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t.requirements.items[reqKey as keyof typeof t.requirements.items]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}