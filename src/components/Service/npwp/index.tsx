"use client";
import { useState } from "react";
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
const NPWPIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const PersonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CompanyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// NPWP Services Section
const NPWPServicesSection = () => {
  const { language } = useLanguage();
  const [selectedType, setSelectedType] = useState("personal");

  // Content translations
  const content = {
    en: {
      title: "Tax ID Number (NPWP) Services",
      subtitle: "Professional assistance with Tax ID Number registration for individuals and businesses",
      personalTitle: "Personal Tax ID",
      personalDesc: "Tax identification number for individuals required for various financial and administrative purposes",
      corporateTitle: "Corporate Tax ID",
      corporateDesc: "Tax identification number for businesses essential for legal operations in Indonesia",
      serviceFeatures: [
        "Fast and efficient processing",
        "Complete documentation assistance",
        "Digital submission options",
        "Compliance with tax regulations"
      ],
      requirementsTitle: "Requirements",
      personalRequirementsTitle: "Personal Tax ID Requirements",
      corporateRequirementsTitle: "Corporate Tax ID Requirements",
      // Individual Requirements
      personalRequirements: [
        "Identity Card (KTP)",
        "Email address",
        "Phone number"
      ],
      // Corporate Requirements
      corporateRequirements: [
        "Deed of Establishment and ratification",
        "ID Cards of the management",
        "Email address",
        "Phone number",
        "Business Identification Number (NIB)"
      ],
      personal: "Personal",
      corporate: "Corporate"
    },
    id: {
      title: "Layanan Nomor Pokok Wajib Pajak (NPWP)",
      subtitle: "Bantuan profesional untuk pendaftaran NPWP perorangan dan badan usaha",
      personalTitle: "NPWP Pribadi",
      personalDesc: "Nomor identitas wajib pajak untuk individu yang diperlukan untuk berbagai keperluan finansial dan administratif",
      corporateTitle: "NPWP Badan",
      corporateDesc: "Nomor identitas wajib pajak untuk bisnis yang penting untuk operasi legal di Indonesia",
      serviceFeatures: [
        "Pemrosesan cepat dan efisien",
        "Bantuan dokumentasi lengkap",
        "Opsi pengajuan digital",
        "Kepatuhan terhadap peraturan perpajakan"
      ],
      requirementsTitle: "Persyaratan",
      personalRequirementsTitle: "Persyaratan NPWP Pribadi",
      corporateRequirementsTitle: "Persyaratan NPWP Badan",
      // Individual Requirements
      personalRequirements: [
        "KTP",
        "E-Mail",
        "Nomor Telepon"
      ],
      // Corporate Requirements
      corporateRequirements: [
        "Akte Pendirian + pengesahan",
        "KTP Pengurus",
        "E-Mail",
        "Nomor Telepon",
        "NIB"
      ],
      personal: "Pribadi",
      corporate: "Badan"
    }
  };

  // Current language content
  const t = content[language];

  // Service type data
  const serviceTypes = [
    {
      id: "personal",
      title: t.personalTitle,
      description: t.personalDesc,
      icon: <PersonIcon />
    },
    {
      id: "corporate",
      title: t.corporateTitle,
      description: t.corporateDesc,
      icon: <CompanyIcon />
    }
  ];

  // Function to get current requirements based on selected type
  const getCurrentRequirements = () => {
    if (selectedType === "personal") {
      return {
        title: t.personalRequirementsTitle,
        requirements: t.personalRequirements
      };
    } else {
      return {
        title: t.corporateRequirementsTitle,
        requirements: t.corporateRequirements
      };
    }
  };

  // Get current requirements
  const currentRequirements = getCurrentRequirements();

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

        {/* NPWP Icon */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="text-blue-600 dark:text-blue-400 mb-10 flex justify-center"
        >
          <NPWPIcon />
        </motion.div>

        {/* Tax ID Type Selection Tabs */}
        <div className="flex justify-center border-b border-gray-200 mb-8">
          <button
            onClick={() => setSelectedType("personal")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedType === "personal" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.personal}
          </button>
          <button
            onClick={() => setSelectedType("corporate")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedType === "corporate" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.corporate}
          </button>
        </div>

        {/* Selected Service Information */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 lg:gap-8 my-8 max-w-4xl mx-auto"
        >
          {serviceTypes
            .filter(service => service.id === selectedType)
            .map((service) => (
              <motion.div 
                key={service.id}
                variants={slideIn}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-t-4 border-blue-600 flex flex-col"
              >
                <motion.div 
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="text-blue-600 dark:text-blue-400 mb-4 flex justify-center"
                >
                  {service.icon}
                </motion.div>
                <motion.h3 
                  className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center"
                >
                  {service.title}
                </motion.h3>
                <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
                  {service.description}
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
            ))}
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
            {currentRequirements.title}
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
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >              
              <div className="space-y-4">
                {currentRequirements.requirements.map((requirement, index) => (
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

        {/* Application Process */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {language === 'en' ? 'Application Process' : 'Proses Aplikasi'}
          </motion.h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative">
              {/* Process Timeline */}
              <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-blue-600"></div>
              
              {/* Step 1 */}
              <motion.div 
                variants={fadeIn}
                className="relative mb-8"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">1</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Document Collection' : 'Pengumpulan Dokumen'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We help you prepare all required documents according to tax regulations' : 'Kami membantu Anda menyiapkan semua dokumen yang diperlukan sesuai peraturan pajak'}</p>
                </div>
              </motion.div>
              
              {/* Step 2 */}
              <motion.div 
                variants={fadeIn}
                className="relative mb-8"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">2</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Online Registration' : 'Pendaftaran Online'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We submit your application through the official tax office portal' : 'Kami mengajukan aplikasi Anda melalui portal resmi kantor pajak'}</p>
                </div>
              </motion.div>
              
              {/* Step 3 */}
              <motion.div 
                variants={fadeIn}
                className="relative"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">3</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'NPWP Card Delivery' : 'Pengiriman Kartu NPWP'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We deliver your Tax ID Number card to your designated address' : 'Kami mengirimkan kartu NPWP Anda ke alamat yang ditentukan'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const NPWPServicesPage = () => {
  return (
    <>
      <NPWPServicesSection />
    </>
  );
};

export default NPWPServicesPage;