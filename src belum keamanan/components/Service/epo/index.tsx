"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/Header/Bahasa";

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

// SVG Icon Components
const ExitPermitIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const PassportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// EPO Services Section
const EPOServicesSection = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Exit Permit Only (EPO) Services",
      subtitle: "Comprehensive assistance for processing Exit Permit Only documents for foreign nationals leaving Indonesia",
      serviceTitle: "Exit Permit Only (EPO)",
      serviceDesc: "Official permit required for foreign nationals who are ending their stay in Indonesia and leaving permanently",
      serviceFeatures: [
        "Efficient processing within 3-5 working days",
        "Professional handling of all documentation requirements",
        "Legal compliance with all immigration regulations",
        "Assistance for both individuals and corporate sponsors"
      ],
      requirementsTitle: "EPO Requirements",
      requirements: [
        "Original and photocopy of valid passport",
        "Original and photocopy of KITAS (Temporary Stay Permit Card)",
        "Original application letter from the sponsor",
        "Sponsor/guarantor's ID card (KTP)",
        "Power of attorney & ID card of the authorized person",
        "Photocopy of DPKK Payment Notification",
        "Original proof of DPKK payment",
        "Return ticket to home country or continuation ticket to another country"
      ]
    },
    id: {
      title: "Layanan Exit Permit Only (EPO)",
      subtitle: "Bantuan komprehensif untuk pengurusan dokumen Exit Permit Only bagi warga negara asing yang akan meninggalkan Indonesia",
      serviceTitle: "Exit Permit Only (EPO)",
      serviceDesc: "Izin resmi yang diperlukan bagi warga negara asing yang mengakhiri masa tinggal di Indonesia dan meninggalkan secara permanen",
      serviceFeatures: [
        "Pemrosesan efisien dalam waktu 3-5 hari kerja",
        "Penanganan profesional untuk semua persyaratan dokumentasi",
        "Kepatuhan hukum terhadap semua peraturan imigrasi",
        "Bantuan untuk individu maupun sponsor perusahaan"
      ],
      requirementsTitle: "Persyaratan EPO",
      requirements: [
        "Asli dan Fotocopy Paspor yang masih berlaku",
        "Asli dan Fotocopy Kitas",
        "Asli surat Permohonan dari Sponsor",
        "KTP Penjamin/Sponsor",
        "Surat Kuasa & KTP penerima kuasa",
        "Fotocopy Notifikasi Pembayaran DPKK",
        "Asli bukti pembayaran DPKK",
        "Tiket kembali ke negaranya atau meneruskan ke negara lain"
      ]
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeIn}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.title}
          </h2>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "8rem" }}
            transition={{ duration: 1, delay: 0.6 }}
            className="h-1 bg-blue-600 mx-auto mb-6"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
          >
            {t.subtitle}
          </motion.p>
        </motion.div>

        {/* Service Information */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 lg:gap-8 my-8 max-w-4xl mx-auto"
        >
          <motion.div 
            variants={slideIn}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-t-4 border-blue-600 flex flex-col"
          >
            <motion.div 
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="text-blue-600 dark:text-blue-400 mb-4"
            >
              <ExitPermitIcon />
            </motion.div>
            <motion.h3 
              className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center"
            >
              {t.serviceTitle}
            </motion.h3>
            <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
              {t.serviceDesc}
            </p>
            <div className="space-y-3 mt-auto">
              {t.serviceFeatures.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  className="flex items-start"
                >
                  <motion.div 
                    className="flex-shrink-0 mr-3"
                    transition={{ duration: 0.6 }}
                  >
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <CheckIcon />
                    </div>
                  </motion.div>
                  <p className="text-gray-700 dark:text-gray-300">{feature}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Requirements Section */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {t.requirementsTitle}
          </motion.h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto"
          >
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <PassportIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.requirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.requirements.map((requirement, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{requirement}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const EPOServicesPage = () => {
  return (
    <>
      <EPOServicesSection />
    </>
  );
};

export default EPOServicesPage;