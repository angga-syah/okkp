"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/Header/Bahasa";
import { FaUsers, FaIndustry, FaLaptopCode, FaBuilding } from 'react-icons/fa';

// Define client type
interface Client {
  name: string;
  industry: string;
}

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
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const itemFadeIn = {
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

// ClientList component
const ClientList = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Content translations
  const content = {
    en: {
      title: "Our Clients",
      subtitle: "Trusted by leading companies across various industries",
      searchPlaceholder: "Search clients...",
      industryFilter: "Filter by industry",
      allIndustries: "All Industries",
      industries: {
        manufacturing: "Manufacturing",
        technology: "Technology",
        automotive: "Automotive",
        fmcg: "FMCG",
        logistics: "Logistics",
        construction: "Construction",
        retail: "Retail",
        others: "Others"
      },
      trustTitle: "Trusted by Leading Companies",
      trustDescription: "We're proud to serve businesses of all sizes, from local enterprises to multinational corporations. Our clients trust us to deliver exceptional service and reliable solutions for their documentation and compliance needs.",
      noResults: "No clients found matching your criteria"
    },
    id: {
      title: "Pengguna Jasa",
      subtitle: "Dipercaya oleh perusahaan terkemuka di berbagai industri",
      searchPlaceholder: "Cari perusahaan...",
      industryFilter: "Filter berdasarkan industri",
      allIndustries: "Semua Industri",
      industries: {
        manufacturing: "Manufaktur",
        technology: "Teknologi",
        automotive: "Otomotif",
        fmcg: "FMCG",
        logistics: "Logistik",
        construction: "Konstruksi",
        retail: "Retail",
        others: "Lainnya"
      },
      trustTitle: "Dipercaya oleh Perusahaan Terkemuka",
      trustDescription: "Kami bangga melayani bisnis dari semua ukuran, dari perusahaan lokal hingga perusahaan multinasional. Klien kami mempercayai kami untuk memberikan layanan luar biasa dan solusi andal untuk kebutuhan dokumentasi dan kepatuhan mereka.",
      noResults: "Tidak ada perusahaan yang sesuai dengan kriteria pencarian"
    }
  };

  // Memoize client data to prevent recreation on every render
  const clients = useMemo(() => [
    { name: "Asics Corporation", industry: "manufacturing" },
    { name: "Acset Indonusa", industry: "construction" },
    { name: "Asahi Networks Indonesia", industry: "others" },
    { name: "Asusindo Servistama", industry: "technology" },
    { name: "Asus Technology Indonesia Batam", industry: "technology" },
    { name: "Asus Technology Indonesia Jakarta", industry: "technology" },
    { name: "Buana Jialing Makmur Sakti Motor", industry: "automotive" },
    { name: "Cahaya Subur Abadi", industry: "others" },
    { name: "Centratama Telekomunikasi Indonesia", industry: "technology" },
    { name: "Consulting Services Indonesia", industry: "others" },
    { name: "Cosmo Green Technology", industry: "technology" },
    { name: "Cosmo Technology", industry: "technology" },
    { name: "Daido Metal Indonesia", industry: "manufacturing" },
    { name: "Daya Radar Utama", industry: "manufacturing" },
    { name: "Eagle Nice Indonesia", industry: "manufacturing" },
    { name: "Glostar Indonesia", industry: "manufacturing" },
    { name: "HON SHIN CORPORATION", industry: "manufacturing" },
    { name: "Indolakto", industry: "fmcg" },
    { name: "Indokuat Sukses Makmur", industry: "manufacturing" },
    { name: "IOT EPC Indonesia", industry: "technology" },
    { name: "JFE Steel Galvanizing Indonesia", industry: "manufacturing" },
    { name: "KMK Global Sports", industry: "retail" },
    { name: "MAP Trans Logistics", industry: "logistics" },
    { name: "Nikomas Gemilang", industry: "manufacturing" },
    { name: "Paiho Indonesia", industry: "manufacturing" },
    { name: "Panasonic Gobel Life Solutions Sales Indonesia", industry: "retail" },
    { name: "Panasonic Gobel Life Solutions Manufacturing Indonesia", industry: "manufacturing" },
    { name: "Pishon Ireh", industry: "others" },
    { name: "PPG Coatings Indonesia", industry: "manufacturing" },
    { name: "Pou Chen Indonesia", industry: "manufacturing" },
    { name: "Pou Yuen Indonesia", industry: "manufacturing" },
    { name: "Sadamaya Graha Teknologi", industry: "technology" },
    { name: "Sanken Indonesia", industry: "manufacturing" },
    { name: "Star Tec Pacific", industry: "technology" },
    { name: "Selalu Cinta Indonesia", industry: "retail" },
    { name: "Shoenaey Javanesia Indonesia", industry: "manufacturing" },
    { name: "Time International", industry: "retail" },
    { name: "Vepro International (Vepro Group)", industry: "manufacturing" },
    { name: "Yakult Indonesia Persada", industry: "fmcg" },
    { name: "Yayasan Matsushita Gobel", industry: "others" }
  ], []);

  // Current language content
  const t = content[language as keyof typeof content];
  
  // Filter clients based on search term and selected industry
  useEffect(() => {
    let result = clients;
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by industry
    if (selectedIndustry !== "all") {
      result = result.filter(client => client.industry === selectedIndustry);
    }
    
    setFilteredClients(result);
  }, [searchTerm, selectedIndustry, clients]);

  // Initialize filtered clients on component mount
  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  // Extract unique industries for filter buttons
  const industries = useMemo(() => {
    const uniqueIndustries = Array.from(new Set(clients.map(client => client.industry)));
    return ["all", ...uniqueIndustries];
  }, [clients]);

  // Count clients by industry for stats
  const clientStats = useMemo(() => ({
    total: clients.length,
    manufacturing: clients.filter(client => client.industry === "manufacturing").length,
    technology: clients.filter(client => client.industry === "technology").length,
    other: clients.filter(client => !["manufacturing", "technology"].includes(client.industry)).length
  }), [clients]);

  // Function to handle industry button click
  const handleIndustryClick = (industry: string) => {
    setSelectedIndustry(industry);
  };

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
          <h1 className="text-2xl font-bold text-black dark:text-white mb-4 text-center">
            {t.title}
          </h1>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "8rem" }}
            transition={{ duration: 1, delay: 0.6 }}
            className="h-1 bg-blue-600 mx-auto mb-6"
          ></motion.div>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        {/* Client Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-3">
              <FaUsers className="text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{clientStats.total}+</h3>
            <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'Satisfied Clients' : 'Klien Puas'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-3">
              <FaIndustry className="text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{clientStats.manufacturing}</h3>
            <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'Manufacturing' : 'Manufaktur'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-3">
              <FaLaptopCode className="text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{clientStats.technology}</h3>
            <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'Technology' : 'Teknologi'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-3">
              <FaBuilding className="text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{clientStats.other}</h3>
            <p className="text-gray-700 dark:text-gray-300">{language === 'en' ? 'Other Industries' : 'Industri Lainnya'}</p>
          </div>
        </motion.div>

        {/* Trust Message */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="mb-16 max-w-4xl mx-auto text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.trustTitle}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            {t.trustDescription}
          </p>
        </motion.div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex flex-col gap-6">
            {/* Search */}
            <div className="w-full">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Industry Filter Buttons */}
            <div className="w-full">
              <p className="text-gray-700 dark:text-gray-300 mb-2">{t.industryFilter}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleIndustryClick("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedIndustry === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {t.allIndustries}
                </button>
                {industries.filter(industry => industry !== "all").map((industry) => (
                  <button
                    key={industry}
                    onClick={() => handleIndustryClick(industry)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      selectedIndustry === industry
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t.industries[industry as keyof typeof t.industries] || industry}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Client List */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
        >
          {filteredClients.length > 0 ? (
            filteredClients.map((client, index) => (
              <motion.div 
                key={index}
                variants={itemFadeIn}
                whileHover={{ scale: 1.03, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-600"
              >
                <p className="text-gray-800 dark:text-white font-medium">{client.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t.industries[client.industry as keyof typeof t.industries]}
                </p>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">{t.noResults}</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ClientList;