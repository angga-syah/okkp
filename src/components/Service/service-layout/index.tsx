"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/Header/Bahasa";
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
  FaCalendarAlt,
  FaChevronDown,
  FaChevronRight,
  FaBars,
  FaTimes
} from 'react-icons/fa';

interface ServiceIconProps {
  serviceId: string;
}

const getServiceIcon = ({ serviceId }: ServiceIconProps) => {
  const iconProps = { className: "h-5 w-5" };
  
  switch(serviceId) {
    case "visa":
      return <FaPassport {...iconProps} />;
    case "ekspor-impor":
      return <FaExchangeAlt {...iconProps} />;
    case "ijin-kerja":
      return <FaUserTie {...iconProps} />;
    case "ijin-tinggal":
      return <FaUsers {...iconProps} />;
    case "itap":
      return <FaHome {...iconProps} />;
    case "itas-lansia":
      return <FaCalendarAlt {...iconProps} />;
    case "epo":
      return <FaSignOutAlt {...iconProps} />;
    case "gudang-berikat":
      return <FaWarehouse {...iconProps} />;
    case "kawasan-berikat":
      return <FaIndustry {...iconProps} />;
    case "investasi":
      return <FaChartLine {...iconProps} />;
    case "lkpm":
      return <FaFileInvoice {...iconProps} />;
    case "npwp":
      return <FaIdCard {...iconProps} />;
    case "mutasi":
      return <FaTransfer {...iconProps} />;
    case "domisili":
      return <FaMapMarkerAlt {...iconProps} />;
    case "pp":
      return <FaFileContract {...iconProps} />;
    case "wlk":
      return <FaUsersCog {...iconProps} />;
    default:
      return <FaFileAlt {...iconProps} />;
  }
};

// Define service title interface
interface ServiceTitle {
  en: string;
  id: string;
}

// Define service interface
interface Service {
  id: string;
  title: ServiceTitle;
}

// Define services with translations
const services: Service[] = [
  {
    id: "visa",
    title: {
      en: "Visit Visa Services",
      id: "Layanan Visa Kunjungan"
    }
  },
  {
    id: "ekspor-impor",
    title: {
      en: "Export-Import Permits",
      id: "Izin Ekspor dan Impor"
    }
  },
  {
    id: "ijin-kerja",
    title: {
      en: "Foreign Worker Permits",
      id: "Izin Kerja Tenaga Kerja Asing"
    }
  },
  {
    id: "ijin-tinggal",
    title: {
      en: "Family Stay Permits",
      id: "Izin Tinggal Keluarga"
    }
  },
  {
    id: "itap",
    title: {
      en: "Permanent Stay Permit",
      id: "Izin Tinggal Tetap (ITAP)"
    }
  },
  {
    id: "itas-lansia",
    title: {
      en: "Retirement Visa/KITAS",
      id: "VISA/KITAS Lansia"
    }
  },
  {
    id: "epo",
    title: {
      en: "Exit Permit Only (EPO)",
      id: "Exit Permit Only (EPO)"
    }
  },
  {
    id: "gudang-berikat",
    title: {
      en: "Bonded Warehouse",
      id: "Gudang Berikat"
    }
  },
  {
    id: "kawasan-berikat",
    title: {
      en: "Bonded Zone",
      id: "Kawasan Berikat"
    }
  },
  {
    id: "investasi",
    title: {
      en: "Investment Documentation",
      id: "Dokumen Investasi"
    }
  },
  {
    id: "lkpm",
    title: {
      en: "Investment Activity Reports",
      id: "Laporan Kegiatan Penanaman Modal"
    }
  },
  {
    id: "npwp",
    title: {
      en: "Tax ID Number (NPWP)",
      id: "Nomor Pokok Wajib Pajak"
    }
  },
  {
    id: "mutasi",
    title: {
      en: "Changes & Transfers",
      id: "Mutasi"
    }
  },
  {
    id: "domisili",
    title: {
      en: "Certificate of Domicile",
      id: "Surat Keterangan Domisili"
    }
  },
  {
    id: "pp",
    title: {
      en: "Company Regulations",
      id: "Peraturan Perusahaan"
    }
  },
  {
    id: "wlk",
    title: {
      en: "Manpower Reporting",
      id: "Wajib Lapor Ketenagakerjaan"
    }
  }
];

