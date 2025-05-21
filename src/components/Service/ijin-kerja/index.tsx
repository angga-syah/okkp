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
const WorkPermitIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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

// Foreign Worker Permit Services Section Continued
const ForeignWorkerPermitSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Foreign Worker Work Permit & Stay Permit Services",
      subtitle: "Comprehensive assistance for processing work and stay permits for expatriates in Indonesia",
      serviceTitle: "Foreign Worker Documentation Services",
      serviceDesc: "Professional assistance with all required permits and documentation for foreign workers in Indonesia",
      servicesList: [
        "Work Plan for Foreign Workers (RPTKA)",
        "Work Permit Notification",
        "Electronic Visa",
        "Temporary Stay Permit (ITAS) & Multiple Exit Re-entry Permit (MERP)",
        "Police Report Letter (STM)",
        "Temporary Residence Card (SKTT)",
        "Presence Report (Lapker)"
      ],
      companyRequirementsTitle: "Company Documents Requirements",
      expatRequirementsTitle: "Expatriate Documents Requirements",
      // Company Requirements
      companyRequirements: [
        "Color scan of Company Establishment Deed & its amendments. If the position to be proposed is Director/Commissioner, the name must be included in the deed",
        "Color scan of Ministry of Law & Human Rights/Justice Ratification Decree",
        "Color scan of Business Identification Number (NIB) OSS",
        "Business License or OSS Business License",
        "Company Organizational Structure where the position of the expatriate is included, made on company letterhead and signed by Company Leader with stamp",
        "Color scan of Tax ID Number (NPWP) and Tax Registration Certificate (SKT)",
        "Color scan of Company Registration Certificate (TDP)",
        "Color scan of Company Domicile License",
        "Color scan of Manpower Report (UU No.7 year 1981) online",
        "Color scan of ID Card of Director / HRD Manager who signs the Application Letter",
        "Color scan of Appointment Decree & Report of Indonesian Counterpart",
        "Color passport photo & ID card of Indonesian Counterpart",
        "Have education that matches the job requirements to be held by the expatriate",
        "Have competency certificate or work experience according to the position to be held by the expatriate for at least 5 (five) years",
        "Employment Contract per expatriate according to Ministerial Decree No.10",
        "Director/Commissioner Appointment Letter if the position to be proposed is Director/Commissioner level",
        "Company bank statement (last 1 month)",
        "Application Letter for BKPM Recommendation, RPTKA, Notification, Telex VBS, and Power of Attorney",
        "TKA online account (Department of Labor) and Visa Online (Immigration)"
      ],
      // Expatriate Requirements
      expatRequirements: [
        "Color scan of passport (front page) that is still valid for minimum 18 months",
        "Color scan of Curriculum Vitae (CV)",
        "Color scan of expatriate's diploma (minimum D4/S1), must be translated into Indonesian/English according to the original",
        "Color scan of reference/proof of expatriate's work experience (minimum 5 years) or competency certificate",
        "Color scan of expatriate's Insurance Policy (from country of origin)",
        "Softcopy passport photo of expatriate size 4x6 (red background):",
        "• Male: Wearing shirt and tie",
        "• Female: Wearing shirt",
        "Color scan of Marriage Certificate (If bringing wife)",
        "Color scan of Birth Certificate (If bringing children)",
        "Color scan of complete vaccination certificate"
      ]
    },
    id: {
      title: "Layanan Izin Kerja & Izin Tinggal Tenaga Kerja Asing",
      subtitle: "Bantuan komprehensif untuk pengurusan izin kerja dan izin tinggal bagi ekspatriat di Indonesia",
      serviceTitle: "Jasa Pengurusan Dokumen Tenaga Kerja Asing",
      serviceDesc: "Bantuan profesional untuk semua izin dan dokumen yang diperlukan bagi tenaga kerja asing di Indonesia",
      servicesList: [
        "Rencana Penggunaan Tenaga Kerja Asing (RPTKA)",
        "Notifikasi izin Kerja",
        "Visa Elektronik",
        "ITAS & MERP",
        "Surat Tanda Melapor (STM)",
        "Surat Keterangan Tempat Tinggal (SKTT)",
        "Laporan Keberadaan (Lapker)"
      ],
      companyRequirementsTitle: "Persyaratan Dokumen Perusahaan",
      expatRequirementsTitle: "Persyaratan Dokumen TKA",
      // Company Requirements
      companyRequirements: [
        "Scanwarna Akta Pendirian perusahaan & perubahannya. Apabila jabatan yang akan diajukan adalah Direksi / Komisaris, namanya wajib tercantum di dalam akte",
        "Scanwarna SK Pengesahan Menteri Hukum & HAM / Kehakiman",
        "Scanwarna NIB (Nomor Induk Berusaha) OSS",
        "SIUP atau Izin Usaha OSS",
        "Struktur Organisasi Perusahaan dimana didalamnya tercantum jabatan TKA yang akan diajukan, dibuat di atas kop surat perusahaan dan ditandatangani oleh Pimpinan Perusahaan serta dicap",
        "Scanwarna NPWP dan SKT (Surat Keterangan Terdaftar) Pajak",
        "Scanwarna Tanda Daftar Perusahaan (TDP)",
        "Scanwarna Izin Domisili Perusahaan",
        "Scanwarna Wajib Lapor Ketenagakerjaan (UU No.7 thn. 1981) online",
        "Scanwarna KTP Direktur / HRD Manager yang menandatangani Surat Permohonan",
        "Scanwarna SK / Penunjukan & Laporan TKI Pendamping (Counterpart)",
        "Pasphoto & KTP berwarna TKI Pendamping",
        "Memiliki pendidikan yang sesuai dengan syarat jabatan yang akan diduduki oleh TKA",
        "Memiliki sertifikat kompetensi atau memiliki pengalam kerja sesuai dengan jabatan yang akan Diduduki TKA paling kurang 5 (lima) tahun",
        "Kontrak Kerja per TKA sesuai dengan Kepmen No.10",
        "Surat Penunjukan Direksi / Komisaris apabila jabatan yang akan diajukan adalah level Direksi / Komisaris",
        "Rekening koran perusahaan (1 bulan terakhir)",
        "Surat Permohonan untuk Rekomendasi BKPM, RPTKA, Notifikasi, Telex VBS, dan Surat Kuasa",
        "Akun TKA online (DEPNAKER) dan Visa Online (Imigrasi)"
      ],
      // Expatriate Requirements
      expatRequirements: [
        "Scanwarna paspor (halaman depan) yang masih berlaku minimum 18 bulan",
        "Scanwarna Curiculum Vitae (CV)",
        "Scanwarna Ijazah TKA minimal D4/S1, harus diterjemahkan ke dalam Bahasa Indonesia/Bahasa Inggris sesuai aslinya",
        "Scanwarna referensi / bukti pengalaman kerja TKA minimal 5 tahun atau sertifikat kompetensi",
        "Scanwarna Polis Asuransi TKA (dari negara asal)",
        "Softcopy pas foto TKA ukuran 4x6 (background merah) :",
        "• Laki-Laki : Memakai Kemeja dan berdasi",
        "• Perempuan : Memakai Kemeja",
        "Scanwarna Akte Perkawinan (Bila membawa Istri)",
        "Scanwarna Akte Kelahiran (Bila membawa Anak)",
        "Scanwarna sertifikat vaksin dosis lengkap"
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
              <WorkPermitIcon />
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

        {/* Services List */}
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{language === 'en' ? 'Our Services' : 'Layanan Kami'}</h3>
            </div>
            
            <div className="space-y-4">
              {t.servicesList.map((service, index) => (
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

        {/* Requirements Section */}
        <div className="mt-8">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12"
          >
            {/* Company Requirements */}
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
                {t.companyRequirements.map((requirement, index) => (
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

          {/* Expatriate Requirements */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12"
          >
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
                {t.expatRequirements.map((requirement, index) => (
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Document Preparation' : 'Persiapan Dokumen'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assist in preparing all required company and expatriate documents' : 'Kami membantu menyiapkan semua dokumen perusahaan dan TKA yang diperlukan'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'RPTKA & Work Permit Application' : 'Pengajuan RPTKA & Izin Kerja'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We process the Work Plan for Foreign Workers and work permit notification' : 'Kami memproses Rencana Penggunaan Tenaga Kerja Asing dan notifikasi izin kerja'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Visa & ITAS Processing' : 'Pemrosesan Visa & ITAS'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle the electronic visa application and temporary stay permit processing' : 'Kami menangani aplikasi visa elektronik dan pemrosesan izin tinggal sementara'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Additional Documentation' : 'Dokumentasi Tambahan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assist with police reporting, residence card, and regular presence reporting requirements' : 'Kami membantu dengan pelaporan kepolisian, kartu tempat tinggal, dan persyaratan pelaporan keberadaan rutin'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ForeignWorkerPermitPage = () => {
  return (
    <>
      <ForeignWorkerPermitSectionContinued />
    </>
  );
};

export default ForeignWorkerPermitPage;