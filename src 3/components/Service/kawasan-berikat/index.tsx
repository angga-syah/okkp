"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/Header/Bahasa";

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
const BondedZoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const CompanyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Kawasan Berikat Section Continued
const KawasanBerikatContinued = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Bonded Zone (Kawasan Berikat) Services",
      subtitle: "Professional assistance for Bonded Zone establishment and management in Indonesia",
      serviceTitle: "Bonded Zone",
      serviceDesc: "A designated production area under customs supervision where imported goods can be processed without immediate taxation",
      serviceFeatures: [
        "Tax and import duty deferment",
        "Manufacturing and processing capabilities",
        "Enhanced supply chain efficiency",
        "Integrated customs supervision"
      ],
      facilityRequirementsTitle: "Facility Requirements",
      organizerRequirementsTitle: "Bonded Zone Organizer Requirements",
      operatorRequirementsTitle: "Bonded Zone Operator Requirements",
      registrationProcessTitle: "Registration Process",
      // Facility Requirements
      facilityRequirements: [
        "Located in an area that can be directly accessed from public roads and can be traversed by container transport vehicles and/or other transport facilities",
        "Have clear boundaries in the form of natural barriers or artificial barriers such as a separating fence, with other buildings, places, or zones",
        "Used for Processing Raw Materials into Products"
      ],
      // Organizer Requirements
      organizerRequirements: [
        "Have a Business Identification Number (NIB)",
        "Have a trade business license, zone management business license, industrial business license, or other license related to zone organization",
        "Have a valid taxpayer status confirmation through the application",
        "Have proof of ownership or control of an area, place, or building with clear boundaries including location map and layout plan for the Bonded Zone",
        "Have been confirmed as a taxable entrepreneur and have submitted the Annual Income Tax Return for the last tax year in accordance with obligations"
      ],
      // Operator Requirements
      operatorRequirements: [
        "Have a Business Identification Number (NIB)",
        "Have an industrial business license",
        "Have a valid taxpayer status confirmation through the application",
        "Have proof of ownership or control of a place or building with clear boundaries including location map and layout plan",
        "Have been confirmed as a taxable entrepreneur and have submitted the Annual Income Tax Return for the last tax year in accordance with obligations",
        "Receive recommendation from the Bonded Zone Organizer if the company applies for a PDKB license"
      ],
      // Registration Process
      registrationProcess: [
        "Registration can be done electronically through the Indonesia National Single Window Portal integrated with the Online Single Submission system",
        "Alternatively, a written application can be sent to the Head of Regional Office through the Head of Customs Office, or the Head of Main Service Office"
      ]
    },
    id: {
      title: "Layanan Kawasan Berikat",
      subtitle: "Bantuan profesional untuk pendirian dan pengelolaan Kawasan Berikat di Indonesia",
      serviceTitle: "Kawasan Berikat",
      serviceDesc: "Area produksi yang berada di bawah pengawasan bea cukai dimana barang impor dapat diproses tanpa perpajakan langsung",
      serviceFeatures: [
        "Penangguhan pajak dan bea masuk",
        "Kemampuan manufaktur dan pemrosesan",
        "Peningkatan efisiensi rantai pasokan",
        "Pengawasan bea cukai terintegrasi"
      ],
      facilityRequirementsTitle: "Persyaratan Fasilitas",
      organizerRequirementsTitle: "Persyaratan Penyelenggara Kawasan Berikat",
      operatorRequirementsTitle: "Persyaratan Pengusaha Kawasan Berikat",
      registrationProcessTitle: "Proses Pendaftaran",
      // Facility Requirements
      facilityRequirements: [
        "Terletak di lokasi yang dapat langsung dimasuki dari jalan umum dan dapat dilalui oleh kendaraan pengangkut peti kemas dan/atau sarana pengangkut peti kemas lainnya di air",
        "Mempunyai batas-batas yang jelas berupa pembatas alam atau pembatas buatan berupa pagar pemisah, dengan bangunan, tempat, atau kawasan lain",
        "Digunakan untuk melakukan Kegiatan Pengolahan Bahan Baku menjadi Hasil Produksi"
      ],
      // Organizer Requirements
      organizerRequirements: [
        "Sudah memiliki nomor induk berusaha",
        "Memiliki izin usaha perdagangan, izin usaha pengelolaan kawasan, izin usaha industri, atau izin lain yang berkaitan dengan penyelenggaraan Kawasan",
        "Memiliki hasil konfirmasi status wajib pajak sesuai dengan aplikasi yang menunjukkan valid",
        "Memiliki bukti kepemilikan atau penguasaan suatu kawasan, tempat, atau bangunan yang mempunyai batas-batas yang jelas berikut peta lokasi/tempat dan rencana tata letak/denah yang akan dijadikan Kawasan Berikat",
        "Telah dikukuhkan sebagai pengusaha kena pajak dan telah menyampaikan surat pemberitahuan tahunan pajak penghasilan tahun pajak terakhir sesuai dengan kewajibannya"
      ],
      // Operator Requirements
      operatorRequirements: [
        "Sudah memiliki nomor induk berusaha",
        "Memiliki izin usaha industri",
        "Memiliki hasil konfirmasi status wajib pajak sesuai aplikasi yang menunjukkan valid",
        "Memiliki bukti kepemilikan atau penguasaan suatu tempat atau bangunan yang mempunyai batas-batas yang jelas berikut peta lokasi/tempat dan rencana tata letak/denah",
        "Telah dikukuhkan sebagai pengusaha kena pajak dan telah menyampaikan surat pemberitahuan tahunan pajak penghasilan tahun pajak terakhir sesuai dengan kewajibannya",
        "Mendapat rekomendasi dari Penyelenggara Kawasan Berikat dalam hal Perusahaan mengajukan permohonan izin PDKB"
      ],
      // Registration Process
      registrationProcess: [
        "Pendaftaran dapat dilakukan secara elektronik melalui Portal Indonesia National Single Window yang terintegrasi dengan sistem Online Single Submission",
        "Atau dapat dilakukan dengan permohonan tertulis, dengan mengirimkannya kepada Kepala Kantor Wilayah melalui Kepala Kantor Pabean, atau Kepala Kantor Pelayanan Utama"
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
              <BondedZoneIcon />
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

        {/* Facility Requirements Section */}
        <div className="mt-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center"
          >
            {t.facilityRequirementsTitle}
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
                  <BuildingIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.facilityRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.facilityRequirements.map((requirement, index) => (
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

        {/* Requirements Section */}
        <div className="mt-8">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12"
          >
            {/* Organizer Requirements */}
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <CompanyIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.organizerRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.organizerRequirements.map((requirement, index) => (
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
            
            {/* Operator Requirements */}
            <motion.div 
              variants={slideIn}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-600 h-full"
            >
              <div className="flex items-center mb-6">
                <div className="mr-4 bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <CompanyIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.operatorRequirementsTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.operatorRequirements.map((requirement, index) => (
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
          
          {/* Registration Process */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.registrationProcessTitle}</h3>
              </div>
              
              <div className="space-y-4">
                {t.registrationProcess.map((step, index) => (
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
      </div>
    </section>
  );
};

const KawasanBerikatPage = () => {
  return (
    <>
      <KawasanBerikatContinued />
    </>
  );
};

export default KawasanBerikatPage;