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


const CompanyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ProcessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

// Gudang Berikat Services Section
const GudangBerikatSection = () => {
  const { language } = useLanguage();

  // Content translations
  const content = {
    en: {
      title: "Bonded Warehouse (Gudang Berikat) Services",
      subtitle: "Professional assistance for Bonded Warehouse establishment and management in Indonesia",
      serviceTitle: "Bonded Warehouse",
      serviceDesc: "A designated area under customs supervision with tax facilities for storing imported goods without immediate taxation",
      serviceFeatures: [
        "Tax deferment on imported goods",
        "Value added processing capability",
        "Efficient inventory management",
        "Customs supervision and compliance"
      ],
      facilityRequirementsTitle: "Facility Requirements",
      organizerRequirementsTitle: "Bonded Warehouse Organizer Requirements",
      operatorRequirementsTitle: "Bonded Warehouse Operator Requirements",
      // Facility Requirements
      facilityRequirements: [
        "Located in an area accessible by container transport vehicles and/or other transport facilities",
        "Have clear boundaries and defined area",
        "Have a designated space for physical inspection",
        "Have areas for storage, loading, unloading, and doors for entry and exit of goods",
        "Have a clear layout and boundaries for conducting each activity related to storage, loading, unloading, and entry/exit of goods",
        "For bulk goods storage, must be equipped with measuring instruments calibrated by the authorized agency, or a statement of readiness to provide adequate measuring tools"
      ],
      // Organizer Requirements
      organizerRequirements: [
        "Have a Business Identification Number (NIB)",
        "Have a trade business license, industrial business license, or other license related to warehouse or place management",
        "Have a valid taxpayer status confirmation through the application",
        "Have proof of ownership or control of an area, place, or building with clear boundaries including location map and layout plan for the Bonded Warehouse",
        "Have been confirmed as a taxable entrepreneur and have submitted the Annual Income Tax Return for the last tax year in accordance with obligations"
      ],
      // Operator Requirements
      operatorRequirements: [
        "Have a Business Identification Number (NIB)",
        "Have a Trade Business License, industrial business license, or other business license equivalent to an industrial business license",
        "Have a valid taxpayer status confirmation through the application",
        "Have proof of ownership or control of an area, place, or building with clear boundaries including location map and layout plan for the Bonded Warehouse",
        "Have been confirmed as a taxable entrepreneur and have submitted the Annual Income Tax Return for the last tax year in accordance with obligations",
        "Receive recommendation from the Bonded Warehouse Organizer if the company applies for a PDGB license"
      ],
      registrationProcessTitle: "Registration Process",
      registrationProcess: [
        "Registration of Bonded Warehouse Organizer License and Bonded Warehouse Registration can be done through the Indonesia National Single Window integrated with Online Single Submission, or",
        "Written application to the Head of Regional Office (Head of Customs) or Head of Main Service Office"
      ]
    },
    id: {
      title: "Layanan Gudang Berikat",
      subtitle: "Bantuan profesional untuk pendirian dan pengelolaan Gudang Berikat di Indonesia",
      serviceTitle: "Gudang Berikat",
      serviceDesc: "Area yang berada di bawah pengawasan bea cukai dengan fasilitas pajak untuk menyimpan barang impor tanpa perpajakan langsung",
      serviceFeatures: [
        "Penangguhan pajak untuk barang impor",
        "Kemampuan pemrosesan nilai tambah",
        "Manajemen inventaris yang efisien",
        "Pengawasan dan kepatuhan bea cukai"
      ],
      facilityRequirementsTitle: "Persyaratan Fasilitas",
      organizerRequirementsTitle: "Persyaratan Penyelenggara Gudang Berikat",
      operatorRequirementsTitle: "Persyaratan Pengusaha Gudang Berikat",
      // Facility Requirements
      facilityRequirements: [
        "Terletak di lokasi yang dapat dilalui oleh sarana pengangkut peti kemas dan/atau sarana pengangkut lainnya",
        "Mempunyai batas-batas dan luas yang jelas",
        "Mempunyai tempat untuk pemeriksaan fisik",
        "Mempunyai tempat untuk penimbunan, pemuatan, pembongkaran, serta pintu pemasukan dan pengeluaran barang",
        "Mempunyai tata letak dan batas yang jelas untuk melakukan setiap kegiatan dalam hal penimbunan, pemuatan, pembongkaran, serta pintu pemasukan dan pengeluaran barang",
        "Dalam hal menimbun barang curah, harus dilengkapi dengan alat ukur yang telah ditera oleh instansi yang berwenang, atau surat pernyataan sanggup untuk menyediakan alat ukur yang memadai"
      ],
      // Organizer Requirements
      organizerRequirements: [
        "Memiliki Nomor Induk Berusaha",
        "Memiliki izin usaha perdagangan, izin usaha industri, atau izin lain yang berkaitan dengan penyelenggaraan gudang atau tempat",
        "Memiliki hasil konfirmasi status wajib pajak sesuai dengan aplikasi yang menunjukkan valid",
        "Memiliki bukti kepemilikan atau penguasaan suatu kawasan, tempat, atau bangunan yang mempunyai batas-batas yang jelas berikut peta lokasi tempat dan rencana tata letak/denah yang akan dijadikan Gudang Berikat",
        "Telah dikukuhkan sebagai pengusaha kena pajak dan telah menyampaikan Surat Pemberitahuan Tahunan Pajak Penghasilan tahun pajak terakhir sesuai dengan kewajibannya"
      ],
      // Operator Requirements
      operatorRequirements: [
        "Memiliki Nomor Induk Berusaha",
        "Memiliki Izin Usaha Perdagangan, izin usaha industri, atau izin usaha lain yang dipersamakan dengan izin usaha industri",
        "Memiliki hasil konfirmasi status wajib pajak sesuai dengan aplikasi yang menunjukkan valid",
        "Memiliki bukti kepemilikan atau penguasaan suatu kawasan, tempat, atau bangunan yang mempunyai batas-batas yang jelas berikut peta lokasi tempat dan rencana tata letak/denah yang akan dijadikan Gudang Berikat",
        "Telah dikukuhkan sebagai pengusaha kena pajak dan telah menyampaikan Surat Pemberitahuan Tahunan Pajak Penghasilan tahun pajak terakhir sesuai dengan kewajibannya",
        "Mendapat rekomendasi dari Penyelenggara Gudang Berikat dalam hal perusahaan mengajukan permohonan izin PDGB"
      ],
      registrationProcessTitle: "Proses Pendaftaran",
      registrationProcess: [
        "Pendaftaran Izin Penyelenggara Gudang Berikat dan Pendaftaran Gudang Berikat dapat dilakukan melalui Indonesia National Single Window yang terintegrasi dengan Online Single Submission, atau",
        "Permohonan tertulis kepada Kepala Kantor Wilayah (Kepala Pabean) atau Kepala Kantor Pelayanan Utama"
      ]
    }
  };

  // Current language content
  const t = content[language];

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
                  <ProcessIcon />
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

const GudangBerikatPage = () => {
  return (
    <>
      <GudangBerikatSection />
    </>
  );
};

export default GudangBerikatPage;