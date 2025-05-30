"use client"
import { useState, useCallback, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import ContactInfo from "./contactinfo";
import { useLanguage } from "../Header/Bahasa";
import { useTurnstile } from '../Order/turnstile'; // Sesuaikan path jika perlu

// Define form state type for better type safety
type FormState = {
  name: string;
  email: string;
  message: string;
};

// Type for validation errors
type ValidationError = {
  field: string;
  message: string;
};

// Main Contact Component
const Contact = () => {
  // Initialize form state with more explicit typing
  const [form, setForm] = useState<FormState>({ 
    name: "", 
    email: "", 
    message: "" 
  });

  // State management for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { language } = useLanguage();

  // Get Turnstile state from custom hook
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

  // Effect to show Turnstile when form starts being filled
  useEffect(() => {
    if (form.name.length > 2 || form.email.length > 3 || form.message.length > 5) {
      setTurnstileVisible(true);
    }
  }, [form.name, form.email, form.message, setTurnstileVisible]);

  // Memoized change handler for performance
  const handleChange = useCallback((field: keyof FormState) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      // Clear validation error for this field when user starts typing
      setValidationErrors(prev => prev.filter(error => error.field !== field));
    }, 
  []);

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
      successMessage: "Thank you, your message has been sent successfully",
      allFieldsRequired: "All fields must be filled.",
      invalidEmail: "Invalid email format.",
      captchaRequired: "Please complete the security verification.",
      sendError: "Failed to send message. Please try again.",
      generalError: "An error occurred. Please try again later.",
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
      successMessage: "Terima kasih, Pesan anda berhasil dikirim",
      allFieldsRequired: "Semua bidang harus diisi.",
      invalidEmail: "Format email tidak valid.",
      captchaRequired: "Silakan selesaikan verifikasi keamanan.",
      sendError: "Gagal mengirim pesan. Silakan coba lagi.",
      generalError: "Terjadi kesalahan. Silakan coba lagi nanti.",
      startTypingToShowVerification: "Mulai mengisi formulir untuk menampilkan verifikasi keamanan"
    }
  };

  // Current language content
  const t = content[language as keyof typeof content];

  // Function to get field error message if exists
  const getFieldError = (fieldName: string) => {
    const error = validationErrors.find(err => err.field === fieldName);
    return error ? error.message : "";
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResponseMessage("");
    setValidationErrors([]);

    // Comprehensive client-side validation
    const trimmedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim()
    };

    // Validation checks
    let hasErrors = false;
    const errors: ValidationError[] = [];

    if (!trimmedForm.name) {
      errors.push({ field: "name", message: t.allFieldsRequired });
      hasErrors = true;
    }

    if (!trimmedForm.email) {
      errors.push({ field: "email", message: t.allFieldsRequired });
      hasErrors = true;
    } else {
      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedForm.email)) {
        errors.push({ field: "email", message: t.invalidEmail });
        hasErrors = true;
      }
    }

    if (!trimmedForm.message) {
      errors.push({ field: "message", message: t.allFieldsRequired });
      hasErrors = true;
    }

    // Turnstile token validation
    if (turnstileVisible && !turnstileToken) {
      errors.push({ field: "turnstile", message: t.captchaRequired });
      hasErrors = true;
    }

    if (hasErrors) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Send form data with Turnstile token
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          ...trimmedForm, 
          turnstileToken,
          language
        }),
      });

      const result = await res.json();
      
      // Handle different response scenarios
      if (res.status === 200 && result.success) {
        // Success case
        setResponseMessage(t.successMessage);
        setForm({ name: "", email: "", message: "" });
        resetTurnstile(); // Reset Turnstile widget
        setTurnstileVisible(false); // Hide Turnstile after successful submission
      } else {
        // Error handling with specific messages from the API
        if (result.validationErrors && result.validationErrors.length > 0) {
          setValidationErrors(result.validationErrors);
        } else {
          setResponseMessage(result.error || t.sendError);
        }
        resetTurnstile(); // Reset Turnstile widget on error
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setResponseMessage(t.generalError);
      resetTurnstile(); // Reset Turnstile widget on network error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="overflow-hidden py-16 md:py-20 lg:py-28">
      <div className="container">
        {/* Atas component with full width */}
        
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4 lg:w-6/12 xl:w-7/12">
            <div className="mb-12 rounded-sm bg-white px-8 py-16 shadow-three dark:bg-gray-dark sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]">
              <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                {t.title}
              </h2>
              <p className="mb-12 text-base font-medium text-body-color">
                {t.subtitle}
              </p>
              
              <form onSubmit={handleSubmit} className="relative">
                {/* Show loading overlay when submitting */}
                {isSubmitting && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-gray-dark/50">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
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
                        {t.nameLabel}
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        autoComplete="name"
                        type="text"
                        placeholder={t.namePlaceholder}
                        value={form.name}
                        onChange={handleChange('name')}
                        className={`border-stroke w-full rounded-sm border bg-[#f8f8f8] px-6 py-4 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('name') ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      {getFieldError('name') && (
                        <p className="mt-1 text-sm text-red-500">{getFieldError('name')}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8 py-2">
                      <label 
                        htmlFor="contact-email" 
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        {t.emailLabel}
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={form.email}
                        onChange={handleChange('email')}
                        className={`border-stroke w-full rounded-sm border bg-[#f8f8f8] px-6 py-4 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('email') ? 'border-red-500' : ''
                        }`}
                        required
                      />
                      {getFieldError('email') && (
                        <p className="mt-1 text-sm text-red-500">{getFieldError('email')}</p>
                      )}
                    </div>
                  </div>

                  {/* Message Textarea */}
                  <div className="w-full px-4">
                    <div className="mb-8 py-8">
                      <label 
                        htmlFor="contact-message" 
                        className="mb-3 block text-sm font-medium text-dark dark:text-white"
                      >
                        {t.messageLabel}
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        placeholder={t.messagePlaceholder}
                        value={form.message}
                        onChange={handleChange('message')}
                        className={`border-stroke w-full resize-none rounded-sm border bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none ${
                          getFieldError('message') ? 'border-red-500' : ''
                        }`}
                        required
                      ></textarea>
                      {getFieldError('message') && (
                        <p className="mt-1 text-sm text-red-500">{getFieldError('message')}</p>
                      )}
                    </div>
                  </div>

                  {/* Turnstile CAPTCHA - Conditionally displayed */}
                  <div className="w-full px-4 mb-8">
                    {/* Wrapper div dengan styling untuk centering */}
                    <div className="flex justify-center">
                      {turnstileVisible ? (
                        <Turnstile
                          ref={turnstileRef}
                          siteKey={siteKey}
                          onSuccess={(token) => {
                            handleTurnstileSuccess(token);
                            // Clear any turnstile error when solved
                            setValidationErrors(prev => prev.filter(error => error.field !== 'turnstile'));
                          }}
                          onError={handleTurnstileError}
                          onExpire={handleTurnstileExpire}
                          options={{
                            theme: 'light', // or 'dark' based on your site's theme
                          }}
                        />
                      ) : (
                        <div className="">
                        </div>
                      )}
                    </div>
                    
                    {getFieldError('turnstile') && (
                      <p className="mt-2 text-sm text-red-500 text-center">{getFieldError('turnstile')}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className="rounded-sm bg-primary px-9 py-4 text-base font-medium text-white shadow-submit duration-300 hover:bg-primary/90 dark:shadow-submit-dark"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t.submittingButton : t.submitButton}
                    </button>
                  </div>
                </div>
              </form>
              
              {/* General Response Message */}
              {responseMessage && (
                <div className="mt-6 text-center">
                  <p 
                    className={
                      responseMessage.includes("berhasil") || responseMessage.includes("successfully")
                        ? "text-green-500" 
                        : "text-red-500"
                    }
                  >
                    {responseMessage}
                  </p>
                </div>
              )}
              
              {/* General validation error message for errors not tied to specific fields */}
              {validationErrors.some(err => err.field === 'general') && (
                <div className="mt-6 text-center">
                  <p className="text-red-500">
                    {validationErrors.find(err => err.field === 'general')?.message}
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