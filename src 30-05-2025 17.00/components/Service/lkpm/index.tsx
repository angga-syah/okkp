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
const LKPMIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProcedureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

// LKPM Services Section
const LKPMServicesSection = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Investment Activity Reporting (LKPM) Services",
      subtitle: "Professional assistance with mandatory investment activity reporting for businesses in Indonesia",
      serviceTitle: "Investment Activity Report (LKPM)",
      serviceDesc: "Comprehensive service for preparing and submitting the mandatory Investment Activity Report (LKPM) required by the Indonesian Investment Coordinating Board (BKPM)",
      procedureTitle: "LKPM Reporting Procedure",
      procedure: [
        "For investors who have obtained Business Licenses, both those who have not yet started commercial production and those who are already in commercial production with an investment value above IDR 500,000,000, are required to submit LKPM in the specified period",
        "For investors who have not yet submitted LKPM for the fourth quarter of the previous year, please submit LKPM for the specified period immediately",
        "For investors with business activities located in more than one regency/city, submit LKPM for each project location (each regency/city)",
        "For investors with more than one business field, submit LKPM for each business field",
        "LKPM must be submitted online through SPIPISE (http://lkpmonline.bkpm.go.id) using access rights granted by BKPM-RI or through the Reporting menu in the Online Single Submission system (https://oss.go.id)",
        "If investors cannot submit LKPM due to lack of access rights, please do the following:",
        "For investors who do not yet have a NIB but have previous Investment Permits, including Business Permits, Principle Permits, Investment Registration, or other investment permits, please register for NIB immediately on the OSS system and enter the project for such permits into the business activity list",
        "For investors who do not yet have access rights, submit applications via email to helpdesk.spipise@bkpm.go.id by attaching: 1) Company deed with the latest Board of Directors composition; 2) Director's identity (KTP/passport); and 3) Power of attorney and proxy's identity if LKPM management is authorized to another party",
        "LKPM must be submitted with the person in charge and office phone number/mobile phone and email that can be contacted",
        "LKPM submission procedures can be downloaded through http://lkpmonline.bkpm.go.id via the LKPM Online System User Guide menu",
        "For companies that cannot submit LKPM online, please coordinate with the nearest Investment Affairs agency to your company's domicile"
      ],
      benefitsTitle: "Benefits of Our LKPM Services",
      benefits: [
        "Ensure compliance with BKPM reporting requirements",
        "Avoid potential penalties for late or missing reports",
        "Professional preparation of accurate investment activity reports",
        "Timely submission through proper channels",
        "Expert guidance on required documentation and data",
        "Ongoing support for quarterly reporting obligations"
      ]
    },
    id: {
      title: "Jasa Pembuatan Laporan Kegiatan Penanaman Modal (LKPM)",
      subtitle: "Bantuan profesional untuk pelaporan kegiatan penanaman modal wajib bagi bisnis di Indonesia",
      serviceTitle: "Laporan Kegiatan Penanaman Modal (LKPM)",
      serviceDesc: "Layanan komprehensif untuk menyiapkan dan menyampaikan Laporan Kegiatan Penanaman Modal (LKPM) yang diwajibkan oleh Badan Koordinasi Penanaman Modal (BKPM)",
      procedureTitle: "Tata Cara Laporan Kegiatan Penanaman Modal",
      procedure: [
        "Bagi penanam modal (pelaku usaha) yang telah memperoleh Perizinan Berusaha baik yang belum berproduksi komersial maupun yang sudah berproduksi komersial dengan nilai investasi di atas Rp 500.000.000,00 (lima ratus juta) wajib menyampaikan LKPM pada periode yang ditentukan",
        "Bagi penanam modal (pelaku usaha) yang belum menyampaikan LKPM triwulan IV tahun sebelumnya, untuk dapat segera menyampaikan LKPM Pada Periode yang ditentukan",
        "Bagi penanam modal (pelaku usaha) yang memiliki kegiatan usaha berlokasi di lebih dari 1 (satu) kabupaten/kota, wajib menyampaikan LKPM setiap lokasi proyek (masing-masing kabupaten/kota)",
        "Bagi penanam modal (pelaku usaha) yang memiliki lebih dari 1 (satu) bidang usaha, wajib menyampaikan LKPM untuk masing-masing bidang usaha",
        "LKPM wajib disampaikan dalam jaringan (daring) melalui SPIPISE (http://lkpmonline.bkpm.go.id) dengan menggunakan hak akses yang diberikan oleh BKPM-RI atau melalui menu Pelaporan dalam sistem Online Single Submission (https://oss.go.id)",
        "Dalam hal penanam modal (pelaku usaha) tidak dapat menyampaikan LKPM karena tidak memiliki hak akses maka agar dapat melakukan hal sebagai berikut:",
        "Bagi penanam modal (pelaku usaha) yang belum memiliki NIB namun telah memiliki Perizinan Penanaman Modal sebelumnya, baik berupa Izin Usaha, Izin Prinsip, Pendaftaran Penanaman Modal, Pendaftaran Investasi, atau perizinan penanaman modal lainnya, untuk dapat segera melakukan pendaftaran NIB pada sistem OSS dan memasukkan proyek atas perizinan tersebut ke dalam daftar kegiatan usaha",
        "Bagi penanam modal (pelaku usaha) yang belum memiliki hak akses dapat mengajukan permohonan melalui e-mail ke helpdesk.spipise@bkpm.go.id dengan melampirkan: 1) Akta perusahaan yang memuat susunan Direksi terakhir; 2) Identitas Direksi (KTP/paspor); serta 3) Surat kuasa dan identitas penerima kuasa apabila pengurusan LKPM dikuasakan",
        "LKPM wajib disampaikan dengan mencantumkan penanggung jawab beserta nomor telepon kantor/handphone dan e-mail yang dapat dihubungi",
        "Tata cara penyampaian LKPM dapat diunduh melalui http://lkpmonline.bkpm.go.id melalui menu Panduan Penggunaan Sistem LKPM Online",
        "Bagi perusahaan yang belum dapat menyampaikan LKPM secara online agar berkoordinasi dengan instansi yang menangani urusan Penanaman Modal yang terdekat dengan tempat kedudukan perusahaan"
      ],
      benefitsTitle: "Manfaat Layanan LKPM Kami",
      benefits: [
        "Memastikan kepatuhan terhadap persyaratan pelaporan BKPM",
        "Menghindari potensi sanksi untuk laporan yang terlambat atau tidak ada",
        "Persiapan profesional laporan kegiatan investasi yang akurat",
        "Pengajuan tepat waktu melalui saluran yang tepat",
        "Panduan ahli tentang dokumentasi dan data yang diperlukan",
        "Dukungan berkelanjutan untuk kewajiban pelaporan triwulanan"
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
              <LKPMIcon />
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

        {/* LKPM Procedure Section */}
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
                  <ProcedureIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.procedureTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.procedure.map((step, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{step}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Initial Assessment' : 'Penilaian Awal'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We evaluate your investment status, business structure, and reporting requirements' : 'Kami mengevaluasi status investasi, struktur bisnis, dan persyaratan pelaporan Anda'}</p>
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We gather all required investment data, documentation, and supporting evidence' : 'Kami mengumpulkan semua data investasi, dokumentasi, dan bukti pendukung yang diperlukan'}</p>
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We prepare comprehensive LKPM reports according to BKPM standards and your specific investment activities' : 'Kami menyiapkan laporan LKPM yang komprehensif sesuai dengan standar BKPM dan kegiatan investasi spesifik Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Submission & Follow-up' : 'Pengajuan & Tindak Lanjut'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle the online submission through official channels and monitor for confirmation of receipt' : 'Kami menangani pengajuan online melalui saluran resmi dan memantau konfirmasi penerimaan'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const LKPMServicesPage = () => {
  return (
    <>
      <LKPMServicesSection />
    </>
  );
};

export default LKPMServicesPage;