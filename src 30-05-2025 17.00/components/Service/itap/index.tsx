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
const PermanentResidenceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BenefitsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const EligibilityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// ITAP Services Section Continued
const ITAPServicesSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Permanent Stay Permit (ITAP) Services",
      subtitle: "Professional assistance for obtaining Permanent Stay Permit in Indonesia",
      serviceTitle: "Permanent Stay Permit (ITAP)",
      serviceDesc: "Permanent Stay Permit for foreign nationals intending to establish long-term residency in Indonesia",
      eligibilityTitle: "Eligibility Criteria",
      eligibility: [
        "Foreign spouse married to an Indonesian citizen for at least 2 years",
        "Child of mixed marriage between foreign and Indonesian citizens",
        "Foreign worker as the highest leader in a company and holding ITAS for more than 4 consecutive years",
        "Foreign investor with a recommendation from the Investment Coordinating Board (BKPM) and holding ITAS for more than 4 consecutive years"
      ],
      requirementsTitle: "Requirements",
      requirements: [
        "Application letter from the sponsor",
        "Statement letter and guarantee from the sponsor (with Rp. 6000 stamp duty)",
        "Integration statement from the applicant (with Rp. 6000 stamp duty)",
        "Sponsor's identity card (KTP)",
        "Status change application form",
        "Original passport and photocopy",
        "Domicile certificate from the local village office",
        "Original KITAS and photocopy",
        "For Indonesian spouse sponsor: Marriage Book, sponsor's KTP, sponsor's Family Card, and marriage bond certificate from relevant institution (minimum marriage period of more than 2 years)",
        "For Indonesian Parent sponsor: applicant's birth certificate translated to Indonesian or English with certification",
        "For Foreign Worker: Latest IMTA and RPTKA and other company documents (foreign worker as highest leader in the company and holding ITAS for more than 4 consecutive years)",
        "For Foreign Investor (PMA): Recommendation from Investment Coordinating Board (BKPM), company documents, and holding ITAS for more than 4 consecutive years"
      ],
      benefitsTitle: "Benefits of Permanent Stay Permit",
      benefits: [
        "Long-term residency in Indonesia without frequent renewals",
        "Ability to work legally in Indonesia",
        "Access to Indonesian banking and financial services",
        "Ability to purchase property in Indonesia (with certain restrictions)",
        "Easier travel in and out of Indonesia",
        "Pathway to potential future citizenship options"
      ]
    },
    id: {
      title: "Layanan Izin Tinggal Tetap (ITAP)",
      subtitle: "Bantuan profesional untuk memperoleh Izin Tinggal Tetap di Indonesia",
      serviceTitle: "Izin Tinggal Tetap (ITAP)",
      serviceDesc: "Izin Tinggal Tetap bagi warga negara asing yang bermaksud menetap dalam jangka panjang di Indonesia",
      eligibilityTitle: "Kriteria Kelayakan",
      eligibility: [
        "Pasangan asing yang menikah dengan warga negara Indonesia minimal selama 2 tahun",
        "Anak dari perkawinan campuran antara warga negara asing dan warga negara Indonesia",
        "Tenaga kerja asing sebagai pimpinan tertinggi di perusahaan dan memegang ITAS lebih dari 4 tahun berturut-turut",
        "Penanam Modal Asing (PMA) dengan rekomendasi dari Badan Koordinasi Penanaman Modal (BKPM) dan memegang ITAS lebih dari 4 tahun berturut-turut"
      ],
      requirementsTitle: "Persyaratan",
      requirements: [
        "Surat permohonan alih status dari sponsor",
        "Surat pernyataan dan jaminan dari sponsor (bermaterai Rp. 6000,-)",
        "Surat pernyataan integrasi dari pemohon (bermaterai Rp. 6000,-)",
        "KTP sponsor",
        "Formulir pegajuan alih status",
        "Paspor asli dan fotocopy",
        "Surat Keterangan domisili dari kelurahan",
        "KITAS asli dan fotocopy",
        "Untuk sponsor istri atau suami WNI melampirkan Buku Nikah, KTP sponsor, Kartu Keluarga sponsor serta surat ikatan perkawinan dari instansi terkait (minimal masa pernikahan lebih dari 2 tahun)",
        "Untuk sponsor Orang Tua WNI melampirkan akte kelahiran pemohon yang terjemahan Bahasa Indonesia atau Bahasa Inggris bersertifikat",
        "Untuk TKA melampirkan IMTA dan RPTKA terbaru serta dokumen perusahaan lainnya (TKA sebagai pimpinan tertinggi di perusahaan dan pemegang ITAS lebih dari 4 (empat) tahun berturut-turut)",
        "Untuk Penanam Modal Asing (PMA) melampirkan Rekomendasi dari Badan Kordinasi Penanam Modal (BKPM), dokumen perusahaan dan pemegang ITAS lebih dari 4 (empat) tahun berturutm turut)"
      ],
      benefitsTitle: "Keuntungan Izin Tinggal Tetap",
      benefits: [
        "Tinggal jangka panjang di Indonesia tanpa perpanjangan yang sering",
        "Kemampuan untuk bekerja secara legal di Indonesia",
        "Akses ke layanan perbankan dan keuangan Indonesia",
        "Kemampuan untuk membeli properti di Indonesia (dengan batasan tertentu)",
        "Perjalanan masuk dan keluar Indonesia yang lebih mudah",
        "Jalur menuju opsi kewarganegaraan di masa depan"
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
              <PermanentResidenceIcon />
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

        {/* Eligibility Section */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-4xl mx-auto mb-12"
        >
          <motion.div 
            variants={slideIn}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600"
          >
            <div className="flex items-center mb-6">
              <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <EligibilityIcon />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.eligibilityTitle}</h3>
            </div>
            
            <div className="space-y-4">
              {t.eligibility.map((item, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start"
                >
                  <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <CheckIcon />
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Requirements Section */}
        <div className="mt-8">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto mb-12"
          >
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <DocumentIcon />
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

        {/* Benefits Section */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {t.benefitsTitle}
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
                  <BenefitsIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.benefitsTitle}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t.benefits.map((benefit, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <CheckIcon />
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{benefit}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Initial Consultation' : 'Konsultasi Awal'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assess your eligibility for permanent stay permit based on your specific situation' : 'Kami menilai kelayakan Anda untuk izin tinggal tetap berdasarkan situasi spesifik Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Document Preparation' : 'Persiapan Dokumen'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We help you gather and prepare all required documents based on your eligibility category' : 'Kami membantu Anda mengumpulkan dan menyiapkan semua dokumen yang diperlukan berdasarkan kategori kelayakan Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Application Submission' : 'Pengajuan Aplikasi'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We submit your application to the immigration authorities and follow up on the process' : 'Kami mengajukan aplikasi Anda ke otoritas imigrasi dan melakukan tindak lanjut pada proses tersebut'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'ITAP Card Delivery' : 'Pengiriman Kartu ITAP'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We collect and deliver your permanent stay permit card once it is issued' : 'Kami mengambil dan mengirimkan kartu izin tinggal tetap Anda setelah diterbitkan'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ITAPServicesPage = () => {
  return (
    <>
      <ITAPServicesSectionContinued />
    </>
  );
};

export default ITAPServicesPage;