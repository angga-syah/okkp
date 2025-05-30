"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/Header/Bahasa";
import Link from "next/link";

// Import React Icons
import { 
  FaPassport, 
  FaExchangeAlt, 
  FaUserTie, 
  FaUsers, 
  FaHome, 
  FaSignOutAlt,
  FaWarehouse,
  FaIndustry,
  FaChartLine,
  FaFileAlt,
  FaIdCard,
  FaExchangeAlt as FaTransfer,
  FaMapMarkerAlt,
  FaFileContract,
  FaUsersCog,
  FaFileInvoice,
  FaAngleDown
} from 'react-icons/fa';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      ease: "easeOut"
    } 
  }
};

// Function to get icon for each service
const getServiceIcon = (serviceId) => {
  const iconProps = { className: "h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" };
  
  switch(serviceId) {
    case "visa": return <FaPassport {...iconProps} />;
    case "ekspor-impor": return <FaExchangeAlt {...iconProps} />;
    case "ijin-kerja": return <FaUserTie {...iconProps} />;
    case "ijin-tinggal": return <FaUsers {...iconProps} />;
    case "itap": return <FaHome {...iconProps} />;
    case "itas-lansia": return <FaUserTie {...iconProps} />;
    case "epo": return <FaSignOutAlt {...iconProps} />;
    case "gudang-berikat": return <FaWarehouse {...iconProps} />;
    case "kawasan-berikat": return <FaIndustry {...iconProps} />;
    case "investasi": return <FaChartLine {...iconProps} />;
    case "lkpm": return <FaFileInvoice {...iconProps} />;
    case "npwp": return <FaIdCard {...iconProps} />;
    case "mutasi": return <FaTransfer {...iconProps} />;
    case "domisili": return <FaMapMarkerAlt {...iconProps} />;
    case "pp": return <FaFileContract {...iconProps} />;
    case "wlk": return <FaUsersCog {...iconProps} />;
    default: return <FaFileAlt {...iconProps} />;
  }
};

// Define services with translations
const services = [
  {
    id: "visa",
    title: {
      en: "Visit Visa Services",
      id: "Layanan Visa Kunjungan"
    },
    description: {
      en: "Comprehensive visa services for visitors and business travelers to Indonesia",
      id: "Layanan visa lengkap untuk pengunjung dan pelaku bisnis ke Indonesia"
    }
  },
  {
    id: "ekspor-impor",
    title: {
      en: "Export-Import Permits",
      id: "Izin Ekspor dan Impor"
    },
    description: {
      en: "Professional assistance with export and import licensing in Indonesia",
      id: "Bantuan profesional untuk perizinan ekspor dan impor di Indonesia"
    }
  },
  {
    id: "ijin-kerja",
    title: {
      en: "Foreign Worker Permits",
      id: "Izin Kerja Tenaga Kerja Asing"
    },
    description: {
      en: "Complete work permit solutions for foreign workers in Indonesia",
      id: "Solusi izin kerja lengkap untuk tenaga kerja asing di Indonesia"
    }
  },
  {
    id: "ijin-tinggal",
    title: {
      en: "Family Stay Permits",
      id: "Izin Tinggal Keluarga"
    },
    description: {
      en: "Stay permit services for families of foreign workers in Indonesia",
      id: "Layanan izin tinggal untuk keluarga tenaga kerja asing di Indonesia"
    }
  },
  {
    id: "itap",
    title: {
      en: "Permanent Stay Permit",
      id: "Izin Tinggal Tetap (ITAP)"
    },
    description: {
      en: "Assistance with permanent residency documentation for long-term foreign residents",
      id: "Bantuan dokumentasi izin tinggal tetap untuk warga asing jangka panjang"
    }
  },
  {
    id: "itas-lansia",
    title: {
      en: "Retirement Visa/KITAS",
      id: "VISA/KITAS Lansia"
    },
    description: {
      en: "Specialized visa services for retirees planning to reside in Indonesia",
      id: "Layanan visa khusus untuk pensiunan yang berencana tinggal di Indonesia"
    }
  },
  {
    id: "epo",
    title: {
      en: "Exit Permit Only (EPO)",
      id: "Exit Permit Only (EPO)"
    },
    description: {
      en: "Documentation services for foreign nationals departing Indonesia permanently",
      id: "Layanan dokumentasi untuk warga negara asing yang meninggalkan Indonesia secara permanen"
    }
  },
  {
    id: "gudang-berikat",
    title: {
      en: "Bonded Warehouse",
      id: "Gudang Berikat"
    },
    description: {
      en: "Licensing services for bonded warehouse facilities in Indonesia",
      id: "Layanan perizinan untuk fasilitas gudang berikat di Indonesia"
    }
  },
  {
    id: "kawasan-berikat",
    title: {
      en: "Bonded Zone",
      id: "Kawasan Berikat"
    },
    description: {
      en: "Licensing services for bonded zone production facilities in Indonesia",
      id: "Layanan perizinan untuk fasilitas produksi kawasan berikat di Indonesia"
    }
  },
  {
    id: "investasi",
    title: {
      en: "Investment Documentation",
      id: "Dokumen Investasi"
    },
    description: {
      en: "Comprehensive services for foreign direct investment documentation",
      id: "Layanan komprehensif untuk dokumentasi penanaman modal asing"
    }
  },
  {
    id: "lkpm",
    title: {
      en: "Investment Activity Reports",
      id: "Laporan Kegiatan Penanaman Modal"
    },
    description: {
      en: "Professional preparation of mandatory investment activity reports",
      id: "Penyusunan profesional laporan kegiatan penanaman modal wajib"
    }
  },
  {
    id: "npwp",
    title: {
      en: "Tax ID Number (NPWP)",
      id: "Nomor Pokok Wajib Pajak"
    },
    description: {
      en: "Registration services for individual and corporate tax identification",
      id: "Layanan pendaftaran identifikasi pajak untuk individu dan perusahaan"
    }
  },
  {
    id: "mutasi",
    title: {
      en: "Changes & Transfers",
      id: "Mutasi"
    },
    description: {
      en: "Services for address, passport, or position changes for foreign residents",
      id: "Layanan untuk perubahan alamat, paspor, atau jabatan bagi penduduk asing"
    }
  },
  {
    id: "domisili",
    title: {
      en: "Certificate of Domicile",
      id: "Surat Keterangan Domisili"
    },
    description: {
      en: "Professional assistance with business domicile certification",
      id: "Bantuan profesional dengan sertifikasi domisili usaha"
    }
  },
  {
    id: "pp",
    title: {
      en: "Company Regulations",
      id: "Peraturan Perusahaan"
    },
    description: {
      en: "Development and registration of company regulations documents",
      id: "Penyusunan dan pendaftaran dokumen peraturan perusahaan"
    }
  },
  {
    id: "wlk",
    title: {
      en: "Manpower Reporting",
      id: "Wajib Lapor Ketenagakerjaan"
    },
    description: {
      en: "Mandatory online manpower reporting services for businesses",
      id: "Layanan pelaporan ketenagakerjaan online wajib untuk bisnis"
    }
  }
];

