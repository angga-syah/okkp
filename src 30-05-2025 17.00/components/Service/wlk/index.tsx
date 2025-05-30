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
const ManpowerReportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const OnlineProcessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const RequirementsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BenefitsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Manpower Report Services Section Continued
const ManpowerReportSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Mandatory Manpower Report (Online) Services",
      subtitle: "Professional assistance with mandatory manpower reporting compliance required by Indonesian labor laws",
      serviceTitle: "Mandatory Manpower Report",
      serviceDesc: "Annual manpower report that all companies in Indonesia are required to submit to the Ministry of Manpower in accordance with Law No. 7 of 1981",
      requirementsTitle: "Registration Requirements",
      requirements: [
        "If you don't have an account yet, you can register your company in the mandatory reporting system through the 'Company Registration' link",
        "Fill in the complete data in the registration column",
        "After your company is registered, you can use the online manpower reporting service"
      ],
      dataRequirementsTitle: "Required Company Data",
      dataRequirements: [
        "User and company profile",
        "Company legality",
        "Company status",
        "Workforce data",
        "Foreign workers data",
        "Social security information (BPJS)",
        "Job vacancies",
        "Training programs",
        "Wage information"
      ],
      benefitsTitle: "Benefits of Our Services",
      benefits: [
        "Ensure compliance with Indonesian labor laws (Law No. 7 of 1981)",
        "Avoid potential fines and legal penalties for non-compliance",
        "Save time and resources by outsourcing the reporting process",
        "Accurate reporting with professional assistance",
        "Timely submission before deadlines",
        "Expert guidance through the entire online process"
      ]
    },
    id: {
      title: "Layanan Wajib Lapor Ketenagakerjaan (Online)",
      subtitle: "Bantuan profesional untuk kepatuhan wajib lapor ketenagakerjaan yang diwajibkan oleh undang-undang ketenagakerjaan Indonesia",
      serviceTitle: "Wajib Lapor Ketenagakerjaan",
      serviceDesc: "Laporan ketenagakerjaan tahunan yang wajib disampaikan oleh semua perusahaan di Indonesia kepada Kementerian Ketenagakerjaan sesuai dengan UU No. 7 Tahun 1981",
      requirementsTitle: "Persyaratan Pendaftaran",
      requirements: [
        "Jika belum punya akun, kamu dapat meregistrasikan perusahaan kamu ke dalam sistem wajib lapor, lewat tautan 'Pendaftaran Perusahaan'",
        "Isi kelengkapan data pada kolom registrasi",
        "Setelah perusahaan kamu terdaftar, kamu sudah bisa menggunakan layanan lapor ketenagakerjaan secara online"
      ],
      dataRequirementsTitle: "Data Perusahaan yang Diperlukan",
      dataRequirements: [
        "Profil penguna dan perusahaan",
        "Legalitas perusahaan",
        "Status perusahaan",
        "Tenaga kerja",
        "Tenaga kerja asing",
        "Jaminan sosial, terkait BPJS",
        "Lowongan tenaga kerja",
        "Pelatihan",
        "Pengupahan"
      ],
      benefitsTitle: "Manfaat Layanan Kami",
      benefits: [
        "Memastikan kepatuhan terhadap undang-undang ketenagakerjaan Indonesia (UU No. 7 Tahun 1981)",
        "Menghindari potensi denda dan sanksi hukum atas ketidakpatuhan",
        "Menghemat waktu dan sumber daya dengan mengalihdayakan proses pelaporan",
        "Pelaporan akurat dengan bantuan profesional",
        "Pengajuan tepat waktu sebelum batas waktu",
        "Panduan ahli melalui seluruh proses online"
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
              <ManpowerReportIcon />
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

        {/* Registration Requirements Section */}
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
                <OnlineProcessIcon />
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
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <CheckIcon />
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{requirement}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Data Requirements Section */}
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
                  <RequirementsIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.dataRequirementsTitle}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t.dataRequirements.map((requirement, index) => (
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
              
              <div className="space-y-4">
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Account Registration' : 'Pendaftaran Akun'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We help set up your company account in the mandatory labor reporting system if you don\'t have one yet' : 'Kami membantu mengatur akun perusahaan Anda dalam sistem wajib lapor ketenagakerjaan jika Anda belum memilikinya'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Data Collection' : 'Pengumpulan Data'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We collect and organize all required company data for the manpower report, ensuring accuracy and completeness' : 'Kami mengumpulkan dan mengorganisir semua data perusahaan yang diperlukan untuk laporan ketenagakerjaan, memastikan akurasi dan kelengkapan'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Report Preparation' : 'Persiapan Laporan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We prepare the manpower report in accordance with the latest regulatory requirements and your company\'s specific situation' : 'Kami menyiapkan laporan ketenagakerjaan sesuai dengan persyaratan peraturan terbaru dan situasi spesifik perusahaan Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Online Submission' : 'Pengajuan Online'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle the online submission process through the official government reporting system and ensure confirmation of receipt' : 'Kami menangani proses pengajuan online melalui sistem pelaporan pemerintah resmi dan memastikan konfirmasi penerimaan'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ManpowerReportPage = () => {
  return (
    <>
      <ManpowerReportSectionContinued />
    </>
  );
};

export default ManpowerReportPage;