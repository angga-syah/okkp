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
const DomicileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Surat Keterangan Domisili Services Continued
const SKDServicesSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Certificate of Domicile Services",
      subtitle: "Comprehensive assistance for obtaining Certificate of Domicile (SKDU) for business in Indonesia",
      serviceTitle: "Certificate of Domicile",
      serviceDesc: "An official document that certifies the location of a business operation, required for various business registrations and licenses",
      serviceFeatures: [
        "Professional handling of all documentation requirements",
        "Efficient processing with minimal wait times",
        "Assistance with form completion and preparation",
        "Complete compliance with local regulations"
      ],
      requirementsTitle: "Requirements for Certificate of Domicile",
      requirements: [
        "Completed SKDU application form",
        "Copy of applicant's Identity Card (KTP)",
        "Copy of applicant's Family Card (KK)",
        "Copy of applicant's Tax ID Number (NPWP)",
        "Approval letter from neighbors around the business location",
        "Introduction letter from RT (neighborhood association) and RW (community association)",
        "Proof of business place ownership",
        "If the business place is not self-owned, include proof of rental agreement",
        "Building Permit (IMB) of the business location",
        "Photo of the business place taken from Google Maps"
      ]
    },
    id: {
      title: "Layanan Surat Keterangan Domisili",
      subtitle: "Bantuan komprehensif untuk memperoleh Surat Keterangan Domisili Usaha (SKDU) untuk bisnis di Indonesia",
      serviceTitle: "Surat Keterangan Domisili",
      serviceDesc: "Dokumen resmi yang menerangkan lokasi operasi bisnis, diperlukan untuk berbagai pendaftaran dan perizinan usaha",
      serviceFeatures: [
        "Penanganan profesional untuk semua persyaratan dokumentasi",
        "Pemrosesan efisien dengan waktu tunggu minimal",
        "Bantuan dengan pengisian dan persiapan formulir",
        "Kepatuhan lengkap terhadap peraturan lokal"
      ],
      requirementsTitle: "Persyaratan Surat Keterangan Domisili",
      requirements: [
        "Isi formulir permohonan SKDU",
        "Fotokopi KTP pemohon",
        "Fotokopi Kartu Keluarga Pemohon",
        "Fotokopi Nomor Pokok Wajib Pajak (NPWP) pemohon",
        "Surat keterangan persetujuan dari tetangga sekitar tempat usaha",
        "Surat pengantar RT dan RW",
        "Bukti kepemilikan tempat usaha",
        "Jika tempat usaha bukan milik sendiri sertakan bukti perjanjian sewa",
        "Izin Mendirikan Bangunan (IMB) dari tempat usaha",
        "Foto tempat usaha yang diambil dari Google Map"
      ]
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
              <DomicileIcon />
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

        {/* Process Flow */}
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Document Preparation' : 'Persiapan Dokumen'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We help you prepare all required documents according to regulations' : 'Kami membantu Anda menyiapkan semua dokumen yang diperlukan sesuai peraturan'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Application Submission' : 'Pengajuan Aplikasi'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We submit your completed application to the appropriate local authority' : 'Kami mengajukan aplikasi Anda yang sudah lengkap ke otoritas setempat yang sesuai'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Verification Process' : 'Proses Verifikasi'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We follow up on the verification process to ensure timely processing' : 'Kami melakukan tindak lanjut pada proses verifikasi untuk memastikan pemrosesan tepat waktu'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Certificate Delivery' : 'Pengiriman Sertifikat'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We deliver your Certificate of Domicile to your designated address' : 'Kami mengirimkan Surat Keterangan Domisili Anda ke alamat yang ditentukan'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const SKDPage = () => {
  return (
    <>
      <SKDServicesSectionContinued />
    </>
  );
};

export default SKDPage;