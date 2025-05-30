// lib/translations.ts

// Email translation content
export interface EmailTranslations {
  adminEmailSubject: string;
  adminEmailTitle: string;
  nameLabel: string;
  emailLabel: string;
  serviceLabel: string;
  invoiceIdLabel: string;
  paymentUrlLabel: string;
  documentAttachedNote: string;
  customerEmailSubject: string;
  customerEmailTitle: string;
  customerEmailGreeting: string;
  customerEmailOrderConfirmation: string;
  customerEmailPaymentInstructions: string;
  customerEmailPaymentButton: string;
  customerEmailIgnoreIfPaid: string;
  customerEmailSupport: string;
  customerEmailFooter: string;
  confirmationEmailSubject: string;
  confirmationEmailTitle: string;
  confirmationEmailGreeting: string;
  confirmationEmailThankYou: string;
  confirmationEmailProcessing: string;
  trackOrder: string;
}

// lib/translations.ts (continued)

const translations: Record<string, EmailTranslations> = {
  en: {
    adminEmailSubject: "New E-Visa Order - ",
    adminEmailTitle: "New E-Visa Order",
    nameLabel: "Name:",
    emailLabel: "Email:",
    serviceLabel: "Service:",
    invoiceIdLabel: "Invoice ID:",
    paymentUrlLabel: "Payment URL:",
    documentAttachedNote: "Required documents attached.",
    customerEmailSubject: "Order for ",
    customerEmailTitle: "Thank you for your order",
    customerEmailGreeting: "Hello ",
    customerEmailOrderConfirmation: "Your order for service ",
    customerEmailPaymentInstructions: "Please click the following link to proceed with payment:",
    customerEmailPaymentButton: "Proceed to Payment",
    customerEmailIgnoreIfPaid: "Please ignore this message if you have already made the payment.",
    customerEmailSupport: "If you have any questions, please contact our support team via email or WhatsApp listed on our website.",
    customerEmailFooter: "This message was sent automatically, please do not reply to this email.",
    confirmationEmailSubject: "Your E-Visa Order - ",
    confirmationEmailTitle: "E-Visa Order Confirmation",
    confirmationEmailGreeting: "Hello ",
    confirmationEmailThankYou: "Thank you for ordering our ",
    confirmationEmailProcessing: "Your requirement documents have been received and are being processed.",
    trackOrder: "Track Order" 
  },
  id: {
    adminEmailSubject: "Order E-Visa Baru - ",
    adminEmailTitle: "Order E-Visa Baru",
    nameLabel: "Nama:",
    emailLabel: "Email:",
    serviceLabel: "Layanan:",
    invoiceIdLabel: "Invoice ID:",
    paymentUrlLabel: "Payment URL:",
    documentAttachedNote: "Dokumen persyaratan terlampir.",
    customerEmailSubject: "Pesanan ",
    customerEmailTitle: "Terima kasih atas pesanan Anda",
    customerEmailGreeting: "Halo ",
    customerEmailOrderConfirmation: "Pesanan untuk layanan ",
    customerEmailPaymentInstructions: "Silakan klik tautan berikut untuk melanjutkan ke pembayaran:",
    customerEmailPaymentButton: "Lanjutkan ke Pembayaran",
    customerEmailIgnoreIfPaid: "Abaikan pesan ini apabila anda sudah membayar.",
    customerEmailSupport: "Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan kami melalui email atau WhatsApp yang tercantum di website.",
    customerEmailFooter: "Pesan ini dikirim secara otomatis, mohon jangan membalas email ini.",
    confirmationEmailSubject: "Order E-Visa Anda - ",
    confirmationEmailTitle: "Konfirmasi Order E-Visa",
    confirmationEmailGreeting: "Halo ",
    confirmationEmailThankYou: "Terima kasih telah memesan layanan ",
    confirmationEmailProcessing: "Dokumen persyaratan Anda telah kami terima dan sedang dalam proses.",
    trackOrder: "Lacak Pesanan" 
  }
};

// Cache for translations to avoid repeated lookups
const translationCache = new Map<string, EmailTranslations>();

export function getEmailTranslations(language: string): EmailTranslations {
  // Check cache first
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }
  
  // Get translations or default to English
  const translationSet = translations[language] || translations.en;
  
  // Cache the result
  translationCache.set(language, translationSet);
  
  return translationSet;
}