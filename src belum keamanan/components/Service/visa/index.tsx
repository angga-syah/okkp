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
const SingleEntryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const MultipleEntryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);

const CompanyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ExpatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Visa Services Section
const VisaServicesSection = () => {
  const { language } = useLanguage();
  const [selectedVisa, setSelectedVisa] = useState("single");

  // Content translations
  const content = {
    en: {
      title: "Visit Visa Services",
      subtitle: "Trusted solution for processing e-visa to Indonesia",
      singleEntryTitle: "E-Visa Single Entry",
      singleEntryDesc: "Electronic visa for one-time visit to Indonesia with a validity period of 60 days.",
      multipleEntryTitle: "E-Visa Multiple Entry",
      multipleEntryDesc: "Electronic visa for multiple visits to Indonesia with validity up to 1 year.",
      singleEntryFeatures: [
        "Fast process within 3-5 working days",
        "Valid for one entry to Indonesia",
        "Can be extended up to 4 times (30 days per extension)",
        "Maximum total of 180 days stay in Indonesia"
      ],
      multipleEntryFeatures: [
        "Process within 5-7 working days",
        "Valid for multiple entries to Indonesia",
        "Maximum stay of 60 days per visit",
        "Visa validity up to 12 months"
      ],
      requirementsTitle: "Visa Requirements",
      companyRequirementsTitle: "Requirements for Companies",
      expatRequirementsTitle: "Requirements for Expatriates",
      // Single Entry requirements
      singleEntryCompanyRequirements: [
        "Official invitation letter from the company in Indonesia addressed to the foreign worker",
        "Copy of company's NPWP (Tax ID)",
        "Copy of company's SIUP/NIB (Business License)",
        "Copy of valid company's TDP (Company Registration)",
        "Statement letter with stamp duty from the person in charge",
        "Visa application letter from the company"
      ],
      singleEntryExpatRequirements: [
        "Valid passport with minimum 6 months validity from arrival date",
        "Recent color photograph with white background (size 4x6)",
        "Return ticket or ticket reservation proof",
        "Accommodation proof during stay in Indonesia (hotel/residence)",
        "CV or resume for data verification",
        "Employment letter from original company",
        "COVID-19 vaccination certificate",
        "Itinerary during stay in Indonesia"
      ],
      // Multiple Entry requirements
      multipleEntryCompanyRequirements: [
        "Official invitation letter from the company in Indonesia addressed to the foreign worker",
        "Copy of company's NPWP (Tax ID)",
        "Copy of company's SIUP/NIB (Business License)",
        "Copy of valid company's TDP (Company Registration)",
        "Statement letter with stamp duty from the person in charge",
        "Visa application letter from the company",
        "Copy of ID card of the responsible person/company director",
        "Recommendation letter from relevant ministry (if required)",
        "Planned activities during the expatriate's visit"
      ],
      multipleEntryExpatRequirements: [
        "Valid passport with minimum 6 months validity from arrival date",
        "Recent color photograph with white background (size 4x6)",
        "Return ticket or ticket reservation proof",
        "Accommodation proof during stay in Indonesia (hotel/residence)",
        "CV or resume for data verification",
        "Employment letter from original company",
        "Sufficient financial proof for stay in Indonesia",
        "Valid international health insurance",
        "Completed visa application form",
        "COVID-19 vaccination certificate",
        "Itinerary during stay in Indonesia"
      ],
      singleEntry: "Single Entry",
      multipleEntry: "Multiple Entry"
    },
    id: {
      title: "Layanan Visa Kunjungan",
      subtitle: "Solusi terpercaya untuk pengurusan e-visa kunjungan ke Indonesia",
      singleEntryTitle: "E-Visa Single Entry",
      singleEntryDesc: "Visa elektronik untuk satu kali kunjungan ke Indonesia dengan masa berlaku 60 hari.",
      multipleEntryTitle: "E-Visa Multiple Entry",
      multipleEntryDesc: "Visa elektronik untuk beberapa kali kunjungan ke Indonesia dengan masa berlaku hingga 1 tahun.",
      singleEntryFeatures: [
        "Proses cepat dalam 3-5 hari kerja",
        "Berlaku untuk satu kali masuk ke Indonesia",
        "Dapat diperpanjang hingga 4 kali (30 hari per perpanjangan)",
        "Total maksimum 180 hari tinggal di Indonesia"
      ],
      multipleEntryFeatures: [
        "Proses dalam 5-7 hari kerja",
        "Berlaku untuk beberapa kali masuk ke Indonesia",
        "Maksimum tinggal 60 hari per kunjungan",
        "Masa berlaku visa hingga 12 bulan"
      ],
      requirementsTitle: "Persyaratan Visa Kunjungan",
      companyRequirementsTitle: "Persyaratan untuk Perusahaan",
      expatRequirementsTitle: "Persyaratan untuk Expatriat",
      // Single Entry requirements
      singleEntryCompanyRequirements: [
        "Surat undangan resmi dari perusahaan di Indonesia yang ditujukan kepada TKA",
        "Fotokopi NPWP perusahaan",
        "Fotokopi SIUP/NIB perusahaan",
        "Fotokopi TDP perusahaan yang masih berlaku",
        "Surat pernyataan penanggung jawab bermaterai",
        "Surat permohonan visa dari perusahaan"
      ],
      singleEntryExpatRequirements: [
        "Paspor yang masih berlaku minimal 6 bulan dari tanggal kedatangan",
        "Pas foto berwarna terbaru dengan latar belakang putih (ukuran 4x6)",
        "Tiket pulang-pergi atau bukti reservasi tiket",
        "Bukti akomodasi selama di Indonesia (hotel/tempat tinggal)",
        "CV atau resume untuk verifikasi data",
        "Surat keterangan kerja dari perusahaan asal",
        "Bukti telah divaksinasi COVID-19 (sertifikat vaksin)",
        "Jadwal kegiatan/itinerary selama di Indonesia"
      ],
      // Multiple Entry requirements
      multipleEntryCompanyRequirements: [
        "Surat undangan resmi dari perusahaan di Indonesia yang ditujukan kepada TKA",
        "Fotokopi NPWP perusahaan",
        "Fotokopi SIUP/NIB perusahaan",
        "Fotokopi TDP perusahaan yang masih berlaku",
        "Surat pernyataan penanggung jawab bermaterai",
        "Surat permohonan visa dari perusahaan",
        "Fotokopi KTP penanggung jawab/direktur perusahaan",
        "Surat rekomendasi dari kementerian terkait (jika diperlukan)",
        "Rencana kegiatan selama kunjungan expatriat"
      ],
      multipleEntryExpatRequirements: [
        "Paspor yang masih berlaku minimal 6 bulan dari tanggal kedatangan",
        "Pas foto berwarna terbaru dengan latar belakang putih (ukuran 4x6)",
        "Tiket pulang-pergi atau bukti reservasi tiket",
        "Bukti akomodasi selama di Indonesia (hotel/tempat tinggal)",
        "CV atau resume untuk verifikasi data",
        "Surat keterangan kerja dari perusahaan asal",
        "Bukti keuangan yang cukup selama di Indonesia",
        "Asuransi kesehatan internasional yang masih berlaku",
        "Formulir aplikasi visa yang telah diisi lengkap",
        "Bukti telah divaksinasi COVID-19 (sertifikat vaksin)",
        "Jadwal kegiatan/itinerary selama di Indonesia"
      ],
      singleEntry: "Single Entry",
      multipleEntry: "Multiple Entry"
    }
  };

  // Current language content
  const t = content[language];

  // Visa service data
  const visaServices = [
    {
      id: "single",
      title: t.singleEntryTitle,
      description: t.singleEntryDesc,
      features: t.singleEntryFeatures,
      icon: <SingleEntryIcon />
    },
    {
      id: "multiple",
      title: t.multipleEntryTitle,
      description: t.multipleEntryDesc,
      features: t.multipleEntryFeatures,
      icon: <MultipleEntryIcon />
    }
  ];

  // Function to get current requirements based on selected visa type
  const getCurrentRequirements = () => {
    if (selectedVisa === "single") {
      return {
        company: t.singleEntryCompanyRequirements,
        expat: t.singleEntryExpatRequirements
      };
    } else {
      return {
        company: t.multipleEntryCompanyRequirements,
        expat: t.multipleEntryExpatRequirements
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

        {/* Visa Type Selection Tabs */}
        <div className="flex justify-center border-b border-gray-200 mb-8">
          <button
            onClick={() => setSelectedVisa("single")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedVisa === "single" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.singleEntry}
          </button>
          <button
            onClick={() => setSelectedVisa("multiple")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedVisa === "multiple" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.multipleEntry}
          </button>
        </div>

        {/* Selected Visa Information */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 lg:gap-8 my-8 max-w-4xl mx-auto"
        >
          {visaServices
            .filter(service => service.id === selectedVisa)
            .map((service) => (
              <motion.div 
                key={service.id}
                variants={slideIn}
                
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-t-4 border-blue-600 flex flex-col"
              >
                <motion.div 
                  
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="text-blue-600 dark:text-blue-400 mb-4"
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
                  {service.features.map((feature, idx) => (
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

        {/* Requirements Section - Based on selected visa */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {t.requirementsTitle} - {selectedVisa === "single" ? t.singleEntry : t.multipleEntry}
          </motion.h2>
          
          <motion.div 
            key={selectedVisa} // Add a key to force re-render when visa type changes
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto"
          >
            {/* Persyaratan untuk Perusahaan */}
            <motion.div 
              variants={slideIn}
              
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <CompanyIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.companyRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {currentRequirements.company.map((requirement, index) => (
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
            
            {/* Persyaratan untuk Expatriat */}
            <motion.div 
              variants={slideIn}
              
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <ExpatIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.expatRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {currentRequirements.expat.map((requirement, index) => (
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

const VisaServicesPage = () => {
  return (
    <>
      <VisaServicesSection />
    </>
  );
};

export default VisaServicesPage;