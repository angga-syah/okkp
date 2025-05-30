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
const MutasiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const AddressIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const PassportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
  </svg>
);

const PositionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Mutasi Services Section Continued
const MutasiServicesSectionContinued = () => {
  const { language } = useLanguage();
  const [selectedType, setSelectedType] = useState("address");

  // Content translations
  const content = {
    en: {
      title: "Change/Transfer (Mutasi) Services",
      subtitle: "Professional assistance for address changes, passport changes, or position transfers for foreign residents in Indonesia",
      serviceTitle: "Change/Transfer (Mutasi) Services",
      serviceDesc: "Comprehensive service for processing changes in address, passport, or job position for foreigners with Indonesian residence permits",
      addressTitle: "Address Change",
      passportTitle: "Passport Change",
      positionTitle: "Position Transfer",
      // Address Change Requirements
      addressRequirements: [
        "Change of address application letter (with company stamp or stamp duty for family sponsors)",
        "Sponsor's ID card (photocopy)",
        "Sponsor guarantee statement (stamped and company stamp)",
        "Domicile certificate from apartment if foreign national lives in an apartment",
        "Power of attorney with stamp duty (if authorized)",
        "Foreign passport (original and copy)",
        "ID card of authorized person (copy)",
        "Online KITAS (copy)",
        "For foreign workers, attach IMTA (copy)"
      ],
      // Passport Change Requirements
      passportRequirements: [
        "Passport change application letter (with company stamp or stamp duty for family sponsors)",
        "Sponsor's ID card (photocopy)",
        "Power of attorney with stamp duty (if authorized)",
        "ID card of authorized person (copy)",
        "Old and new foreign passports (original and copy)",
        "Online KITAS (copy)",
        "For foreign workers, attach IMTA (copy)",
        "For Indonesian spouse sponsors, attach Marriage Book, Sponsor's ID Card, and Sponsor's Family Card (copy)",
        "If the new passport pages are already used, please attach a Neglect Statement Letter for passport change processing"
      ],
      // Position Transfer Requirements
      positionRequirements: [
        "Application letter from sponsor",
        "Statement and guarantee letter from sponsor (with Rp. 6000 stamp duty)",
        "Sponsor's ID card",
        "Position transfer application form",
        "Original passport and photocopy",
        "Domicile certificate from local village office",
        "Original KITAP and photocopy",
        "For foreign workers, attach latest IMTA and RPTKA, TA 03 and other company documents",
        "For Foreign Investors (PMA), attach Business Identification Number (NIB), Business License, Company Registration Certificate, Business Domicile Certificate, Notary Deed, Principle License, Company Tax ID, and Recommendation from Investment Coordinating Board (BKPM) and other company documents"
      ],
      addressChange: "Address Change",
      passportChange: "Passport Change",
      positionTransfer: "Position Transfer",
      requirementsTitle: "Requirements"
    },
    id: {
      title: "Layanan Mutasi",
      subtitle: "Bantuan profesional untuk perubahan alamat, perubahan paspor, atau alih jabatan bagi warga asing di Indonesia",
      serviceTitle: "Layanan Mutasi",
      serviceDesc: "Layanan komprehensif untuk memproses perubahan alamat, paspor, atau posisi jabatan bagi warga negara asing dengan izin tinggal Indonesia",
      addressTitle: "Mutasi Alamat",
      passportTitle: "Mutasi Paspor",
      positionTitle: "Mutasi/Alih Jabatan",
      // Address Change Requirements
      addressRequirements: [
        "Surat Permohonan pindah alamat (cap perusahaan)/(bermaterai bila sponsor keluarga)",
        "KTP sponsor (fotokopi)",
        "Surat Pernyataan Jaminan dari Sponsor (materai dan cap perusahaan)",
        "Surat keterangan domisili dari apartemen apabila WNA tinggal di Apartemen",
        "Surat Kuasa bermaterai (jika dikuasakan)",
        "Paspor asing (asli dan copy)",
        "KTP yang dikuasakan (copy)",
        "KITAS Online (copy)",
        "Untuk TKA melampirkan IMTA (copy)"
      ],
      // Passport Change Requirements
      passportRequirements: [
        "Surat Permohonan Mutasi Paspor (cap perusahaan)/(bermaterai bila sponsor keluarga)",
        "KTP sponsor (fotokopi)",
        "Surat Kuasa bermaterai (jika dikuasakan)",
        "KTP yang dikuasakan (copy)",
        "Paspor Asing lama dan baru (asli dan copy)",
        "KITAS Online (copy)",
        "Untuk TKA melampirkan IMTA (copy)",
        "Untuk sponsor Istri/Suami WNI melampirkan Buku Nikah, KTP Sponsor, dan Kartu Keluarga Sponsor (copy)",
        "Apabila paspor baru halamannya sudah terpakai HARAP melampirkan Surat Pernyataan Lalai dalam pengurusan mutasi paspor"
      ],
      // Position Transfer Requirements
      positionRequirements: [
        "Surat permohonan dari sponsor",
        "Surat pernyataan dan jaminan dari sponsor (bermaterai Rp. 6000,-)",
        "KTP sponsor",
        "Formulir pengajuan Alih Jabatan",
        "Paspor asli dan fotocopy",
        "Surat keterangan domisili dari kelurahan",
        "KITAP asli dan fotocopy",
        "Untuk TKA melampirkan IMTA dan RPTKA terbaru, TA 03 serta dokumen perusahaan lainnya",
        "Untuk Penanam Modal Asing (PMA) melampirkan Nomor Induk Berusaha (NIB), Izin Usaha, Tanda Daftar Perusahaan, Surat Keterangan Domisili Usaha, Akte Notaris, Izin Prinsip, NPWP Perusahaan dan Rekomendasi dari Badan Kordinasi Penanaman Modal (BKPM) serta dokumen perusahaan lainnya"
      ],
      addressChange: "Mutasi Alamat",
      passportChange: "Mutasi Paspor",
      positionTransfer: "Alih Jabatan",
      requirementsTitle: "Persyaratan"
    }
  };

  // Current language content
  const t = content[language];

  // Function to get current requirements based on selected type
  const getCurrentRequirements = () => {
    if (selectedType === "address") {
      return {
        title: t.addressTitle,
        requirements: t.addressRequirements,
        icon: <AddressIcon />
      };
    } else if (selectedType === "passport") {
      return {
        title: t.passportTitle,
        requirements: t.passportRequirements,
        icon: <PassportIcon />
      };
    } else {
      return {
        title: t.positionTitle,
        requirements: t.positionRequirements,
        icon: <PositionIcon />
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
              <MutasiIcon />
            </motion.div>
            <motion.h3 
              className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center"
            >
              {t.serviceTitle}
            </motion.h3>
            <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
              {t.serviceDesc}
            </p>
          </motion.div>
        </motion.div>

        {/* Service Type Selection Tabs */}
        <div className="flex justify-center border-b border-gray-200 mb-8">
          <button
            onClick={() => setSelectedType("address")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedType === "address" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.addressChange}
          </button>
          <button
            onClick={() => setSelectedType("passport")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedType === "passport" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.passportChange}
          </button>
          <button
            onClick={() => setSelectedType("position")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedType === "position" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.positionTransfer}
          </button>
        </div>

        {/* Requirements Section */}
        <div className="mt-8">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto mb-12"
            key={selectedType}
          >
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  {currentRequirements.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentRequirements.title} - {t.requirementsTitle}</h3>
              </div>
              
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

        {/* Service Process */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {language === 'en' ? 'Our Service Process' : 'Proses Layanan Kami'}
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We collect all required documents based on your specific change/transfer type' : 'Kami mengumpulkan semua dokumen yang diperlukan berdasarkan jenis mutasi Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Application Preparation' : 'Persiapan Aplikasi'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We prepare and verify your application to ensure it meets all immigration requirements' : 'Kami menyiapkan dan memverifikasi aplikasi Anda untuk memastikan memenuhi semua persyaratan imigrasi'}</p>
                </div>
              </motion.div>
              
              {/* Step 3 */}
              <motion.div 
                variants={fadeIn}
                className="relative mb-8"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">3</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Submission & Processing' : 'Pengajuan & Pemrosesan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We submit your application to immigration authorities and monitor the processing status' : 'Kami mengajukan aplikasi Anda ke otoritas imigrasi dan memantau status pemrosesan'}</p>
                </div>
              </motion.div>
              
              {/* Step 4 */}
              <motion.div 
                variants={fadeIn}
                className="relative"
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">4</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Completion & Delivery' : 'Penyelesaian & Pengiriman'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We collect the approved documentation and deliver it to you with instructions for any next steps' : 'Kami mengumpulkan dokumentasi yang disetujui dan mengirimkannya kepada Anda dengan instruksi untuk langkah-langkah selanjutnya'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MutasiServicesPage = () => {
  return (
    <>
      <MutasiServicesSectionContinued />
    </>
  );
};

export default MutasiServicesPage;