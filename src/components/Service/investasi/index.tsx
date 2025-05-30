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
const InvestmentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ProcessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ServicesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Investment Documentation Services Section Continued
const InvestmentDocumentationSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Investment Documentation Services",
      subtitle: "Comprehensive assistance for foreign investment documentation and licensing in Indonesia",
      serviceTitle: "Investment Documentation Services",
      serviceDesc: "Professional services for establishing and managing all documentation required for foreign direct investment (PMA) in Indonesia",
      procedureTitle: "PMA Establishment Procedure",
      procedure: [
        "Meeting Requirements",
        "Submitting License Applications",
        "Document Completion",
        "Verification"
      ],
      documentRequirementsTitle: "Required Documents",
      documentRequirements: [
        "Copy of ID card or passport of company founders",
        "Copy of Tax ID Number (NPWP)",
        "Articles of association report for applicants that are legal entities",
        "Email address",
        "Phone number",
        "Passport photos with red background, sized 3×4 and 4×6 (4 copies each)",
        "Management and shareholding structure details for PMA company founders",
        "PMA company address details",
        "Copy of Building Permit (IMB) for the PMA company",
        "Copy of proof of place of business usage",
        "Company stamp",
        "Original power of attorney (not a copy)",
        "Production flow diagram with details of the process from raw materials to finished products (for industrial sector)",
        "Description of activities and services provided (for service business sector)",
        "Capital statement letter"
      ],
      principlePermitTitle: "Principle Permit Application",
      principlePermit: [
        "Shareholder identities",
        "Planned activities",
        "Power of attorney if the management is delegated to another party representing the company",
        "Verification (conducted by relevant authorities)"
      ],
      servicesTitle: "Our Services",
      services: [
        "Guidance on PMA establishment requirements and procedures",
        "Document preparation and verification",
        "Registration with the Online Single Submission (OSS) system",
        "Business Identification Number (NIB) application",
        "Principle License application",
        "Business License application",
        "Capital investment reporting assistance",
        "Coordination with the Investment Coordinating Board (BKPM)",
        "Ongoing compliance and reporting support"
      ],
      benefitsTitle: "Benefits of Our Services",
      benefits: [
        "Expedited processing with expert assistance",
        "Minimized risks of application rejection",
        "Ensure compliance with latest Indonesian investment regulations",
        "Comprehensive support from establishment to ongoing operations",
        "Strategic advice on investment structure and planning",
        "Local expertise with international standards"
      ]
    },
    id: {
      title: "Jasa Pengurusan Dokumen Investasi",
      subtitle: "Bantuan komprehensif untuk dokumentasi dan perizinan investasi asing di Indonesia",
      serviceTitle: "Jasa Pengurusan Dokumen Investasi",
      serviceDesc: "Layanan profesional untuk mendirikan dan mengelola semua dokumentasi yang diperlukan untuk penanaman modal asing (PMA) di Indonesia",
      procedureTitle: "Prosedur Pendirian PMA",
      procedure: [
        "Memenuhi Syarat",
        "Mengajukan Permohonan Perizinan",
        "Melengkapi Dokumen",
        "Verifikasi"
      ],
      documentRequirementsTitle: "Dokumen yang Diperlukan",
      documentRequirements: [
        "Fotokopi KTP atau paspor pendiri perusahaan",
        "Fotokopi NPWP",
        "Laporan anggaran dasar untuk pemohon yang berupa badan hukum",
        "Alamat email",
        "Nomor telepon",
        "Pas foto dengan latar belakang merah, berukuran 3×4 dan 4×6 (masing-masing 4 lembar)",
        "Keterangan struktur kepengurusan dan kepemilikan saham atau modal bagi para pendiri PT PMA",
        "Keterangan alamat PT PMA",
        "Fotokopi IMB atau izin mendirikan bangunan untuk PT PMA",
        "Fotokopi bukti pemakaian tempat usaha",
        "Stempel perusahaan",
        "Surat kuasa yang asli bukan salinan",
        "Diagram alur produksi lengkap dengan rincian serta proses produksi dari bahan baku menjadi produk jadi (untuk sektor industri)",
        "Deskripsi kegiatan dan jasa yang disediakan (untuk sektor bisnis jasa)",
        "Surat pernyataan permodalan"
      ],
      principlePermitTitle: "Pengajuan Izin Prinsip",
      principlePermit: [
        "Identitas pemilik saham",
        "Rencana kegiatan",
        "Surat kuasa apabila pengurusan diserahkan kepada pihak lain yang mewakili perusahaan",
        "Verifikasi (dilakukan oleh Instansi Terkait)"
      ],
      servicesTitle: "Layanan Kami",
      services: [
        "Panduan tentang persyaratan dan prosedur pendirian PMA",
        "Persiapan dan verifikasi dokumen",
        "Pendaftaran dengan sistem Online Single Submission (OSS)",
        "Pengajuan Nomor Induk Berusaha (NIB)",
        "Pengajuan Izin Prinsip",
        "Pengajuan Izin Usaha",
        "Bantuan pelaporan penanaman modal",
        "Koordinasi dengan Badan Koordinasi Penanaman Modal (BKPM)",
        "Dukungan kepatuhan dan pelaporan berkelanjutan"
      ],
      benefitsTitle: "Manfaat Layanan Kami",
      benefits: [
        "Pemrosesan yang dipercepat dengan bantuan ahli",
        "Risiko penolakan aplikasi yang diminimalkan",
        "Memastikan kepatuhan dengan peraturan investasi Indonesia terbaru",
        "Dukungan komprehensif dari pendirian hingga operasional berkelanjutan",
        "Saran strategis tentang struktur dan perencanaan investasi",
        "Keahlian lokal dengan standar internasional"
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
              <InvestmentIcon />
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

        {/* PMA Establishment Procedure */}
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
                <ProcessIcon />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.procedureTitle}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {t.procedure.map((step, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start"
                >
                  <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <CheckIcon />
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Document Requirements Section */}
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.documentRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.documentRequirements.map((requirement, index) => (
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

        {/* Principle Permit Section */}
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
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <DocumentIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.principlePermitTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.principlePermit.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{item}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Our Services Section */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {t.servicesTitle}
          </motion.h2>
          
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
                  <ServicesIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.servicesTitle}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t.services.map((service, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start"
                  >
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <CheckIcon />
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{service}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Initial Consultation' : 'Konsultasi Awal'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assess your investment goals and provide guidance on the appropriate structure and requirements' : 'Kami menilai tujuan investasi Anda dan memberikan panduan tentang struktur dan persyaratan yang sesuai'}</p>
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assist in preparing all required legal documents for your foreign investment entity' : 'Kami membantu mempersiapkan semua dokumen hukum yang diperlukan untuk entitas investasi asing Anda'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'License Applications' : 'Pengajuan Perizinan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle all necessary license applications through the OSS system and BKPM' : 'Kami menangani semua aplikasi perizinan yang diperlukan melalui sistem OSS dan BKPM'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Follow-up and Compliance' : 'Tindak Lanjut dan Kepatuhan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We provide ongoing support for reporting requirements and compliance with Indonesian investment regulations' : 'Kami memberikan dukungan berkelanjutan untuk persyaratan pelaporan dan kepatuhan terhadap peraturan investasi Indonesia'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const InvestmentDocumentationPage = () => {
  return (
    <>
      <InvestmentDocumentationSectionContinued />
    </>
  );
};

export default InvestmentDocumentationPage;