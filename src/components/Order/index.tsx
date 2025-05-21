"use client";
import { useState, useRef, useEffect } from "react";
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

export default function Services() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];
  
  const [selectedService, setSelectedService] = useState<Service>(services[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [formStartTime, setFormStartTime] = useState(Date.now());
  const formRef = useRef<HTMLFormElement | null>(null);
  
  // Get Turnstile state from custom hook
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
  
  // Reset form start time on component mount
  useEffect(() => {
    setFormStartTime(Date.now());
  }, []);

  // Effect to show Turnstile when form starts being filled
  useEffect(() => {
    if (customerName.trim().length > 2 || customerEmail.trim().length > 3) {
      setTurnstileVisible(true);
    }
  }, [customerName, customerEmail, setTurnstileVisible]);

  // Custom hooks
  const {
    documents,
    uploadStatus,
    error: fileUploadError,
    handleFileChange: originalHandleFileChange,
    resetFileUpload
  } = useFileUpload(language as 'en' | 'id');
  
  // Modified file upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    originalHandleFileChange(e);
    setTurnstileVisible(true);
  };
  
  const handlePaymentRedirect = () => {
    // This will work because it's triggered directly by a user click
    window.open(paymentUrl, "_blank");
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedServiceId = parseInt(e.target.value);
    const service = services.find(s => s.id === selectedServiceId);
    if (service) {
      setSelectedService(service);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerEmail(e.target.value);
  };

  // Updated handleSubmit function in your React component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
 
  // Reset messages
  setError("");
  setSuccessMessage("");
  setPaymentUrl("");
  
  // Turnstile validation
  if (!turnstileToken) {
    setError(t.messages.securityVerification);
    return;
  }
  
  // Form validations
  if (!validateName(customerName)) {
    setError(t.messages.invalidName);
    return;
  }
  
  if (!validateEmail(customerEmail)) {
    setError(t.messages.invalidEmail);
    return;
  }
  
  // Check document upload
  if (!documents['allRequirements']) {
    setError(t.messages.uploadRequired);
    return;
  }
  
  // Check for suspicious submission
  if (isSuspiciousSubmission(formStartTime)) {
    setError(t.messages.completeForm);
    return;
  }
  
  setLoading(true);
  setSubmissionAttempts(prev => prev + 1);
  
  // Create a timeout to show processing message
  const processingTimeout = setTimeout(() => {
    // This will update the message if the request is taking longer
    setSuccessMessage(
      language === 'id' 
        ? "Sedang memproses pesanan Anda. Ini mungkin membutuhkan waktu beberapa saat..."
        : "Processing your order. This might take a moment..."
    );
  }, 3000);
  
  try {
    const browserData = collectBrowserData();
    const sessionId = browserData.sessionId;
    
    // Prepare combined form data for single API call
    const formData = new FormData();
    formData.append('customerName', customerName.trim());
    formData.append('customerEmail', customerEmail.trim());
    formData.append('serviceId', selectedService.id.toString());
    formData.append('serviceName', selectedService.name);
    formData.append('amount', selectedService.price.toString());
    formData.append('allRequirements', documents['allRequirements']);
    formData.append('turnstileToken', turnstileToken);
    formData.append('sessionId', sessionId);
    formData.append('language', language);
    formData.append('sendPaymentLinkByEmail', 'true');
    
    // Use the optimized combined service function
    const result = await createOrderComplete(
      formData,
      browserData,
      sessionId,
      language
    );
    
    // Clear any processing timeout
    clearTimeout(processingTimeout);
    
    // Handle successful submission
    if (result.success) {
      setSuccessMessage(t.messages.orderSuccess);
      
      // Set payment URL if available
      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
      }
      
      // Reset form
      if (formRef.current) formRef.current.reset();
      resetFileUpload();
      setSubmissionAttempts(0);
      
      // If we have both payment URL and automatic redirect is enabled, redirect after a short delay
      if (result.paymentUrl && process.env.NEXT_PUBLIC_AUTO_REDIRECT === 'true') {
        setTimeout(() => {
          window.location.href = result.paymentUrl;
        }, 1500);
      }
    } else {
      setError(result.message || t.messages.submissionError);
      
      // Reset Turnstile if needed
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    }
    
  } catch (error: any) {
    clearTimeout(processingTimeout);
    setError(error.message || t.messages.submissionError);
    
    // Reset Turnstile if needed
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  } finally {
    setLoading(false);
  }
};

  // Render method
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-32 pb-16 px-4 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-100/30 dark:bg-blue-900/20 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/30 dark:bg-blue-900/20 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4"></div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, index) => (
          <motion.div
            key={index}
            className="absolute w-4 h-4 bg-blue-400/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 - 50 + "%", 
              y: -20,
              scale: Math.random() * 1 + 0.5
            }}
            animate={{ 
              y: ["0%", "100%"],
              x: `calc(${Math.random() * 100 - 50}% + ${Math.sin(index) * 50}px)`
            }}
            transition={{ 
              duration: Math.random() * 10 + 15, 
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              left: `${(index + 1) * 15}%`
            }}
          />
        ))}
      </div>
      
      {/* Form Card - Now with a flex layout for side-by-side content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl w-full bg-white dark:bg-gray-800 p-8 md:p-10 shadow-2xl rounded-2xl z-10 border border-blue-100/50 dark:border-blue-900/50 relative overflow-hidden"
      >
        {/* Card decorative corner accent */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-20"></div>
      
        {/* Header with animation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative mb-8"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {t.pageTitle}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-blue-600 mx-auto mt-2 rounded-full"></div>
          <p className="text-gray-500 dark:text-gray-400 text-center mt-3 text-sm">
            {t.pageSubtitle}
          </p>
        </motion.div>
      
        {/* REMOVED: Alert Messages from here, they will be displayed below the Order Now button */}
        
        {/* Show success message and payment button instead of auto-redirect */}
        {paymentUrl && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="p-4 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 border-l-4 border-green-500 rounded-r-lg flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                onClick={() => window.location.href = '/'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
                <span>{t.messages.payLater}</span>
              </motion.button>
              
              <motion.button
                onClick={handlePaymentRedirect}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2"
              >
                <span>{t.messages.continueToPayment}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      
        {!paymentUrl && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column - Form Fields */}
            <div className="md:w-1/2">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {/* Service Selection - Now as a Dropdown */}
                <div className="mb-8">
                  <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.formLabels.selectService}
                  </label>
                  <div className="relative">
                    <select
                      id="service-select"
                      value={selectedService.id}
                      onChange={handleServiceChange}
                      className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:text-white transition duration-150 text-base appearance-none"
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - Rp{service.price.toLocaleString("id-ID")}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700 dark:text-gray-300">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
      
                {/* Hidden honeypot field to catch bots */}
                <div className="hidden">
                  <input
                    type="text"
                    name="bot_check"
                    id="bot_check"
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>
      
                {/* Input fields with floating labels */}
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="customerName"
                      value={customerName}
                      onChange={handleNameChange}
                      placeholder={t.formLabels.fullName}
                      className="pl-10 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:text-white transition duration-150 text-base"
                      required
                      maxLength={50}
                      autoComplete="name"
                    />
                  </div>
                </div>
                
      
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
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
                      className="pl-10 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:text-white transition duration-150 text-base"
                      required
                      maxLength={100}
                      autoComplete="email"
                    />
                  </div>
                </div>
      
                {/* File Upload Section */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.formLabels.uploadDocuments} (pdf/jpg/png/zip)
                  </label>
                  <label 
                    htmlFor="file-upload-all" 
                    className={`flex items-center justify-center px-4 py-4 border border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
                      uploadStatus['allRequirements']
                        ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                        : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                    }`}
                  >
                    {uploadStatus['allRequirements'] ? (
                      <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate max-w-xs">
                          {uploadStatus['allRequirements'].name} ({uploadStatus['allRequirements'].size})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-sm text-gray-500 dark:text-gray-400 py-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <p className="font-medium">{t.formLabels.uploadInstructions}</p>
                        <p className="text-xs mt-1">{t.formLabels.uploadDescription}</p>
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
                  />
                  {fileUploadError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                  {fileUploadError}
                  </p>
                  )}
                </div>      
      
                {/* Turnstile verification - conditionally displayed */}
                <div className="mt-4">
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
                    <div className="align-center">
                    </div>
                  )}
                  </div>
                </div>
      
                {/* Summary box with animation */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.formLabels.totalPrice}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        Rp{selectedService.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                {/* Submit Button with animation */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg shadow font-medium transition duration-300 flex justify-center items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t.formLabels.processing}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.formLabels.orderNow}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </motion.button>
                
                {/* MOVED: Alert Messages - Now below the Order Now button */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-l-4 border-red-500 rounded-r-lg flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </motion.div>
                )}
                
                {/* Show success message (when no payment URL is available) */}
                {successMessage && !paymentUrl && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 border-l-4 border-green-500 rounded-r-lg flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {successMessage}
                  </motion.div>
                )}
                
                {/* Security indicators - moved below notification messages */}
                <div className="mt-4 flex items-center justify-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t.formLabels.securePayment}</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t.formLabels.encryptedData}</span>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Right Column - Requirements and Info */}
            <div className="md:w-1/2 space-y-6">
              {/* Requirements Section */}
              <div className="bg-gray-50 dark:bg-gray-700/40 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t.requirements.title}
                </h3>
                <ul className="space-y-2 text-sm">
                  {selectedService.requirementKeys.map((reqKey, index) => (
                    <li key={index} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t.requirements.items[reqKey as keyof typeof t.requirements.items]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            
              {/* Info Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.processInfo.title}
                </h3>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  {t.processInfo.items.map((item, index) => (
                    <p key={index} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      <span>{item.text}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}