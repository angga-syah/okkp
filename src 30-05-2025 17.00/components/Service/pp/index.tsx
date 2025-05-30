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
const CompanyRegulationsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

const ContentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Company Regulations Services Section
const CompanyRegulationsSection = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Company Regulations Services",
      subtitle: "Professional assistance with creation and registration of company regulations in compliance with Indonesian labor laws",
      serviceTitle: "Company Regulations",
      serviceDesc: "Company Regulations are a mandatory document that outlines the rights and obligations of both employers and employees in accordance with Indonesian labor laws",
      requirementsTitle: "Required Documents",
      requirements: [
        "Employment data",
        "Company leader's statement letter",
        "Minutes of Company Regulations drafting discussion",
        "Copy of manpower report (UU No.7/1981)",
        "Copy of previous Company Regulations endorsement decree and the regulations",
        "Proof of latest payment for BPJS Employment and BPJS Health programs",
        "Proof of latest payment for JSHK Program",
        "Company Regulations document in 3 copies",
        "Wage Scale Statement"
      ],
      contentTitle: "Company Regulations Content",
      content: [
        "Rights and obligations of employers and employees",
        "Working conditions and requirements",
        "Company rules and code of conduct",
        "Working period and working hours",
        "Absence policy and leave entitlements",
        "Wage and compensation structures",
        "Social security and welfare provisions",
        "Disciplinary measures and termination procedures",
        "Grievance handling procedures",
        "Occupational health and safety provisions"
      ],
      benefitsTitle: "Benefits of Well-Drafted Company Regulations",
      benefits: [
        "Compliance with Indonesian labor laws (Law No. 13 of 2003)",
        "Clear framework for employer-employee relationship",
        "Prevention of labor disputes and conflicts",
        "Legal protection for both the company and employees",
        "Standardized procedures for handling various workplace situations",
        "Basis for fair and consistent employment practices"
      ]
    },
    id: {
      title: "Layanan Peraturan Perusahaan",
      subtitle: "Bantuan profesional untuk pembuatan dan pendaftaran peraturan perusahaan sesuai dengan undang-undang ketenagakerjaan Indonesia",
      serviceTitle: "Peraturan Perusahaan",
      serviceDesc: "Peraturan Perusahaan adalah dokumen wajib yang menguraikan hak dan kewajiban pemberi kerja dan pekerja sesuai dengan undang-undang ketenagakerjaan Indonesia",
      requirementsTitle: "Dokumen yang Diperlukan",
      requirements: [
        "Data-data ketenagakerjaan",
        "Surat pernyataan pimpinan perusahaan",
        "Berita Acara hasil pembahasan penyusunan Peraturan Perusahaan",
        "Fotocopy wajib lapor ketenagakerjaan (UU No.7/1981)",
        "Fotocopy SK Pengesahan dan Peraturan Perusahaan yang lama",
        "Fotocopy bukti pembayaran terakhir program BPJS Ketenagakerjaan dan BPJS Kesehatan",
        "Fotocopy bukti pembayaran terakhir Program JSHK",
        "Peraturan Perusahaan sebanyak 3 (tiga) berkas",
        "Surat Pernyataan Skala Upah"
      ],
      contentTitle: "Isi Peraturan Perusahaan",
      content: [
        "Hak dan kewajiban pemberi kerja dan pekerja",
        "Kondisi dan persyaratan kerja",
        "Aturan perusahaan dan kode etik",
        "Masa kerja dan jam kerja",
        "Kebijakan ketidakhadiran dan hak cuti",
        "Struktur upah dan kompensasi",
        "Jaminan sosial dan kesejahteraan",
        "Tindakan disipliner dan prosedur pemutusan hubungan kerja",
        "Prosedur penanganan keluhan",
        "Ketentuan kesehatan dan keselamatan kerja"
      ],
      benefitsTitle: "Manfaat Peraturan Perusahaan yang Disusun dengan Baik",
      benefits: [
        "Kepatuhan terhadap undang-undang ketenagakerjaan Indonesia (UU No. 13 Tahun 2003)",
        "Kerangka kerja yang jelas untuk hubungan pemberi kerja-pekerja",
        "Pencegahan perselisihan dan konflik ketenagakerjaan",
        "Perlindungan hukum bagi perusahaan dan karyawan",
        "Prosedur standar untuk menangani berbagai situasi di tempat kerja",
        "Dasar untuk praktik ketenagakerjaan yang adil dan konsisten"
      ]
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeIn}
          className="text-center mb-8" // Reduced margin-bottom here
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
          className="grid grid-cols-1 gap-6 lg:gap-8 my-8 max-w-4xl mx-auto" // Reduced margin-y here
        >
          <motion.div 
            variants={slideIn}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border-t-4 border-blue-600 flex flex-col"
          >
            <motion.div 
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="text-blue-600 dark:text-blue-400 mb-4"
            >
              <CompanyRegulationsIcon />
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

        {/* Requirements Section */}
        <div className="mt-6"> {/* Reduced margin-top here */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto mb-12" // Reduced margin-bottom here
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

        {/* Content Section */}
        <div className="mt-12"> {/* Reduced margin-top here */}
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center" // Reduced margin-bottom here
          >
            {t.contentTitle}
          </motion.h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto mb-12" // Reduced margin-bottom here
          >
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <ContentIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.contentTitle}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t.content.map((item, index) => (
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
        </div>

        {/* Benefits Section */}
        <div className="mt-12"> {/* Reduced margin-top here */}
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center" // Reduced margin-bottom here
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
        <div className="mt-12 mb-8"> {/* Added margin-bottom and reduced margin-top here */}
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center" // Reduced margin-bottom here
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
                className="relative mb-6" // Reduced margin-bottom here
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">1</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Consultation & Data Collection' : 'Konsultasi & Pengumpulan Data'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We gather information about your company and existing employment practices' : 'Kami mengumpulkan informasi tentang perusahaan Anda dan praktik ketenagakerjaan yang ada'}</p>
                </div>
              </motion.div>
              
              {/* Step 2 */}
              <motion.div 
                variants={fadeIn}
                className="relative mb-6" // Reduced margin-bottom here
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">2</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Drafting Company Regulations' : 'Penyusunan Peraturan Perusahaan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We develop a comprehensive draft of company regulations tailored to your business needs while ensuring compliance with labor laws' : 'Kami mengembangkan draf peraturan perusahaan yang komprehensif yang disesuaikan dengan kebutuhan bisnis Anda sambil memastikan kepatuhan terhadap undang-undang ketenagakerjaan'}</p>
                </div>
              </motion.div>
              
              {/* Step 3 */}
              <motion.div 
                variants={fadeIn}
                className="relative mb-6" // Reduced margin-bottom here
              >
                <div className="flex items-center mb-2">
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold z-10">3</div>
                  <div className="flex-grow h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Review & Discussion' : 'Peninjauan & Diskusi'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We conduct a review session with your management to ensure the regulations meet your company\'s needs and expectations' : 'Kami melakukan sesi tinjauan dengan manajemen Anda untuk memastikan peraturan memenuhi kebutuhan dan harapan perusahaan Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Registration & Approval' : 'Pendaftaran & Pengesahan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle the submission of your company regulations to the Ministry of Manpower for official approval and registration' : 'Kami menangani pengajuan peraturan perusahaan Anda ke Kementerian Ketenagakerjaan untuk persetujuan dan pendaftaran resmi'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CompanyRegulationsPage = () => {
  return (
    <>
      <CompanyRegulationsSection />
    </>
  );
};

export default CompanyRegulationsPage;