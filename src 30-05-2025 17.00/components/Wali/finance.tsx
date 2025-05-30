// src/components/Wali/finance.tsx - ENHANCED UI VERSION
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'react-hot-toast';
import { AuthGuard } from '@/components/Common/AuthGuard';
import { usePermissions } from '@/lib/Permissions';

// Import optimized hook
import { useOptimizedOrders } from './hooks/useOptimizedOrders';

// Import lightweight hooks
import { useMobileDetection } from './hooks/useMobileDetection';
import { useLocalStorage } from './hooks/useLocalStorage';

// Import types
import { Order } from './types';

// Import utility functions
const exportToExcelFunc = (): Promise<{ exportToExcel: (orders: Order[], fileName?: string) => Promise<boolean> }> => 
  import('./export').then(mod => mod as any);

// Enhanced Finance-specific components
interface FinanceOrderCardProps {
  order: Order;
  index: number;
  startIndex: number;
}

const FinanceOrderCard: React.FC<FinanceOrderCardProps> = ({ order, index, startIndex }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Service pricing configuration
  const getServicePrice = useCallback((serviceName: string): number => {
    const prices: Record<string, number> = {
      'E-Visa Business Single Entry': 5000000,
      'E-Visa Business Multiple Entry': 7000000,
    };
    return prices[serviceName] || 0;
  }, []);

  // Format currency to Indonesian Rupiah
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    const statusColors: Record<string, string> = {
      'pending_payment': 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-yellow-200',
      'payment_verified': 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-green-200',
      'completed': 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-emerald-200',
      'cancelled': 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-red-200',
      'processing': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-blue-200',
      'document_verification': 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white shadow-indigo-200',
      'pending_document': 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-amber-200',
      'payment_expired': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-200',
    };
    return statusColors[status] || 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-200';
  }, []);

  const getStatusDisplay = useCallback((status: string): string => {
    const statusLabels: Record<string, string> = {
      'pending_payment': 'Pending Payment',
      'payment_verified': 'Payment Verified',
      'document_verification': 'Document Verification',
      'pending_document': 'Pending Document',
      'processing': 'Processing',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'payment_expired': 'Payment Expired',
    };
    return statusLabels[status] || status;
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 mb-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600"
    >
      <div 
        className="flex justify-between items-center cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
              #{startIndex + index + 1}
            </span>
            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
          </div>
          
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {order.name}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 12V11m0 0l-3-3m3 3l3-3" />
            </svg>
            {formatDate(order.created_at)}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full shadow-lg ${getStatusColor(order.status)}`}>
              {getStatusDisplay(order.status)}
            </span>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(getServicePrice(order.service_name))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex flex-col items-end">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      Email
                    </label>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.email}</div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                      Layanan
                    </label>
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{order.service_name}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Nilai Invoice
                    </label>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(getServicePrice(order.service_name))}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Link Pembayaran
                    </label>
                    <div className="text-sm">
                      {order.payment_url ? (
                        <a 
                          href={order.payment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium hover:underline transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Buka Tautan Pembayaran
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic">
                          Belum Tersedia
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
    </motion.div>
  );
};

const FinanceDashboard: React.FC = () => {
  const router = useRouter();
  const permissions = usePermissions();
  
  // State management (keeping existing logic)
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterInitialized, setFilterInitialized] = useState<boolean>(false);
  
  // UI preferences
  const [showFilters, setShowFilters] = useLocalStorage('financeShowFilters', false);
  const { isCardView, setIsCardView } = useMobileDetection();
  
  // Sorting and pagination
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // [Keep all existing useEffect hooks and state management logic exactly as they were]
  // Load filter state from URL or localStorage on component mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      // Try to load from URL parameters first
      const url = new URL(window.location.href);
      
      const statusParam = url.searchParams.get('status');
      const serviceParam = url.searchParams.get('service');
      const dayParam = url.searchParams.get('day');
      const monthParam = url.searchParams.get('month');
      const yearParam = url.searchParams.get('year');
      const dateStartParam = url.searchParams.get('dateStart');
      const dateEndParam = url.searchParams.get('dateEnd');
      const selectedDatesParam = url.searchParams.get('selectedDates');
      const searchParam = url.searchParams.get('search');
      const pageParam = url.searchParams.get('page');
      const rowsParam = url.searchParams.get('rows');
      const sortParam = url.searchParams.get('sortField');
      const orderParam = url.searchParams.get('sortDirection');
      
      // Fall back to localStorage if URL params don't exist
      const savedFilters = localStorage.getItem('financeDashboardFilters');
      const filters = savedFilters ? JSON.parse(savedFilters) : {};
      
      setStatusFilter(statusParam ? statusParam.split(',').filter(Boolean) : filters.statusFilter || []);
      setServiceFilter(serviceParam ? serviceParam.split(',').filter(Boolean) : filters.serviceFilter || []);
      setDayFilter(dayParam || filters.dayFilter || '');
      setMonthFilter(monthParam || filters.monthFilter || '');
      setYearFilter(yearParam || filters.yearFilter || '');
      setDateRangeStart(dateStartParam || filters.dateRangeStart || '');
      setDateRangeEnd(dateEndParam || filters.dateRangeEnd || '');
      setSelectedDates(selectedDatesParam ? selectedDatesParam.split(',').filter(Boolean) : filters.selectedDates || []);
      setSearchQuery(searchParam || filters.searchQuery || '');
      setCurrentPage(pageParam ? parseInt(pageParam, 10) : filters.currentPage || 1);
      setRowsPerPage(rowsParam ? parseInt(rowsParam, 10) : filters.rowsPerPage || 10);
      setSortField(sortParam || filters.sortField || 'created_at');
      setSortDirection((orderParam || filters.sortDirection || 'desc') as 'asc' | 'desc');
      
      setFilterInitialized(true);
    } catch (e) {
      console.error('Error loading saved filters:', e);
      setFilterInitialized(true);
    }
  }, []);

  // Handle filter state persistence with debounce
  useEffect(() => {
    if (!filterInitialized) return;
    
    const debounceTimer = setTimeout(() => {
      const newFilters = {
        statusFilter,
        serviceFilter,
        dayFilter,
        monthFilter,
        yearFilter,
        dateRangeStart,
        dateRangeEnd,
        selectedDates,
        searchQuery,
        currentPage,
        rowsPerPage,
        sortField,
        sortDirection
      };
      
      localStorage.setItem('financeDashboardFilters', JSON.stringify(newFilters));
      
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        
        const updateUrlParam = (name: string, value: string | number | string[] | null): void => {
          if (value && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
            if (Array.isArray(value)) {
              url.searchParams.set(name, value.join(','));
            } else {
              url.searchParams.set(name, String(value));
            }
          } else {
            url.searchParams.delete(name);
          }
        };
        
        updateUrlParam('status', statusFilter.length > 0 ? statusFilter : null);
        updateUrlParam('service', serviceFilter.length > 0 ? serviceFilter : null);
        updateUrlParam('day', dayFilter);
        updateUrlParam('month', monthFilter);
        updateUrlParam('year', yearFilter);
        updateUrlParam('dateStart', dateRangeStart);
        updateUrlParam('dateEnd', dateRangeEnd);
        updateUrlParam('selectedDates', selectedDates.length > 0 ? selectedDates : null);
        updateUrlParam('search', searchQuery);
        updateUrlParam('page', currentPage !== 1 ? currentPage : null);
        updateUrlParam('rows', rowsPerPage !== 10 ? rowsPerPage : null);
        updateUrlParam('sortField', sortField !== 'created_at' ? sortField : null);
        updateUrlParam('sortDirection', sortDirection !== 'desc' ? sortDirection : null);
        
        window.history.replaceState({}, '', url.toString());
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      dateRangeStart, dateRangeEnd, selectedDates, searchQuery, 
      currentPage, rowsPerPage, sortField, sortDirection, filterInitialized]);

  // Reset current page when filters change
  useEffect(() => {
    if (filterInitialized) setCurrentPage(1);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      dateRangeStart, dateRangeEnd, selectedDates, searchQuery, filterInitialized]);

  // Prepare parameters for optimized hook with correct array handling
  const ordersParams = useMemo(() => ({
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    service: serviceFilter.length > 0 ? serviceFilter : undefined,
    search: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
    sortField,
    sortDirection,
    dateFrom: dateRangeStart || undefined,
    dateTo: dateRangeEnd || undefined,
    day: !dateRangeStart && !dateRangeEnd ? dayFilter || undefined : undefined,
    month: !dateRangeStart && !dateRangeEnd ? monthFilter || undefined : undefined,
    year: !dateRangeStart && !dateRangeEnd ? yearFilter || undefined : undefined,
  }), [
    currentPage, rowsPerPage, statusFilter, serviceFilter, searchQuery, 
    sortField, sortDirection, dateRangeStart, dateRangeEnd,
    dayFilter, monthFilter, yearFilter
  ]);

  // Use optimized orders hook
  const {
    orders,
    pagination,
    loading,
    error,
    refetch,
    hasNextPage,
    hasPreviousPage
  } = useOptimizedOrders(ordersParams);

  // Pagination helpers
  const totalPages: number = pagination?.totalPages || 0;
  const startIndex: number = pagination ? (pagination.page - 1) * pagination.limit : 0;

  // [Keep all existing utility functions and handlers exactly as they were]
  // Service pricing configuration
  const getServicePrice = useCallback((serviceName: string): number => {
    const prices: Record<string, number> = {
      'E-Visa Business Single Entry': 5000000,
      'E-Visa Business Multiple Entry': 7000000,
    };
    return prices[serviceName] || 0;
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Excel export handler
  const handleExport = useCallback(async (): Promise<void> => {
    try {
      const exportParams = new URLSearchParams({
        limit: '10000',
        page: '1',
        sortField,
        sortDirection,
      });

      if (statusFilter.length > 0) exportParams.set('status', statusFilter.join(','));
      if (serviceFilter.length > 0) exportParams.set('service', serviceFilter.join(','));
      if (searchQuery) exportParams.set('search', searchQuery);
      if (dateRangeStart) exportParams.set('dateFrom', dateRangeStart);
      if (dateRangeEnd) exportParams.set('dateTo', dateRangeEnd);
      if (dayFilter) exportParams.set('day', dayFilter);
      if (monthFilter) exportParams.set('month', monthFilter);
      if (yearFilter) exportParams.set('year', yearFilter);

      const response = await fetch(`/api/orders/optimized?${exportParams.toString()}`);
      const result = await response.json();
      
      const { exportToExcel } = await exportToExcelFunc();
      const success = await exportToExcel(result.data || [], 'finance_data');
      
      if (success) {
        toast.success('Berhasil mengunduh data pesanan');
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  }, [statusFilter, serviceFilter, searchQuery, dateRangeStart, dateRangeEnd, dayFilter, monthFilter, yearFilter, sortField, sortDirection]);

  // Logout handler
  const handleLogout = useCallback((): void => {
    try {
      localStorage.setItem('logout-in-progress', 'true');
      localStorage.setItem('logout-event', Date.now().toString());
      localStorage.removeItem('user-state');
      sessionStorage.clear();
      window.location.href = '/api/auth/logout?callbackUrl=' + encodeURIComponent('/wall-e?reason=manual_logout');
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/wall-e?reason=error_logout';
    }
  }, []);

  // [Keep all other existing handlers and functions]
  // Sorting handler
  const handleSort = useCallback((field: string): void => {
    setSortDirection(prev => field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : field === 'created_at' ? 'desc' : 'asc');
    setSortField(field);
    setCurrentPage(1);
  }, [sortField]);

  // Multi-select filter handlers
  const handleStatusFilterChange = useCallback((status: string): void => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }, []);

  const handleServiceFilterChange = useCallback((service: string): void => {
    setServiceFilter(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  }, []);

  const handleDateSelection = useCallback((date: string): void => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  }, []);

  const resetFilters = useCallback((): void => {
    setStatusFilter([]);
    setServiceFilter([]);
    setDayFilter('');
    setMonthFilter('');
    setYearFilter('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSelectedDates([]);
    setSearchQuery('');
    setSortField('created_at');
    setSortDirection('desc');
    setRowsPerPage(10);
    setCurrentPage(1);
    
    localStorage.removeItem('financeDashboardFilters');
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  const handlePageChange = useCallback((newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  // Generate filter options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const months = [
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
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const serviceTypes = [
    'E-Visa Business Single Entry',
    'E-Visa Business Multiple Entry'
  ];

  const statusTypes = [
    'pending_payment',
    'payment_verified', 
    'document_verification',
    'pending_document',
    'processing',
    'completed',
    'cancelled',
    'payment_expired'
  ];

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

  // Enhanced sort indicator
  const SortIndicator: React.FC<{ field: string }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <span className="ml-2 inline-block text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <span className="ml-2 inline-block text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </span>
      );
    } else {
      return (
        <span className="ml-2 inline-block text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      );
    }
  };

  const getStatusColor = useCallback((status: string): string => {
    const statusColors: Record<string, string> = {
      'pending_payment': 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-200',
      'payment_verified': 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg shadow-green-200',
      'completed': 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200',
      'cancelled': 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-lg shadow-red-200',
      'processing': 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-200',
      'document_verification': 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white shadow-lg shadow-indigo-200',
      'pending_document': 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200',
      'payment_expired': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-200',
    };
    return statusColors[status] || 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-200';
  }, []);

  const getStatusDisplay = useCallback((status: string): string => {
    const statusLabels: Record<string, string> = {
      'pending_payment': 'Pending Payment',
      'payment_verified': 'Payment Verified',
      'document_verification': 'Document Verification',
      'pending_document': 'Pending Document',
      'processing': 'Processing',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'payment_expired': 'Payment Expired',
    };
    return statusLabels[status] || status;
  }, []);

  return (
    <AuthGuard requiredPermission="canExportData">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full p-4 lg:p-6"
        >
          {/* Enhanced Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6"
          >
            <div className="w-full lg:w-auto flex flex-wrap justify-center lg:justify-start gap-3">
              {permissions.canExportData && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >    
                  <button
                    onClick={handleExport}
                    disabled={orders.length === 0 || loading}
                    className="group relative inline-flex items-center bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    type="button"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Enhanced Logout button */}
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              > 
                <button
                  onClick={handleLogout}
                  className="group relative inline-flex items-center bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  type="button"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Enhanced Error message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-6 rounded-xl mb-6 shadow-lg"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">{error}</p>
                  <button 
                    className="mt-2 text-sm underline hover:no-underline transition-all duration-200" 
                    onClick={() => refetch()}
                    type="button"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
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
                  placeholder="Cari pesanan berdasarkan nama, email, atau layanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm"
                />
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
                  onClick={resetFilters}
                  className="flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:shadow-xl text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </motion.button>
              </div>
            </div>
          </motion.div>
          
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
                      </label>
                      <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-800/50 p-4 backdrop-blur-sm">
                        <div className="grid grid-cols-1 gap-2">
                          {statusTypes.map(status => (
                            <MultiSelectCheckbox
                              key={status}
                              label={status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              checked={statusFilter.includes(status)}
                              onChange={() => handleStatusFilterChange(status)}
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
                        {serviceTypes.map(service => (
                          <MultiSelectCheckbox
                            key={service}
                            label={service}
                            checked={serviceFilter.includes(service)}
                            onChange={() => handleServiceFilterChange(service)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Individual Date Filters */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Filter Tanggal Individual
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={dayFilter}
                          onChange={(e) => setDayFilter(e.target.value)}
                          className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                        >
                          <option value="">Tgl</option>
                          {days.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                        
                        <select
                          value={monthFilter}
                          onChange={(e) => setMonthFilter(e.target.value)}
                          className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                        >
                          <option value="">Bln</option>
                          {months.map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                          ))}
                        </select>
                        
                        <select
                          value={yearFilter}
                          onChange={(e) => setYearFilter(e.target.value)}
                          className="w-1/3 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm"
                        >
                          <option value="">Thn</option>
                          {years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Enhanced Date Range Filter */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Rentang Tanggal
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="w-1/2 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 backdrop-blur-sm"
                          placeholder="Dari"
                        />
                        <input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="w-1/2 border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 backdrop-blur-sm"
                          placeholder="Sampai"
                        />
                      </div>
                    </div>

                    {/* Enhanced Rows per page selector */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        Baris per Halaman
                      </label>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-300 backdrop-blur-sm"
                      >
                        <option value={5}>5 baris</option>
                        <option value={10}>10 baris</option>
                        <option value={25}>25 baris</option>
                        <option value={50}>50 baris</option>
                        <option value={100}>100 baris</option>
                      </select>
                    </div>

                    {/* Quick Date Picker */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        Tambah Tanggal Spesifik
                      </label>
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleDateSelection(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300 backdrop-blur-sm"
                        placeholder="Pilih tanggal"
                      />
                    </div>

                    {/* Enhanced Selected Dates Display */}
                    {selectedDates.length > 0 && (
                      <div className="space-y-3 md:col-span-2 lg:col-span-3 xl:col-span-4">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                          Tanggal Terpilih ({selectedDates.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {selectedDates.map(date => (
                            <motion.span
                              key={date}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="inline-flex items-center px-3 py-2 rounded-full text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                            >
                              {formatDate(date + 'T00:00:00')}
                              <button
                                onClick={() => handleDateSelection(date)}
                                className="ml-2 text-white hover:text-cyan-200 transition-colors"
                                type="button"
                                aria-label={`Remove ${date}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Enhanced Loading state */}
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-12"
            >
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500/30 rounded-full border-t-blue-500"></div>
                <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-500/20 rounded-full"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">Memuat data pesanan...</p>
            </motion.div>
          )}

          {/* Orders content section */}
          {!loading && (
            <div className="container mx-auto max-w-full">
              {orders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 p-12 text-center rounded-2xl shadow-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Tidak ada pesanan yang ditemukan</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Coba ubah kriteria pencarian atau filter</p>
                </motion.div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  {isCardView || (typeof window !== 'undefined' && window.innerWidth < 768) ? (
                    <div className="space-y-4">
                      {orders.map((order, index) => (
                        <FinanceOrderCard key={order.id} order={order} index={index} startIndex={startIndex} />
                      ))}
                    </div>
                  ) : (
                    /* Enhanced Desktop Table View */
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
                    >
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                            <tr>
                              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  No.
                                </div>
                              </th>
                              <th 
                                scope="col" 
                                className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                                onClick={() => handleSort('created_at')}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  Tanggal
                                  <SortIndicator field="created_at" />
                                </div>
                              </th>
                              <th 
                                scope="col" 
                                className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                  Pelanggan
                                  <SortIndicator field="name" />
                                </div>
                              </th>
                              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  Layanan
                                </div>
                              </th>
                              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                  Status
                                </div>
                              </th>
                              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  Nilai Invoice
                                </div>
                              </th>
                              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                                  Link Pembayaran
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/30 dark:divide-gray-700/30 backdrop-blur-sm">
                            {orders.map((order, index) => (
                              <motion.tr 
                                key={order.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all duration-300 group"
                              >
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                      {startIndex + index + 1}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                  <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 12V11m0 0l-3-3m3 3l3-3" />
                                    </svg>
                                    {formatDate(order.created_at)}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                  <div className="space-y-1">
                                    <div className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{order.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                      </svg>
                                      {order.email}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                  <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                                    <div className="font-medium text-blue-900 dark:text-blue-100 text-xs leading-relaxed">
                                      {order.service_name.length > 30 
                                        ? `${order.service_name.substring(0, 30)}...`
                                        : order.service_name
                                      }
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs">
                                  <span className={`inline-flex px-3 py-2 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                    {getStatusDisplay(order.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                                    <div className="font-bold text-green-700 dark:text-green-300">
                                      {formatCurrency(getServicePrice(order.service_name))}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  {order.payment_url ? (
                                    <a 
                                      href={order.payment_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium hover:underline transition-colors group"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      Tautan Pembayaran
                                    </a>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400 italic text-xs">Belum Tersedia</span>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Enhanced Pagination controls */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center mt-8 gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPreviousPage}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm font-medium"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

              <div className="flex gap-2">
                {typeof window !== 'undefined' && window.innerWidth < 640 ? (
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg">
                    {currentPage} / {totalPages}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <motion.button
                          key={page}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                              : 'border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg backdrop-blur-sm'
                          }`}
                          type="button"
                        >
                          {page}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 backdrop-blur-sm font-medium"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </motion.div>
          )}

          {/* Enhanced Display results info */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-6"
          >
            {pagination && (
              <div className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Menampilkan <span className="font-bold text-blue-600 dark:text-blue-400">{orders.length}</span> dari{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400">{pagination.total}</span> pesanan
                  (Halaman <span className="font-bold">{pagination.page}</span> dari <span className="font-bold">{pagination.totalPages}</span>)
                </div>
                {orders.length > 0 && (
                  <div className="mt-3 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Total Nilai: {formatCurrency(
                      orders.reduce((total, order) => total + getServicePrice(order.service_name), 0)
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Enhanced Floating action button for mobile */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="md:hidden fixed bottom-6 right-6 z-50"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-all duration-300"
              type="button"
              aria-label="Scroll to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </AuthGuard>
  );
};

export default FinanceDashboard;