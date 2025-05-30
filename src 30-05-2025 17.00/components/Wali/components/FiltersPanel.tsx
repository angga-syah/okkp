// src/components/Wali/components/FiltersPanel.tsx - ENHANCED UI VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔧 FIXED: Updated interface to use proper React state setters
interface FiltersPanelProps {
  statusFilter: string[];
  setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  serviceFilter: string[];
  setServiceFilter: React.Dispatch<React.SetStateAction<string[]>>;
  dayFilter: string;
  setDayFilter: (day: string) => void;
  monthFilter: string;
  setMonthFilter: (month: string) => void;
  yearFilter: string;
  setYearFilter: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  setCurrentPage: (page: number) => void;
}

// 🔧 FIXED: Status mapping based on actual database schema
interface StatusOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

// 🔧 FIXED: Service mapping based on actual services
interface ServiceOption {
  value: string;
  label: string;
  description?: string;
}

export default function FiltersPanel({
  statusFilter,
  setStatusFilter,
  serviceFilter,
  setServiceFilter,
  dayFilter,
  setDayFilter,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  searchQuery,
  setSearchQuery,
  resetFilters,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage
}: FiltersPanelProps) {

  // 🔧 NEW: Show/hide filters state
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // 🔧 FIXED: Dynamic status options from API
  const [availableStatuses, setAvailableStatuses] = useState<StatusOption[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState<boolean>(true);
  const [statusError, setStatusError] = useState<string>('');

  // 🔧 FIXED: Enhanced search with debouncing
  const [searchInput, setSearchInput] = useState<string>(searchQuery);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // 🔧 FIXED: Add status normalization function
  const normalizeStatus = useCallback((status: string): string => {
    return status.toLowerCase().replace(/\s+/g, '_');
  }, []);

  // 🔧 FIXED: Comprehensive status definitions based on database schema
  const getDefaultStatuses = useCallback((): StatusOption[] => {
    return [
      { 
        value: 'pending_payment', 
        label: 'Menunggu Pembayaran',
        description: 'Pesanan dibuat, menunggu pembayaran',
        color: 'bg-yellow-100 text-yellow-800'
      },
      { 
        value: 'payment_verified', 
        label: 'Pembayaran Terverifikasi',
        description: 'Pembayaran sudah dikonfirmasi',
        color: 'bg-blue-100 text-blue-800'
      },
      { 
        value: 'document_verification', 
        label: 'Verifikasi Dokumen',
        description: 'Sedang memverifikasi dokumen',
        color: 'bg-purple-100 text-purple-800'
      },
      { 
        value: 'pending_document', 
        label: 'Menunggu Dokumen',
        description: 'Menunggu upload dokumen tambahan',
        color: 'bg-orange-100 text-orange-800'
      },
      { 
        value: 'processing', 
        label: 'Sedang Diproses',
        description: 'Dokumen sedang diproses',
        color: 'bg-indigo-100 text-indigo-800'
      },
      { 
        value: 'completed', 
        label: 'Selesai',
        description: 'Pesanan selesai, hasil tersedia',
        color: 'bg-green-100 text-green-800'
      },
      { 
        value: 'cancelled', 
        label: 'Dibatalkan',
        description: 'Pesanan dibatalkan',
        color: 'bg-red-100 text-red-800'
      },
      { 
        value: 'payment_expired', 
        label: 'Pembayaran Kedaluwarsa',
        description: 'Waktu pembayaran habis',
        color: 'bg-gray-100 text-gray-800'
      }
    ];
  }, []);

  const getStatusDisplay = useCallback((status: string): string => {
    const statusDisplayMap: Record<string, string> = {
      'pending_payment': 'Menunggu Pembayaran',
      'payment_verified': 'Pembayaran Terverifikasi',
      'document_verification': 'Verifikasi Dokumen', 
      'pending_document': 'Menunggu Dokumen',
      'processing': 'Sedang Diproses',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan',
      'payment_expired': 'Pembayaran Kedaluwarsa',
      
      'Pending Payment': 'Menunggu Pembayaran',
      'Payment Verified': 'Pembayaran Terverifikasi',
      'Document Verification': 'Verifikasi Dokumen',
      'Pending Document': 'Menunggu Dokumen',
      'Processing': 'Sedang Diproses',
      'Completed': 'Selesai',
      'Cancelled': 'Dibatalkan',
      'Payment Expired': 'Pembayaran Kedaluwarsa',
    };
    
    return statusDisplayMap[status] || status;
  }, []);

  const getStatusDescription = useCallback((status: string): string => {
    const descriptions: Record<string, string> = {
      'pending_payment': 'Pesanan dibuat, menunggu pembayaran',
      'payment_verified': 'Pembayaran sudah dikonfirmasi',
      'document_verification': 'Sedang memverifikasi dokumen',
      'pending_document': 'Menunggu upload dokumen tambahan', 
      'processing': 'Dokumen sedang diproses',
      'completed': 'Pesanan selesai, hasil tersedia',
      'cancelled': 'Pesanan dibatalkan',
      'payment_expired': 'Waktu pembayaran habis'
    };
    
    return descriptions[status] || '';
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    const colors: Record<string, string> = {
      'pending_payment': 'bg-yellow-100 text-yellow-800',
      'payment_verified': 'bg-blue-100 text-blue-800',
      'document_verification': 'bg-purple-100 text-purple-800',
      'pending_document': 'bg-orange-100 text-orange-800',
      'processing': 'bg-indigo-100 text-indigo-800', 
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'payment_expired': 'bg-gray-100 text-gray-800'
    };
    
    return colors[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // 🔧 FIXED: Service options based on actual services
  const getDefaultServices = useCallback((): ServiceOption[] => {
    return [
      { 
        value: 'E-Visa Business Single Entry', 
        label: 'E-Visa Business Single Entry',
        description: 'Visa bisnis sekali masuk'
      },
      { 
        value: 'E-Visa Business Multiple Entry', 
        label: 'E-Visa Business Multiple Entry',
        description: 'Visa bisnis berkali masuk'
      }
    ];
  }, []);

  // 🔧 FIXED: Process status options function with explicit typing
  const processStatusOptions = useCallback((statuses: string[]): StatusOption[] => {
    return statuses.map((status: string) => {
      const normalized = normalizeStatus(status);
      
      return {
        value: normalized,
        label: getStatusDisplay(normalized),
        description: getStatusDescription(normalized),
        color: getStatusColor(normalized)
      };
    });
  }, [normalizeStatus, getStatusDisplay, getStatusDescription, getStatusColor]);

  // 🔧 FIXED: Fetch available statuses from API
  const fetchAvailableStatuses = useCallback(async (): Promise<void> => {
    try {
      setLoadingStatuses(true);
      setStatusError('');
      
      const response = await fetch('/api/orders/statuses', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const statusOptions: StatusOption[] = data.data.map((status: string) => {
          const defaultStatus = getDefaultStatuses().find((s: StatusOption) => s.value === status);
          return defaultStatus || {
            value: status,
            label: status.split('_').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            color: 'bg-gray-100 text-gray-800'
          };
        });
        
        setAvailableStatuses(statusOptions);
        console.log('✅ Loaded statuses from API:', statusOptions.length);
      } else {
        throw new Error('Invalid API response format');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch statuses from API:', error);
      
      const defaultStatuses = getDefaultStatuses();
      setAvailableStatuses(defaultStatuses);
      setStatusError('Menggunakan status default (API tidak tersedia)');
      
      console.log('✅ Using default statuses:', defaultStatuses.length);
    } finally {
      setLoadingStatuses(false);
    }
  }, [getDefaultStatuses]);

  // 🔧 FIXED: Fetch available services
  const fetchAvailableServices = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/orders/services', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          const serviceOptions: ServiceOption[] = data.data.map((service: string) => ({
            value: service,
            label: service
          }));
          
          setAvailableServices(serviceOptions);
          console.log('✅ Loaded services from API:', serviceOptions.length);
          return;
        }
      }
      
      throw new Error('API response invalid or not available');
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch services from API:', error);
      
      const defaultServices = getDefaultServices();
      setAvailableServices(defaultServices);
      console.log('✅ Using default services:', defaultServices.length);
    }
  }, [getDefaultServices]);

  // 🔧 FIXED: Load data on component mount
  useEffect(() => {
    fetchAvailableStatuses();
    fetchAvailableServices();
  }, [fetchAvailableStatuses, fetchAvailableServices]);

  // 🔧 FIXED: Enhanced search with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 300);
    
    setSearchDebounceTimer(timer);
  }, [searchDebounceTimer, setSearchQuery, setCurrentPage]);

  // 🔧 FIXED: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  // 🔧 FIXED: Update search input when external searchQuery changes
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Generate years for filter (last 10 years + next 2 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => currentYear - 9 + i);
  }, []);

  // Generate months for filter
  const months = useMemo(() => [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ], []);

  // Generate days for filter
  const days = useMemo(() => 
    Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')), 
  []);

  // 🔧 FIXED: Enhanced multi-select filter handlers with proper typing
  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter((prev: string[]) => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  }, [setStatusFilter, setCurrentPage]);

  const handleServiceChange = useCallback((service: string) => {
    setServiceFilter((prev: string[]) => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
    setCurrentPage(1);
  }, [setServiceFilter, setCurrentPage]);

  const handleRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  }, [setRowsPerPage, setCurrentPage]);

  // 🔧 FIXED: Enhanced reset with confirmation
  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    resetFilters();
  }, [resetFilters]);

  // 🔧 FIXED: Date filter handlers with proper typing
  const handleDayChange = useCallback((value: string) => {
    setDayFilter(value);
    setCurrentPage(1);
    
    if (value && !monthFilter && !yearFilter) {
      const now = new Date();
      setMonthFilter((now.getMonth() + 1).toString().padStart(2, '0'));
      setYearFilter(now.getFullYear().toString());
    }
  }, [monthFilter, yearFilter, setDayFilter, setCurrentPage, setMonthFilter, setYearFilter]);

  const handleMonthChange = useCallback((value: string) => {
    setMonthFilter(value);
    setCurrentPage(1);
    
    if (value && !yearFilter) {
      setYearFilter(new Date().getFullYear().toString());
    }
  }, [yearFilter, setMonthFilter, setCurrentPage, setYearFilter]);

  const handleYearChange = useCallback((value: string) => {
    setYearFilter(value);
    setCurrentPage(1);
  }, [setYearFilter, setCurrentPage]);

  const getDateFilterHelperText = useCallback((): string => {
    const filters: string[] = [];
    
    if (yearFilter) filters.push(`Tahun: ${yearFilter}`);
    if (monthFilter) {
      const monthData = months.find((m) => m.value === monthFilter);
      filters.push(`Bulan: ${monthData?.label || monthFilter}`);
    }
    if (dayFilter) filters.push(`Tanggal: ${dayFilter}`);
    
    if (filters.length === 0) return 'Pilih salah satu atau kombinasi filter tanggal';
    
    if (filters.length === 1) {
      if (yearFilter && !monthFilter && !dayFilter) return `Semua pesanan tahun ${yearFilter}`;
      if (monthFilter && !dayFilter && yearFilter) {
        const monthData = months.find((m) => m.value === monthFilter);
        return `Semua pesanan ${monthData?.label || monthFilter} ${yearFilter}`;
      }
      if (monthFilter && !dayFilter && !yearFilter) {
        const monthData = months.find((m) => m.value === monthFilter);
        return `Semua pesanan ${monthData?.label || monthFilter} tahun ini`;
      }
    }
    
    return `Filter: ${filters.join(', ')}`;
  }, [yearFilter, monthFilter, dayFilter, months]);

  // Multi-select checkbox component
  interface MultiSelectCheckboxProps {
    label: string;
    checked: boolean;
    onChange: () => void;
  }

  const MultiSelectCheckbox: React.FC<MultiSelectCheckboxProps> = ({ 
    label, 
    checked, 
    onChange 
  }) => (
    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
      />
      <span className="text-gray-700 dark:text-gray-300 text-sm">{label}</span>
    </label>
  );

  return (
    <div>
      {/* Enhanced Search and Filter Toggle Section */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari pesanan berdasarkan nama, email, layanan, atau invoice..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm"
              maxLength={200}
            />
            {searchInput !== searchQuery && (
              <div className="absolute right-12 top-3.5 text-blue-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                showFilters 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:shadow-xl'
              }`}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:shadow-xl text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filter
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      {/* Status loading/error indicator */}
      {statusError && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm">
          ⚠️ {statusError}
        </div>
      )}
      
      {/* Enhanced Collapsible Advanced Filters Section */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Enhanced Status Filter */}
                <div className="space-y-3 md:col-span-2 lg:col-span-1">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Status ({statusFilter.length} dipilih)
                    {loadingStatuses && (
                      <span className="ml-1 text-blue-500">
                        <svg className="inline animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      </span>
                    )}
                  </label>
                  <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="grid grid-cols-1 gap-2">
                      {availableStatuses.map((status: StatusOption) => (
                        <MultiSelectCheckbox
                          key={status.value}
                          label={status.label}
                          checked={statusFilter.includes(status.value)}
                          onChange={() => handleStatusChange(status.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Service Filter */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Layanan ({serviceFilter.length} dipilih)
                  </label>
                  <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-800/50 p-4 backdrop-blur-sm">
                    {availableServices.map((service: ServiceOption) => (
                      <MultiSelectCheckbox
                        key={service.value}
                        label={service.label}
                        checked={serviceFilter.includes(service.value)}
                        onChange={() => handleServiceChange(service.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Enhanced Date filters */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Filter Tanggal
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                      {getDateFilterHelperText()}
                    </span>
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={dayFilter}
                      onChange={(e) => handleDayChange(e.target.value)}
                      className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                      title="Pilih tanggal (opsional)"
                    >
                      <option value="">Tgl</option>
                      {days.map((day: string) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    
                    <select
                      value={monthFilter}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                      title="Pilih bulan (opsional)"
                    >
                      <option value="">Bln</option>
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={yearFilter}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                      title="Pilih tahun (opsional)"
                    >
                      <option value="">Thn</option>
                      {years.map((year: number) => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Enhanced rows per page selector */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    Baris per Halaman
                  </label>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm"
                  >
                    <option value={5}>5 baris</option>
                    <option value={10}>10 baris</option>
                    <option value={25}>25 baris</option>
                    <option value={50}>50 baris</option>
                    <option value={100}>100 baris</option>
                  </select>
                </div>

                {/* Filter summary/info */}
                <div className="lg:col-span-4 xl:col-span-1">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-5">
                    <div className="flex flex-wrap gap-2">
                      {statusFilter.length > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Status ({statusFilter.length})
                        </span>
                      )}
                      {serviceFilter.length > 0 && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">
                          Layanan ({serviceFilter.length})
                        </span>
                      )}
                      {searchQuery && (
                        <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs">
                          Pencarian: {searchQuery}
                        </span>
                      )}
                      {(dayFilter || monthFilter || yearFilter) && (
                        <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs">
                          Tanggal: {dayFilter && `${dayFilter}/`}{monthFilter && `${monthFilter}/`}{yearFilter}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}