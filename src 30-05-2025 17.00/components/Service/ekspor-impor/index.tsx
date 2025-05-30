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
const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ImportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const RequirementsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

// Export Import Services Section
const ExportImportServicesSection = () => {
  const { language } = useLanguage();
  const [selectedService, setSelectedService] = useState("export");

  // Content translations
  const content = {
    en: {
      title: "Export and Import Permit Services",
      subtitle: "Trusted solution for processing export and import permits in Indonesia",
      exportTitle: "Export Permit",
      exportDesc: "Complete permit service for various export activities from Indonesia",
      importTitle: "Import Permit",
      importDesc: "Comprehensive services for processing import permits for business needs",
      exportRequirementsTitle: "Export Permit Requirements",
      importRequirementsTitle: "Import Permit Requirements",
      exportRegistrationTitle: "Export Registration Requirements",
      importAPIUTitle: "General Import Identification Number (API-U) Requirements",
      importAPIPTitle: "Producer Import Identification Number (API-P) Requirements",
      importProcedureTitle: "Import Permit Application Procedure",
      // Export Registration Requirements
      exportRegistrationRequirements: [
        "Business Identification Number (NIB)",
        "For certain exports, registered exporter permits and export approvals issued by the Director General of Foreign Trade are required",
        "Taxpayer Status Confirmation with valid status",
        "Completed supplementary documents uploaded to the Indonesia National Single Window System"
      ],
      // Export Documents
      exportDocuments: [
        "For individual exporters: NPWP or NIK",
        "For state-owned enterprises and foundations: NPWP",
        "For cooperatives and business entities: NIB and NPWP"
      ],
      // Import API-U Requirements
      importAPIURequirements: [
        "Copy of deed of establishment and deed of amendment",
        "Copy of Ministry of Law and Human Rights decree for establishment and amendments",
        "Copy of valid company domicile",
        "Copy of company NPWP",
        "Copy of Trade Business License (SIUP)",
        "Copy of Company Registration Certificate (TDP)",
        "Copy of ID cards of all shareholders and copy of NPWP of President Director",
        "Reference from a Foreign Exchange Bank",
        "4 copies of 3x4 photographs of the person in charge with red background"
      ],
      // Import API-P Requirements
      importAPIPRequirements: [
        "Copy of deed of establishment and deed of amendment",
        "Copy of Ministry of Law and Human Rights decree for establishment and amendments",
        "Copy of valid company domicile",
        "Copy of company NPWP",
        "Copy of Trade Business License (SIUP)",
        "Copy of Company Registration Certificate (TDP)",
        "Copy of ID cards of all shareholders and copy of NPWP of President Director",
        "4 copies of 3x4 photographs of the person in charge with red background"
      ],
      // Import Procedure
      importProcedure: [
        "Application letter containing a statement of the truth and validity of documents & data on paper with a Rp 6,000 stamp duty",
        "Person in charge/applicant identity: For Indonesian citizens: Identity Card (KTP) and NPWP; For foreigners: IMTA and valid passport",
        "If the application is authorized, Power of attorney on paper with Rp 6,000 stamp duty and KTP of the recipient and grantor",
        "For legal entities/business entities: NPWP, Deed of establishment and amendments, Endorsement decree issued by Ministry of Law and Human Rights (for PT and foundations), Ministry (for cooperatives), or District Court (for CV)",
        "Industrial Business License (IUI), if applying for API-P (Producer)",
        "Certificate of Company Domicile",
        "Trade Business License (SIUP) and Company Registration Certificate (TDP)",
        "Reference from a Foreign Exchange Bank, if applying for API-U",
        "Proof of business place ownership (Certificate copy)",
        "For leased land or buildings: Land/building lease agreement, Statement on paper with Rp 6,000 stamp duty from the owner stating no objection to the use of the land or building, KTP of the land/building owner",
        "Photos of the company (Sign board view, front view, interior view)",
        "API-U or API-P form signed by the Director on a stamp duty and stamped by the company"
      ],
      export: "Export",
      import: "Import"
    },
    id: {
      title: "Layanan Izin Ekspor dan Impor",
      subtitle: "Solusi terpercaya untuk pengurusan izin ekspor dan impor di Indonesia",
      exportTitle: "Izin Ekspor",
      exportDesc: "Layanan izin lengkap untuk berbagai kegiatan ekspor dari Indonesia",
      importTitle: "Izin Impor",
      importDesc: "Layanan komprehensif untuk pengurusan izin impor bagi kebutuhan bisnis",
      exportRequirementsTitle: "Persyaratan Izin Ekspor",
      importRequirementsTitle: "Persyaratan Izin Impor",
      exportRegistrationTitle: "Persyaratan Pendaftaran Ekspor",
      importAPIUTitle: "Persyaratan Angka Pengenal Importir Umum (API-U)",
      importAPIPTitle: "Persyaratan Angka Pengenal Importir Produsen (API-P)",
      importProcedureTitle: "Prosedur Pengajuan Izin Impor",
      // Export Registration Requirements
      exportRegistrationRequirements: [
        "Memiliki Nomor Induk Berusaha (NIB)",
        "Terhadap Ekspor Tertentu harus memiliki perizinan berupa Eksportir Terdaftar dan Persetujuan Ekspor yang dikeluarkan oleh Direktur Jendral Perdagangan Luar Negeri",
        "Konfirmasi Status Wajib Pajak dengan memuat status valid",
        "Dokumen pelengkap yang diunggah ke Sistem Indonesia National Single Window"
      ],
      // Export Documents
      exportDocuments: [
        "Untuk eksportir perorangan: NPWP atau NIK",
        "Untuk eksportir BUMN dan Yayasan: NPWP",
        "Untuk Koperasi dan Badan Usaha: NIB dan NPWP"
      ],
      // Import API-U Requirements
      importAPIURequirements: [
        "Fotokopi akta pendirian dan akta perubahan",
        "Fotokopi SK Kemenkumham pendirian dan SK perubahan",
        "Fotokopi domisili perusahaan yang masih berlaku",
        "Fotokopi NPWP perusahaan",
        "Fotokopi Surat Izin Usaha Perdagangan (SIUP)",
        "Fotokopi Tanda Daftar Perusahaan (TDP)",
        "Fotokopi KTP Semua Pemegang Saham dan FC NPWP Direktur Utama",
        "Referensi Bank Devisa",
        "Pas foto penanggung jawab (3x4) sebanyak 4 lembar dengan latar belakang warna merah"
      ],
      // Import API-P Requirements
      importAPIPRequirements: [
        "Fotokopi akta pendirian dan akta perubahan",
        "Fotokopi SK Kemenkumham pendirian dan SK perubahan",
        "Fotokopi domisili perusahaan yang masih berlaku",
        "Fotokopi NPWP perusahaan",
        "Fotokopi Surat Izin Usaha Perdagangan (SIUP)",
        "Fotokopi Tanda Daftar Perusahaan (TDP)",
        "Fotokopi KTP Semua Pemegang Saham dan FC NPWP Direktur Utama",
        "Pas foto penanggung jawab (3x4) sebanyak 4 lembar dengan latar belakang berwarna merah"
      ],
      // Import Procedure
      importProcedure: [
        "Surat permohonan yang di dalamnya terdapat pernyataan kebenaran dan keabsahan dokumen & data di atas kertas bermaterai Rp 6.000",
        "Identitas Penanggung Jawab/Pemohon: WNI: Kartu Tanda Penduduk (KTP) dan NPWP Penanggung Jawab; WNA: IMTA dan Paspor yang masih berlaku",
        "Jika pengurusan dikuasakan, Surat kuasa di atas kertas bermaterai RP 6.000 dan KTP penerima dan pemberi kuasa",
        "Jika Badan Hukum/Badan Usaha: NPWP Badan Hukum/Badan Usaha, Akta pendirian dan perubahan, SK pengesahan pendirian dan perubahan dari Kemenkumham (untuk PT dan Yayasan), Kementerian (untuk Koperasi), atau Pengadilan Negeri (untuk CV)",
        "Izin Usaha Industri (IUI), jika memohon untuk API-P (Produsen)",
        "Surat Keterangan Domisili Perusahaan",
        "Izin Usaha Perdagangan (SIUP) dan Tanda Daftar Perusahaan (TDP)",
        "Referensi dari Bank Devisa, jika memohon untuk API-U",
        "Bukti Kepemilikan Tempat Usaha (FC Sertifikat)",
        "Untuk tanah atau bangunan disewa: Perjanjian sewa tanah/bangunan, Surat pernyataan di atas kertas bermaterai Rp 6.000 dari pemilik yang menyatakan tidak keberatan tanahnya digunakan, KTP pemilik tanah/bangunan",
        "Foto perusahaan (Tampak Plang, Tampak Depan, Tampak Dalam)",
        "Formulir isian API-U atau API-P yang ditandatangani oleh Direktur diatas materai serta distempel perusahaan"
      ],
      export: "Ekspor",
      import: "Impor"
    }
  };

  // Current language content
  const t = content[language];

  // Service data
  const services = [
    {
      id: "export",
      title: t.exportTitle,
      description: t.exportDesc,
      icon: <ExportIcon />
    },
    {
      id: "import",
      title: t.importTitle,
      description: t.importDesc,
      icon: <ImportIcon />
    }
  ];

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

        {/* Service Type Selection Tabs */}
        <div className="flex justify-center border-b border-gray-200 mb-8">
          <button
            onClick={() => setSelectedService("export")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedService === "export" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.export}
          </button>
          <button
            onClick={() => setSelectedService("import")}
            className={`py-3 px-6 font-medium text-lg ${
              selectedService === "import" 
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t.import}
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
          {services
            .filter(service => service.id === selectedService)
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
              </motion.div>
            ))}
        </motion.div>

        {/* Requirements Section - Based on selected service */}
        {selectedService === "export" ? (
          <div className="mt-12">
            <motion.h2 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
            >
              {t.exportRequirementsTitle}
            </motion.h2>
            
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="max-w-4xl mx-auto"
            >
              {/* Export Registration Requirements */}
              <motion.div 
                variants={slideIn}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 mb-8"
              >
                <div className="flex items-center mb-6">
                  <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <RequirementsIcon />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.exportRegistrationTitle}</h3>
                </div>
                
                <div className="space-y-4">
                  {t.exportRegistrationRequirements.map((requirement, index) => (
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
              
              {/* Export Documents */}
              <motion.div 
                variants={slideIn}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600"
              >
                <div className="flex items-center mb-6">
                  <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <DocumentIcon />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{language === 'en' ? 'Required Documents' : 'Dokumen yang Diperlukan'}</h3>
                </div>
                
                <div className="space-y-4">
                  {t.exportDocuments.map((document, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-start"
                    >
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                          <CheckIcon />
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{document}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="mt-12">
            <motion.h2 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
            >
              {t.importRequirementsTitle}
            </motion.h2>
            
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12"
            >
              {/* API-U Requirements */}
              <motion.div 
                variants={slideIn}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
              >
                <div className="flex items-center mb-6">
                  <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <RequirementsIcon />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.importAPIUTitle}</h3>
                </div>
                
                <div className="space-y-4">
                  {t.importAPIURequirements.map((requirement, index) => (
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
              
              {/* API-P Requirements */}
              <motion.div 
                variants={slideIn}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
              >
                <div className="flex items-center mb-6">
                  <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <RequirementsIcon />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.importAPIPTitle}</h3>
                </div>
                
                <div className="space-y-4">
                  {t.importAPIPRequirements.map((requirement, index) => (
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
            
            {/* Import Procedure */}
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.importProcedureTitle}</h3>
                </div>
                
                <div className="space-y-4">
                  {t.importProcedure.map((step, index) => (
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
        )}
      </div>
    </section>
  );
};

const ExportImportServicesPage = () => {
  return (
    <>
      <ExportImportServicesSection />
    </>
  );
};

export default ExportImportServicesPage;