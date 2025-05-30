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
const ElderyVisaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Visa KITAS Lansia Services Section Continued
const ElderlyVisaSectionContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Elderly Visa / KITAS Services",
      subtitle: "Comprehensive assistance for retirement visa processing in Indonesia",
      serviceTitle: "Retirement Visa",
      serviceDesc: "Special visa and stay permit designed for foreign retirees looking to reside in Indonesia for extended periods",
      serviceFeatures: [
        "Long-term stay permits (up to 5 years with extensions)",
        "Reduced visa bureaucracy",
        "Professional document preparation and submission",
        "Full compliance with Indonesian immigration laws"
      ],
      requirementsTitle: "Requirements",
      requirements: [
        "Applicant minimum age of 60 years or older",
        "Valid passport with validity of more than 18 months",
        "4x6 cm passport photos (4 copies)",
        "Curriculum Vitae (CV)",
        "Statement from Pension Fund Foundation or bank from country of origin (or Indonesia) of available funds, minimum US$ 1,500 per month, to provide applicant living costs during proposed stay in Indonesia (in amount of US$ 18,000 per year)",
        "Proof of health insurance, death insurance and third party liability insurance in the field of civil either in country of origin or Indonesia",
        "Statement of accommodation staying in Indonesia. Minimum cost US$ 35,000 if buying a house/apartment or, minimum rental fee of US$ 500 per month in Jakarta, Bandung, and Bali; US$ 300 per month for other cities in Java Island, Batam, and Medan, and other cities minimum US$ 200 per month. If in tourist areas, will be in accordance with regulations",
        "Statement to provide Indonesian domestic workers (2 people) while staying in Indonesia",
        "Letter of Appointment of designated Travel Agency to handle the elderly",
        "Statement agreeing not to engage in business activities or work for a living (Prohibited from working in Indonesia using this visa)",
        "Can be extended for a maximum stay of five years"
      ],
      benefitsTitle: "Benefits of Retirement in Indonesia",
      benefits: [
        "Tropical climate with warm weather year-round",
        "Low cost of living compared to Western countries",
        "High-quality yet affordable healthcare services",
        "Rich cultural experiences and natural attractions",
        "Friendly local communities welcoming to expatriates",
        "Modern amenities in major cities and tourist destinations"
      ]
    },
    id: {
      title: "Layanan VISA / KITAS Lansia",
      subtitle: "Bantuan komprehensif untuk pengurusan visa pensiun di Indonesia",
      serviceTitle: "Visa Lansia",
      serviceDesc: "Visa khusus dan izin tinggal yang dirancang untuk pensiunan asing yang ingin tinggal di Indonesia dalam jangka waktu yang lama",
      serviceFeatures: [
        "Izin tinggal jangka panjang (hingga 5 tahun dengan perpanjangan)",
        "Birokrasi visa yang disederhanakan",
        "Persiapan dan pengajuan dokumen secara profesional",
        "Kepatuhan penuh terhadap hukum imigrasi Indonesia"
      ],
      requirementsTitle: "Persyaratan",
      requirements: [
        "Pemohon minimum umur 60 tahun atau lebih tua",
        "Memiliki paspor atau dokumen perjalanan dengan masa berlaku lebih dari 18 bulan",
        "Pasphoto ukuran 4 x 6 cm (4 lembar)",
        "Daftar Riwayat Hidup (CV)",
        "Pernyataan dari Yayasan Dana Pensiun atau Bank negara asal (atau Indonesia) dari dana yang tersedia, minimal US $ 1,500 per bulan, untuk memberikan pemohon biaya hidup selama tinggal diusulkan di Indonesia (dalam Jumlah US $ 18,000 per tahun)",
        "Bukti Asuransi kesehatan, kematian dan asuransi tanggung jawab hukum pihak ketiga di bidang perdata baik di negara asal atau Indonesia",
        "Pernyataan akomodasi yang tinggal di Indonesia. Biaya minimum US $ 35,000 jika dibeli rumah/apartemen atau, biaya sewa minimal US $ 500 per bulan di Jakarta, Bandung, dan Bali; US $ 300 per bulan untuk kota-kota lain di Pulau Jawa, Batam, dan Medan, dan kota-kota lainnya minimal US $ 200 per bulan. Jika di daerah wisata, akan sesuai dengan peraturan",
        "Pernyataan untuk menyediakan pramuwisma WNI (2 org) selama berada di Indonesia",
        "Surat Penunjukan Biro Perjalanan Wisata yang ditentukan untuk menangani lansia",
        "Pernyataan setuju untuk tidak terlibat dalam kegiatan bisnis atau bekerja untuk hidup (Dilarang untuk bekerja di Indonesia dengan menggunakan visa ini)",
        "Dapat diperpanjang hingga tinggal maksimum selama lima tahun"
      ],
      benefitsTitle: "Keuntungan Pensiun di Indonesia",
      benefits: [
        "Iklim tropis dengan cuaca hangat sepanjang tahun",
        "Biaya hidup yang rendah dibandingkan dengan negara-negara Barat",
        "Layanan kesehatan berkualitas tinggi namun terjangkau",
        "Pengalaman budaya yang kaya dan atraksi alam",
        "Komunitas lokal yang ramah dan menyambut ekspatriat",
        "Fasilitas modern di kota-kota besar dan tujuan wisata"
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
              <ElderyVisaIcon />
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We provide a detailed overview of the requirements and process for the retirement visa' : 'Kami memberikan gambaran rinci tentang persyaratan dan proses untuk visa pensiun'}</p>
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
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We assist in gathering and preparing all required documents including financial statements and insurance' : 'Kami membantu dalam mengumpulkan dan menyiapkan semua dokumen yang diperlukan termasuk laporan keuangan dan asuransi'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'Visa Application' : 'Pengajuan Visa'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We handle the complete application process with Indonesian immigration authorities' : 'Kami menangani seluruh proses aplikasi dengan otoritas imigrasi Indonesia'}</p>
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
                  <h4 className="font-bold text-lg mb-2">{language === 'en' ? 'KITAS Processing & Arrival Support' : 'Pemrosesan KITAS & Dukungan Kedatangan'}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'We process your residence permit (KITAS) and provide support upon your arrival in Indonesia' : 'Kami memproses izin tinggal (KITAS) dan memberikan dukungan saat kedatangan Anda di Indonesia'}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ElderlyVisaPage = () => {
  return (
    <>
      <ElderlyVisaSectionContinued />
    </>
  );
};

export default ElderlyVisaPage;