// Define category interface
interface ServiceCategory {
  en: string;
  id: string;
  services: string[];
}

// Service categories with translations
interface ServiceCategories {
  [key: string]: ServiceCategory;
}

const serviceCategories: ServiceCategories = {
  visa: {
    en: "Visa & Immigration",
    id: "Visa & Imigrasi",
    services: ["visa", "ijin-kerja", "ijin-tinggal", "itap", "itas-lansia", "epo", "mutasi"]
  },
  business: {
    en: "Business Services",
    id: "Layanan Bisnis",
    services: ["domisili", "ekspor-impor", "gudang-berikat", "kawasan-berikat", "pp"]
  },
  investment: {
    en: "Investment Services",
    id: "Layanan Investasi",
    services: ["investasi", "lkpm", "npwp"]
  },
  compliance: {
    en: "Compliance & Reporting",
    id: "Kepatuhan & Pelaporan",
    services: ["wlk"]
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

const listVariants = {
  open: { 
    height: 'auto',
    opacity: 1,
    transition: { 
      staggerChildren: 0.07,
      delayChildren: 0.1,
      height: { duration: 0.3 },
      opacity: { duration: 0.2 }
    } 
  },
  closed: { 
    height: 0,
    opacity: 0,
    transition: { 
      staggerChildren: 0.05,
      staggerDirection: -1,
      height: { duration: 0.3 },
      opacity: { duration: 0.2 }
    } 
  }
};

const itemVariants = {
  open: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.3 } 
  },
  closed: { 
    y: -10, 
    opacity: 0, 
    transition: { duration: 0.3 } 
  }
};

const mobileMenuVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  },
  closed: {
    x: "-100%",
    opacity: 0,
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};

interface ServiceLayoutProps {
  children: React.ReactNode;
}