const ServicesPage = () => {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Translations
  const content = {
    en: {
      title: "Our Services",
      subtitle: "Comprehensive solutions for business documentation and compliance in Indonesia",
      explore: "Details",
      viewAll: "View All",
      categories: {
        all: "All Services",
        visa: "Visa & Immigration",
        business: "Business Services",
        investment: "Investment Services",
        compliance: "Compliance & Reporting"
      }
    },
    id: {
      title: "Layanan Kami",
      subtitle: "Solusi komprehensif untuk dokumentasi dan kepatuhan bisnis di Indonesia",
      explore: "Detail",
      viewAll: "Lihat Semua",
      categories: {
        all: "Semua Layanan",
        visa: "Visa & Imigrasi",
        business: "Layanan Bisnis",
        investment: "Layanan Investasi",
        compliance: "Kepatuhan & Pelaporan"
      }
    }
  };

  // Current language content
  const t = content[language as keyof typeof content];

  // Service categories
  const categoryMap = {
    visa: ["visa", "ijin-kerja", "ijin-tinggal", "itap", "itas-lansia", "epo", "mutasi", "domisili"],
    business: ["ekspor-impor", "gudang-berikat", "kawasan-berikat", "pp"],
    investment: ["investasi", "lkpm", "npwp"],
    compliance: ["wlk"]
  };

  // Function to filter services by category
  const getFilteredServices = () => {
    if (activeCategory === "all") {
      return services;
    }
    return services.filter(service => categoryMap[activeCategory].includes(service.id));
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeIn}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.title}
          </h1>
          <div className="h-1 w-20 bg-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.categories.all}
            </button>
            <button
              onClick={() => setActiveCategory("visa")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === "visa"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.categories.visa}
            </button>
            <button
              onClick={() => setActiveCategory("business")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === "business"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.categories.business}
            </button>
            <button
              onClick={() => setActiveCategory("investment")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === "investment"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.categories.investment}
            </button>
            <button
              onClick={() => setActiveCategory("compliance")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeCategory === "compliance"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t.categories.compliance}
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {getFilteredServices().map((service) => (
            <div 
              key={service.id}
              className="bg-white dark:bg-gray-800 rounded-md shadow p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mt-1">
                  {getServiceIcon(service.id)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                    {service.title[language as keyof typeof service.title]}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                    {service.description[language as keyof typeof service.description]}
                  </p>
                  <Link 
                    href={`/${service.id}`}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t.explore}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default ServicesPage;