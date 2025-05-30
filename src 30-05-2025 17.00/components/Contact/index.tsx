"use client"
import { useState, useCallback, useEffect, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import ContactInfo from "./contactinfo";
import { useLanguage } from "../Header/Bahasa";
import { useTurnstile } from '../Order/turnstile';

// Security configuration for client-side validation
const SECURITY_CONFIG = {
  maxInputLength: {
    name: 100,
    email: 100,
    message: 2000
  },
  minSubmissionInterval: 3000, // 3 seconds between submissions
  maxConsecutiveErrors: 3
};

// Security patterns for client-side detection
const SECURITY_PATTERNS = {
  suspiciousChars: /[<>{}()[\]\\\/\^$|?*+]/g,
  scriptTags: /<script[^>]*>[\s\S]*?<\/script>/gi,
  sqlKeywords: /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|DECLARE|SCRIPT)\s/gi,
  htmlEntities: /&(#\d+|#x[\da-f]+|[a-z]+);/gi
};

// Form state type
type FormState = {
  name: string;
  email: string;
  message: string;
};

// Validation error type
type ValidationError = {
  field: string;
  message: string;
};

// Client-side input sanitization
function sanitizeInput(input: string, maxLength: number): string {
  return input
    .trim()
    .substring(0, maxLength)
    // Remove script tags
    .replace(SECURITY_PATTERNS.scriptTags, '')
    // Remove suspicious characters but keep common punctuation
    .replace(/[<>{}()[\]\\\/\^$|*+]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Client-side security validation
function validateSecurity(input: string): boolean {
  // Check for SQL injection attempts
  if (SECURITY_PATTERNS.sqlKeywords.test(input)) {
    return false;
  }
  
  // Check for script injection
  if (SECURITY_PATTERNS.scriptTags.test(input)) {
    return false;
  }
  
  return true;
}

// Enhanced email validation
function validateEmail(email: string): boolean {
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  if (email.length > 254) return false; // RFC limit
  if (email.includes('..')) return false; // Consecutive dots
  if (email.startsWith('.') || email.endsWith('.')) return false;
  
  return true;
}

// Main Contact Component
const Contact = () => {
  // Form state
  const [form, setForm] = useState<FormState>({ 
    name: "", 
    email: "", 
    message: "" 
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [waitTime, setWaitTime] = useState(0);
  
  // Refs for form handling
  const formRef = useRef<HTMLFormElement>(null);
  const { language } = useLanguage();

  // Turnstile integration
  const {
    siteKey,
    turnstileToken,
    turnstileVisible,
    turnstileRef,
    setTurnstileVisible,
    handleTurnstileSuccess,
    handleTurnstileError,
    handleTurnstileExpire,
    resetTurnstile
  } = useTurnstile();

  // Wait time countdown effect
  useEffect(() => {
    if (waitTime > 0) {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [waitTime]);

  // Show Turnstile when form starts being filled
  useEffect(() => {
    if (form.name.length > 2 || form.email.length > 3 || form.message.length > 5) {
      setTurnstileVisible(true);
    }
  }, [form.name, form.email, form.message, setTurnstileVisible]);

  // Enhanced input change handler with security validation
  const handleChange = useCallback((field: keyof FormState) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      const maxLength = SECURITY_CONFIG.maxInputLength[field];
      
      // Basic length check
      if (value.length > maxLength) {
        return;
      }
      
      // Security validation
      if (!validateSecurity(value)) {
        console.warn(`Suspicious input detected in ${field}`);
        return;
      }
      
      // Sanitize and update form
      const sanitizedValue = sanitizeInput(value, maxLength);
      setForm(prev => ({ ...prev, [field]: sanitizedValue }));
      
      // Clear validation error for this field
      setValidationErrors(prev => prev.filter(error => error.field !== field));
      
      // Clear general messages when user starts typing
      if (responseMessage) {
        setResponseMessage("");
      }
    }, 
  [responseMessage]);

  // Content translations
  const content = {
    en: {
      title: "Need Help? Contact Us Now",
      subtitle: "Our Team will help you as soon as possible.",
      nameLabel: "Name",
      namePlaceholder: "Enter your name",
      emailLabel: "Email",
      emailPlaceholder: "Enter your email",
      messageLabel: "Message",
      messagePlaceholder: "Enter your message",
      submitButton: "Send Message",
      submittingButton: "Sending...",
      waitingButton: "Please wait ({time}s)",
      successMessage: "Thank you, your message has been sent successfully",
      allFieldsRequired: "All fields must be filled.",
      invalidEmail: "Invalid email format.",
      nameTooShort: "Name must be at least 2 characters.",
      messageTooShort: "Message must be at least 10 characters.",
      captchaRequired: "Please complete the security verification.",
      sendError: "Failed to send message. Please try again.",
      generalError: "An error occurred. Please try again later.",
      rateLimitError: "Too many requests. Please wait before trying again.",
      waitMessage: "Please wait {time} seconds before submitting again.",
      securityError: "Input contains suspicious content. Please review your message.",
      startTypingToShowVerification: "Start filling the form to show security verification"
    },
    id: {
      title: "Butuh Bantuan? Hubungi Kami segera",
      subtitle: "Tim Kami akan membantu Anda secepatnya.",
      nameLabel: "Nama",
      namePlaceholder: "Masukkan nama Anda",
      emailLabel: "Email",
      emailPlaceholder: "Masukkan email Anda",
      messageLabel: "Pesan",
      messagePlaceholder: "Masukkan pesan Anda",
      submitButton: "Kirim Pesan",
      submittingButton: "Mengirim...",
      waitingButton: "Harap tunggu ({time}s)",
      successMessage: "Terima kasih, Pesan anda berhasil dikirim",
      allFieldsRequired: "Semua bidang harus diisi.",
      invalidEmail: "Format email tidak valid.",
      nameTooShort: "Nama minimal 2 karakter.",
      messageTooShort: "Pesan minimal 10 karakter.",
      captchaRequired: "Silakan selesaikan verifikasi keamanan.",
      sendError: "Gagal mengirim pesan. Silakan coba lagi.",
      generalError: "Terjadi kesalahan. Silakan coba lagi nanti.",
      rateLimitError: "Terlalu banyak permintaan. Harap tunggu sebelum mencoba lagi.",
      waitMessage: "Harap tunggu {time} detik sebelum mengirim lagi.",
      securityError: "Input mengandung konten mencurigakan. Silakan tinjau pesan Anda.",
      startTypingToShowVerification: "Mulai mengisi formulir untuk menampilkan verifikasi keamanan"
    }
  };

  // Current language content
  const t = content[language as keyof typeof content];

  // Get field error message
  const getFieldError = (fieldName: string) => {
    const error = validationErrors.find(err => err.field === fieldName);
    return error ? error.message : "";
  };

  // Enhanced client-side validation
  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];
    
    // Trim inputs for validation
    const trimmedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim()
    };

    // Name validation
    if (!trimmedForm.name) {
      errors.push({ field: "name", message: t.allFieldsRequired });
    } else if (trimmedForm.name.length < 2) {
      errors.push({ field: "name", message: t.nameTooShort });
    } else if (!validateSecurity(trimmedForm.name)) {
      errors.push({ field: "name", message: t.securityError });
    }

    // Email validation
    if (!trimmedForm.email) {
      errors.push({ field: "email", message: t.allFieldsRequired });
    } else if (!validateEmail(trimmedForm.email)) {
      errors.push({ field: "email", message: t.invalidEmail });
    } else if (!validateSecurity(trimmedForm.email)) {
      errors.push({ field: "email", message: t.securityError });
    }

    // Message validation
    if (!trimmedForm.message) {
      errors.push({ field: "message", message: t.allFieldsRequired });
    } else if (trimmedForm.message.length < 10) {
      errors.push({ field: "message", message: t.messageTooShort });
    } else if (!validateSecurity(trimmedForm.message)) {
      errors.push({ field: "message", message: t.securityError });
    }

    // Turnstile validation
    if (turnstileVisible && !turnstileToken) {
      errors.push({ field: "turnstile", message: t.captchaRequired });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Form submission handler with enhanced security
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if form is already being submitted
    if (isSubmitting || waitTime > 0) {
      return;
    }

    // Rate limiting - prevent too frequent submissions
    const now = Date.now();
    if (now - lastSubmissionTime < SECURITY_CONFIG.minSubmissionInterval) {
      const remainingTime = Math.ceil((SECURITY_CONFIG.minSubmissionInterval - (now - lastSubmissionTime)) / 1000);
      setWaitTime(remainingTime);
      setResponseMessage(t.waitMessage.replace('{time}', remainingTime.toString()));
      return;
    }

    // Check consecutive errors
    if (consecutiveErrors >= SECURITY_CONFIG.maxConsecutiveErrors) {
      setWaitTime(30); // 30 second cooldown
      setResponseMessage(t.rateLimitError);
      return;
    }

    setIsSubmitting(true);
    setResponseMessage("");
    setValidationErrors([]);
    setLastSubmissionTime(now);

    // Client-side validation
    if (!validateForm()) {
      setIsSubmitting(false);
      setConsecutiveErrors(prev => prev + 1);
      return;
    }

    // Sanitize form data before sending
    const sanitizedForm = {
      name: sanitizeInput(form.name.trim(), SECURITY_CONFIG.maxInputLength.name),
      email: form.email.trim().toLowerCase(),
      message: sanitizeInput(form.message.trim(), SECURITY_CONFIG.maxInputLength.message)
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest" // CSRF protection
        },
        body: JSON.stringify({ 
          ...sanitizedForm, 
          turnstileToken,
          language
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (response.status === 200 && result.success) {
        // Success case
        setResponseMessage(result.message || t.successMessage);
        setForm({ name: "", email: "", message: "" });
        setConsecutiveErrors(0);
        resetTurnstile();
        setTurnstileVisible(false);
        
        // Scroll to success message on mobile
        if (window.innerWidth < 768) {
          setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      } else if (response.status === 429) {
        // Rate limited
        setWaitTime(result.waitTime || 60);
        setResponseMessage(result.error || t.rateLimitError);
        setValidationErrors(result.validationErrors || []);
        setConsecutiveErrors(prev => prev + 1);
        resetTurnstile();
      } else {
        // Other errors
        if (result.validationErrors && result.validationErrors.length > 0) {
          setValidationErrors(result.validationErrors);
        }
        setResponseMessage(result.error || t.sendError);
        setConsecutiveErrors(prev => prev + 1);
        resetTurnstile();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setResponseMessage("Request timeout. Please try again.");
      } else {
        setResponseMessage(t.generalError);
      }
      
      setConsecutiveErrors(prev => prev + 1);
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get submit button text based on state
  const getSubmitButtonText = () => {
    if (isSubmitting) return t.submittingButton;
    if (waitTime > 0) return t.waitingButton.replace('{time}', waitTime.toString());
    return t.submitButton;
  };

  // Check if submit button should be disabled
  const isSubmitDisabled = isSubmitting || waitTime > 0 || consecutiveErrors >= SECURITY_CONFIG.maxConsecutiveErrors;

  return (
    <section id="contact" className="overflow-hidden py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          {/* Contact Form */}
          <div className="w-full px-4 lg:w-6/12 xl:w-7/12">
            <div className="mb-12 rounded-sm bg-white px-8 py-16 shadow-three dark:bg-gray-dark sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]">
              <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                {t.title}
              </h2>
              <p className="mb-12 text-base font-medium text-body-color">
                {t.subtitle}
              </p>
              
              <form ref={formRef} onSubmit={handleSubmit} className="relative">
                {/* Loading overlay */}
                {isSubmitting && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-gray-dark/50 rounded-sm">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{t.submittingButton}</p>
                    </div>
                  </div>
                )}

                <div className="-mx-4 flex flex-wrap">
                  {/* Name Input */}
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8 py-2">
                      <label 
                        htmlFor="contact-name" 
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        {t.nameLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        autoComplete="name"
                        type="text"
                        placeholder={t.namePlaceholder}
                        value={form.name}
                        onChange={handleChange('name')}
                        maxLength={SECURITY_CONFIG.maxInputLength.name}
                        className={`border-stroke w-full rounded-sm border bg-[#f8f8f8] px-6 py-4 text-base text-body-color outline-none transition-colors duration-200 focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('name') ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        required
                        disabled={isSubmitDisabled}
                        aria-describedby={getFieldError('name') ? 'name-error' : undefined}
                      />
                      {getFieldError('name') && (
                        <p id="name-error" className="mt-1 text-sm text-red-500" role="alert">
                          {getFieldError('name')}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {form.name.length}/{SECURITY_CONFIG.maxInputLength.name}
                      </div>
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8 py-2">
                      <label 
                        htmlFor="contact-email" 
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        {t.emailLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={form.email}
                        onChange={handleChange('email')}
                        maxLength={SECURITY_CONFIG.maxInputLength.email}
                        className={`border-stroke w-full rounded-sm border bg-[#f8f8f8] px-6 py-4 text-base text-body-color outline-none transition-colors duration-200 focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('email') ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        required
                        disabled={isSubmitDisabled}
                        aria-describedby={getFieldError('email') ? 'email-error' : undefined}
                      />
                      {getFieldError('email') && (
                        <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
                          {getFieldError('email')}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {form.email.length}/{SECURITY_CONFIG.maxInputLength.email}
                      </div>
                    </div>
                  </div>

                  {/* Message Textarea */}
                  <div className="w-full px-4">
                    <div className="mb-8 py-8">
                      <label 
                        htmlFor="contact-message" 
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        {t.messageLabel} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        placeholder={t.messagePlaceholder}
                        value={form.message}
                        onChange={handleChange('message')}
                        maxLength={SECURITY_CONFIG.maxInputLength.message}
                        className={`border-stroke w-full resize-none rounded-sm border bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none transition-colors duration-200 focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('message') ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        required
                        disabled={isSubmitDisabled}
                        aria-describedby={getFieldError('message') ? 'message-error' : undefined}
                      ></textarea>
                      {getFieldError('message') && (
                        <p id="message-error" className="mt-1 text-sm text-red-500" role="alert">
                          {getFieldError('message')}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {form.message.length}/{SECURITY_CONFIG.maxInputLength.message}
                      </div>
                    </div>
                  </div>

                  {/* Turnstile CAPTCHA */}
                  <div className="w-full px-4 mb-8">
                    <div className="flex justify-center">
                      {turnstileVisible ? (
                        <div className="flex flex-col items-center space-y-2">
                          <Turnstile
                            ref={turnstileRef}
                            siteKey={siteKey}
                            onSuccess={(token) => {
                              handleTurnstileSuccess(token);
                              setValidationErrors(prev => prev.filter(error => error.field !== 'turnstile'));
                            }}
                            onError={handleTurnstileError}
                            onExpire={handleTurnstileExpire}
                            options={{
                              theme: 'light',
                              size: 'normal',
                              tabIndex: 0
                            }}
                          />
                          {turnstileToken && (
                            <div className="flex items-center space-x-2 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm">Verified</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                          {t.startTypingToShowVerification}
                        </div>
                      )}
                    </div>
                    
                    {getFieldError('turnstile') && (
                      <p className="mt-2 text-sm text-red-500 text-center" role="alert">
                        {getFieldError('turnstile')}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className={`w-full sm:w-auto rounded-sm px-9 py-4 text-base font-medium text-white shadow-submit duration-300 transition-all ${
                        isSubmitDisabled 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-primary hover:bg-primary/90 dark:shadow-submit-dark'
                      }`}
                      disabled={isSubmitDisabled}
                      aria-describedby="submit-status"
                    >
                      {getSubmitButtonText()}
                    </button>
                    
                    {waitTime > 0 && (
                      <p id="submit-status" className="mt-2 text-sm text-orange-600" role="status">
                        {t.waitMessage.replace('{time}', waitTime.toString())}
                      </p>
                    )}
                  </div>
                </div>
              </form>
              
              {/* Response Messages */}
              {responseMessage && (
                <div className="mt-6 text-center" role="alert">
                  <p 
                    className={`text-sm sm:text-base p-3 rounded-sm ${
                      responseMessage.includes("berhasil") || responseMessage.includes("successfully")
                        ? "text-green-700 bg-green-100 border border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800" 
                        : responseMessage.includes("wait") || responseMessage.includes("tunggu")
                        ? "text-orange-700 bg-orange-100 border border-orange-200 dark:text-orange-300 dark:bg-orange-900/20 dark:border-orange-800"
                        : "text-red-700 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800"
                    }`}
                  >
                    {responseMessage}
                  </p>
                </div>
              )}
              
              {/* General validation errors */}
              {validationErrors.some(err => err.field === 'general') && (
                <div className="mt-6 text-center" role="alert">
                  <p className="text-sm text-red-700 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800 p-3 rounded-sm">
                    {validationErrors.find(err => err.field === 'general')?.message}
                  </p>
                </div>
              )}

              {/* Security warning for consecutive errors */}
              {consecutiveErrors >= SECURITY_CONFIG.maxConsecutiveErrors && (
                <div className="mt-6 text-center" role="alert">
                  <p className="text-sm text-red-700 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800 p-3 rounded-sm">
                    Multiple failed attempts detected. Please wait before trying again.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Contact Info Component */}
          <div className="w-full px-4 lg:w-6/12 xl:w-5/12">
            <ContactInfo />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;