const ServiceLayout = ({ children }: ServiceLayoutProps) => {
  const { language } = useLanguage();
  const pathname = usePathname();
  
  // Safely extract the service ID from the pathname
  const pathnameSegments = pathname.split('/');
  const currentServiceId = pathnameSegments[pathnameSegments.length - 1];

  // Determine which category the current service belongs to
  let currentCategory: string | null = null;
  
  for (const [category, data] of Object.entries(serviceCategories)) {
    if (data.services.includes(currentServiceId)) {
      currentCategory = category;
      break;
    }
  }

  // State to track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>(() => {
    // Initially expand only the category of the current service
    const initialState: { [key: string]: boolean } = {};
    Object.keys(serviceCategories).forEach(category => {
      initialState[category] = category === currentCategory;
    });
    return initialState;
  });

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Get current service title
  const currentService = services.find(s => s.id === currentServiceId);
  const currentServiceTitle = currentService ? currentService.title[language === 'en' ? 'en' : 'id'] : '';

  return (
    <div className="pt-[80px] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Only visible on desktop */}
          <motion.aside 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="hidden lg:block lg:w-1/4 xl:w-1/5 sticky top-24 self-start"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 text-center">
                {language === 'en' ? 'Our Services' : 'Layanan Kami'}
              </h2>

              <nav className="space-y-4">
                {Object.entries(serviceCategories).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="space-y-2">
                    <button
                      onClick={() => toggleCategory(categoryKey)}
                      className="flex items-center justify-between w-full text-left font-medium text-blue-600 dark:text-blue-400 mb-1 py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span>{category[language === 'en' ? 'en' : 'id']}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {expandedCategories[categoryKey] ? (
                          <FaChevronDown className="h-3 w-3" />
                        ) : (
                          <FaChevronRight className="h-3 w-3" />
                        )}
                      </span>
                    </button>
                    
                    <AnimatePresence>
                      {expandedCategories[categoryKey] && (
                        <motion.ul
                          variants={listVariants}
                          initial="closed"
                          animate="open"
                          exit="closed"
                          className="space-y-1 overflow-hidden"
                        >
                          {category.services.map(serviceId => {
                            const serviceItem = services.find(s => s.id === serviceId);
                            const isActive = serviceId === currentServiceId;
                            
                            if (!serviceItem) return null;
                            
                            return (
                              <motion.li 
                                key={serviceId}
                                variants={itemVariants}
                              >
                                <Link
                                  href={`/${serviceId}`}
                                  className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                                    isActive 
                                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' 
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <span className="mr-3 text-blue-600 dark:text-blue-400">
                                    {getServiceIcon({ serviceId })}
                                  </span>
                                  <span className="text-sm">{serviceItem.title[language === 'en' ? 'en' : 'id']}</span>
                                </Link>
                              </motion.li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>

              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/services"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  <span className="mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(180 10 10)" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium">
                    {language === 'en' ? 'All Services' : 'Semua Layanan'}
                  </span>
                </Link>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                {language === 'en' ? 'Need Assistance?' : 'Perlu Bantuan?'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                {language === 'en' 
                  ? 'Contact our team for personalized assistance with your documentation needs.' 
                  : 'Hubungi tim kami untuk bantuan personal dengan kebutuhan dokumentasi Anda.'}
              </p>
              <a 
                href="/contact" 
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
              >
                {language === 'en' ? 'Contact Us' : 'Hubungi Kami'}
              </a>
            </div>
          </motion.aside>

          {/* Mobile Navigation Button */}
          <div className="lg:hidden fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-blue-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>

          {/* Mobile Service Navigation - Slide in from left */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={mobileMenuVariants}
                className="lg:hidden fixed inset-0 z-40 bg-gray-900 bg-opacity-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 left-0 h-full w-4/5 max-w-xs bg-white dark:bg-gray-800 shadow-xl overflow-y-auto"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {language === 'en' ? 'Our Services' : 'Layanan Kami'}
                      </h2>
                      <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <FaTimes size={20} />
                      </button>
                    </div>

                    <nav className="space-y-4">
                      {Object.entries(serviceCategories).map(([categoryKey, category]) => (
                        <div key={categoryKey} className="space-y-2">
                          <button
                            onClick={() => toggleCategory(categoryKey)}
                            className="flex items-center justify-between w-full text-left font-medium text-blue-600 dark:text-blue-400 mb-1 py-2 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span>{category[language === 'en' ? 'en' : 'id']}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {expandedCategories[categoryKey] ? (
                                <FaChevronDown className="h-3 w-3" />
                              ) : (
                                <FaChevronRight className="h-3 w-3" />
                              )}
                            </span>
                          </button>
                          
                          <AnimatePresence>
                            {expandedCategories[categoryKey] && (
                              <motion.ul
                                variants={listVariants}
                                initial="closed"
                                animate="open"
                                exit="closed"
                                className="space-y-1 overflow-hidden"
                              >
                                {category.services.map(serviceId => {
                                  const serviceItem = services.find(s => s.id === serviceId);
                                  const isActive = serviceId === currentServiceId;
                                  
                                  if (!serviceItem) return null;
                                  
                                  return (
                                    <motion.li 
                                      key={serviceId}
                                      variants={itemVariants}
                                    >
                                      <Link
                                        href={`/${serviceId}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                                          isActive 
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' 
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                      >
                                        <span className="mr-3 text-blue-600 dark:text-blue-400">
                                          {getServiceIcon({ serviceId })}
                                        </span>
                                        <span className="text-sm">{serviceItem.title[language === 'en' ? 'en' : 'id']}</span>
                                      </Link>
                                    </motion.li>
                                  );
                                })}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </nav>

                    <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href="/services"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        <span className="mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(180 10 10)" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium">
                          {language === 'en' ? 'All Services' : 'Semua Layanan'}
                        </span>
                      </Link>

                      <a 
                        href="/contact" 
                        className="mt-4 inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                      >
                        {language === 'en' ? 'Contact Us' : 'Hubungi Kami'}
                      </a>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="lg:w-3/4 xl:w-4/5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ServiceLayout;