"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/sb_client';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'react-hot-toast';
import { exportToExcel } from './export';
import { StatusBadge } from './status';
import { AuthGuard } from '@/components/Common/AuthGuard';
import { usePermissions } from '@/lib/Permissions';
import { OrderStatus } from '@/lib/order';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function FinanceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use localStorage for UI preferences only
  const [showFilters, setShowFilters] = useLocalStorage('financeShowFilters', false);
  const [isCardView, setIsCardView] = useLocalStorage('financeCardView', false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Filter state - Changed to use localStorage persistence like wali.tsx
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterInitialized, setFilterInitialized] = useState(false);

  // interface definitions
  interface Order {
    id: string;
    name: string;
    email: string;
    service_name: string;
    invoice_id: string | null;
    payment_url: string | null;
    document_path: string | null;
    result_file_path?: string | null;
    status: OrderStatus;
    created_at: string;
    revision_message?: string | null;
    note?: string | null;
  }

  // Load filter state from URL or localStorage - Similar to wali.tsx
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
      
      // Set filters with URL parameters taking precedence
      setStatusFilter(statusParam ? statusParam.split(',').filter(Boolean) : filters.statusFilter || []);
      setServiceFilter(serviceParam ? serviceParam.split(',').filter(Boolean) : filters.serviceFilter || []);
      setDayFilter(dayParam || filters.dayFilter || '');
      setMonthFilter(monthParam || filters.monthFilter || '');
      setYearFilter(yearParam || filters.yearFilter || '');
      setDateRangeStart(dateStartParam || filters.dateRangeStart || '');
      setDateRangeEnd(dateEndParam || filters.dateRangeEnd || '');
      setSelectedDates(selectedDatesParam ? selectedDatesParam.split(',').filter(Boolean) : filters.selectedDates || []);
      setSearchQuery(searchParam || filters.searchQuery || '');
      setCurrentPage(pageParam ? parseInt(pageParam) : filters.currentPage || 1);
      setRowsPerPage(rowsParam ? parseInt(rowsParam) : filters.rowsPerPage || 10);
      setSortField(sortParam || filters.sortField || 'created_at');
      setSortDirection((orderParam || filters.sortDirection || 'desc') as 'asc' | 'desc');
      
      // Mark filters as initialized after loading
      setFilterInitialized(true);
    } catch (e) {
      console.error('Error loading saved filters:', e);
      setFilterInitialized(true);
    }
  }, []);

  // Handle filter state persistence with debounce - Similar to wali.tsx  
  useEffect(() => {
    if (!filterInitialized) return;
    
    // Use debounce to avoid excessive saves
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
      
      // Save to localStorage
      localStorage.setItem('financeDashboardFilters', JSON.stringify(newFilters));
      
      // Update URL parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        
        const updateUrlParam = (name: string, value: string | number | string[] | null) => {
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
    }, 300); // 300ms debounce
    
    return () => clearTimeout(debounceTimer);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      dateRangeStart, dateRangeEnd, selectedDates, searchQuery, 
      currentPage, rowsPerPage, sortField, sortDirection, filterInitialized]);

  // Reset current page when filters change
  useEffect(() => {
    if (filterInitialized) setCurrentPage(1);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      dateRangeStart, dateRangeEnd, selectedDates, searchQuery, filterInitialized]);

  // Service pricing configuration
  const getServicePrice = (serviceName: string): number => {
    const prices: Record<string, number> = {
      'E-Visa Business Single Entry': 5000000,
      'E-Visa Business Multiple Entry': 7000000,
    };
    return prices[serviceName] || 0;
  };

  // Format currency to Indonesian Rupiah
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check for mobile view on component mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      if (window.innerWidth < 768 && !isCardView) {
        setIsCardView(true);
      }
    };
    
    // Initial check
    checkMobileView();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobileView);
  }, [isCardView, setIsCardView]);

  // excel export
  const handleExport = async () => {
    try {
      const success = await exportToExcel(filteredOrders, 'finance_data');
      if (success) {
        toast.success('Berhasil mengunduh data pesanan');
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  };

  // sorting functions
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const sortOrders = useCallback((orders: Order[]) => {
    return [...orders].sort((a, b) => {
      if (sortField === 'name') {
        // Case insensitive name comparison
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortField === 'created_at') {
        // Date comparison
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  }, [sortField, sortDirection]);

  // Multi-select filter handlers
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleServiceFilterChange = (service: string) => {
    setServiceFilter(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleDateSelection = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  // Reset filters function - clears localStorage
  const resetFilters = () => {
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
    
    // Clear localStorage filters
    localStorage.removeItem('financeDashboardFilters');
    
    // Clear URL parameters
    router.replace(window.location.pathname, { scroll: false });
  };

  // log out - filters persist in localStorage (same as wali.tsx)
  const handleLogout = useCallback(() => {
    try {
      localStorage.setItem('logout-in-progress', 'true');
      localStorage.setItem('logout-event', Date.now().toString());
      localStorage.removeItem('user-state');
      sessionStorage.clear();
      // Don't remove filter preferences - they should persist
      window.location.href = '/api/auth/logout?callbackUrl=' + encodeURIComponent('/wall-e?reason=manual_logout');
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/wall-e?reason=error_logout';
    }
  }, []);

  // Toggle card expansion for mobile view
  const toggleCardExpansion = (orderId: string) => {
    if (expandedCardId === orderId) {
      setExpandedCardId(null);
    } else {
      setExpandedCardId(orderId);
    }
  };

  // data loading
  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabaseClient
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setOrders(data || []);
        setFilteredOrders(data || []);
      } catch (err: any) {
        setError(err.message || "Gagal mengambil data pesanan");
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, []);

  // real-time subscription setup
  useEffect(() => {
    let channel;
    
    try {
      // Create the channel
      channel = supabaseClient
        .channel('orders-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setOrders(currentOrders => {
                const newOrder = payload.new as Order;
                if (currentOrders.some(order => order.id === newOrder.id)) {
                  return currentOrders;
                }
                const updatedOrders = [newOrder, ...currentOrders];
                return updatedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              });
            }
            
            if (payload.eventType === 'UPDATE') {
              setOrders(currentOrders => 
                currentOrders.map(order => 
                  order.id === payload.new.id ? payload.new as Order : order
                )
              );
            }
            
            if (payload.eventType === 'DELETE') {
              setOrders(currentOrders => 
                currentOrders.filter(order => order.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe(); // call subscribe directly
        
    } catch (err) {
      setError("Failed to set up real-time updates. Please refresh the page to try again.");
    }
        
    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);
  
  // filter and sort effects
  useEffect(() => {
    let result = [...orders];
    
    // Apply status filter (multi-select)
    if (statusFilter.length > 0) {
      result = result.filter(order => statusFilter.includes(order.status));
    }
    
    // Apply service filter (multi-select)
    if (serviceFilter.length > 0) {
      result = result.filter(order => serviceFilter.includes(order.service_name));
    }
    
    // Apply individual date filters
    if (dayFilter || monthFilter || yearFilter) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderDay = orderDate.getDate().toString().padStart(2, '0');
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = orderDate.getFullYear().toString();
        
        return (!dayFilter || orderDay === dayFilter) &&
              (!monthFilter || orderMonth === monthFilter) &&
              (!yearFilter || orderYear === yearFilter);
      });
    }
    
    // Apply date range filter
    if (dateRangeStart && dateRangeEnd) {
      const startDate = new Date(dateRangeStart);
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
    
    // Apply specific dates filter
    if (selectedDates.length > 0) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderDateString = orderDate.toISOString().split('T')[0];
        return selectedDates.includes(orderDateString);
      });
    }
    
    // Apply search query (search in all fields)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.name.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.service_name.toLowerCase().includes(query) ||
        (order.invoice_id && order.invoice_id.toLowerCase().includes(query)) ||
        order.status.toLowerCase().includes(query) ||
        (order.note && order.note.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    result = sortOrders(result);
    
    setFilteredOrders(result);
  }, [orders, statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, dateRangeStart, dateRangeEnd, selectedDates, searchQuery, sortField, sortDirection, sortOrders]);

  // date format to DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // sort indicator
  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return (
        <span className="ml-1 inline-block text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <span className="ml-1 inline-block text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </span>
      );
    } else {
      return (
        <span className="ml-1 inline-block text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      );
    }
  };

  // calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  // Ensure currentPage is within valid range
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // generate filter options
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
  
  // generate pagination buttons
  const paginationButtons: React.ReactNode[] = [];
  const maxButtons = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    paginationButtons.push(
      <button
        key="first"
        onClick={() => setCurrentPage(1)}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        1
      </button>
    );
    
    if (startPage > 2) {
      paginationButtons.push(
        <span key="ellipsis1" className="px-3 py-1">...</span>
      );
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationButtons.push(
      <button
        key={i}
        onClick={() => setCurrentPage(i)}
        className={`px-3 py-1 rounded border ${
          currentPage === i
            ? 'bg-blue-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {i}
      </button>
    );
  }

if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationButtons.push(
        <span key="ellipsis2" className="px-3 py-1">...</span>
      );
    }
    
    paginationButtons.push(
      <button
        key="last"
        onClick={() => setCurrentPage(totalPages)}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {totalPages}
      </button>
    );
  }

  // Multi-select checkbox component
  const MultiSelectCheckbox = ({ 
    label, 
    checked, 
    onChange 
  }: { 
    label: string; 
    checked: boolean; 
    onChange: () => void; 
  }) => (
    <label className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-3 w-3 text-blue-600"
      />
      <span className="text-gray-700 dark:text-gray-300 text-xs">{label}</span>
    </label>
  );

  // Order card component for mobile view
  const OrderCard = ({ order, index }: { order: Order, index: number }) => {
    const isExpanded = expandedCardId === order.id;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
      >
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleCardExpansion(order.id)}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                #{startIndex + index + 1}
              </span>
            </div>
            <h3 className="font-medium mt-1">{order.name}</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(order.created_at)}
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <StatusBadge status={order.status} />
            <div className="mt-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="text-sm">{order.email}</div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Layanan
                </label>
                <div className="text-sm">{order.service_name}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nilai Invoice
                </label>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(getServicePrice(order.service_name))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice
                </label>
                <div className="text-sm">
                  {order.payment_url ? (
                    <a 
                      href={order.payment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Tautan Pembayaran
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Belum Ada Invoice
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AuthGuard requiredPermission="canExportData">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full p-2"
      >
{/* Header with responsive layout */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="w-full sm:w-auto flex flex-wrap justify-center sm:justify-start gap-2">
            {permissions.canExportData && (
              <motion.div 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
              >    
                <button
                  onClick={handleExport}
                  disabled={filteredOrders.length === 0 || loading}
                  className="flex items-center bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export Excel</span>
                  <span className="sm:hidden">Export</span>
                </button>
              </motion.div>
            )}
            
            {/* View toggle button for mobile */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:hidden"
            >
              <button
                onClick={() => setIsCardView(!isCardView)}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                {isCardView ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span>Table View</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    </svg>
                    <span>Card View</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>

          {/* User role badge and logout button */}
          <div className="flex items-center gap-2">
            <motion.div 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5 }}
            > 
              <button
                onClick={handleLogout}
                className="flex items-center bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </motion.div>
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded mb-4"
          >
            {error}
            <button 
              className="ml-2 text-sm underline" 
              onClick={() => setError(null)}
            >
              Tutup
            </button>
          </motion.div>
        )}
        
        {/* Compact Search and Filter Toggle Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Search bar */}
            <div className="relative w-full md:w-1/2">
              <input
                type="text"
                placeholder="Cari pesanan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-2 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex gap-2 w-full md:w-auto">
              {/* Toggle filters button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center px-4 py-2 rounded text-sm transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : 'rotate-0'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Reset filters button */}
              <button
                onClick={resetFilters}
                className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Collapsible Advanced Filters Section */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  
                  {/* Status Filter - Multi-select - Full Height */}
                  <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status ({statusFilter.length} dipilih)
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-2">
                      <div className="grid grid-cols-2 gap-1">
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

                  {/* Service Filter - Multi-select */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Layanan ({serviceFilter.length} dipilih)
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-2">
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

                  {/* Individual Date Filters */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Tanggal Individual
                    </label>
                    <div className="flex space-x-1">
                      <select
                        value={dayFilter}
                        onChange={(e) => {
                          setDayFilter(e.target.value);
                        }}
                        className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Tgl</option>
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      
                      <select
                        value={monthFilter}
                        onChange={(e) => {
                          setMonthFilter(e.target.value);
                        }}
                        className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Bln</option>
                        {months.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                      
                      <select
                        value={yearFilter}
                        onChange={(e) => {
                          setYearFilter(e.target.value);
                        }}
                        className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Thn</option>
                        {years.map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rentang Tanggal
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => {
                          setDateRangeStart(e.target.value);
                        }}
                        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100"
                        placeholder="Dari"
                      />
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => {
                          setDateRangeEnd(e.target.value);
                        }}
                        className="w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100"
                        placeholder="Sampai"
                      />
                    </div>
                  </div>

                  {/* Rows per page selector */}
                  <div className="space-y-2 md:col-start-1 lg:col-start-auto">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Baris per Halaman
                    </label>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5 baris</option>
                      <option value={10}>10 baris</option>
                      <option value={25}>25 baris</option>
                      <option value={50}>50 baris</option>
                      <option value={100}>100 baris</option>
                    </select>
                  </div>

                  {/* Quick Date Picker - Only show input field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100"
                      placeholder="Pilih tanggal"
                    />
                  </div>

                  {/* Specific Date Selection - Only show when dates are selected */}
                  {selectedDates.length > 0 && (
                    <div className="space-y-2 md:col-span-2 lg:col-span-3 xl:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tanggal Terpilih ({selectedDates.length})
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {selectedDates.map(date => (
                          <span
                            key={date}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          >
                            {formatDate(date + 'T00:00:00')}
                            <button
                              onClick={() => handleDateSelection(date)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Orders content section - Table or Cards view depending on screen size */}
        <div className="container mx-auto max-w-full">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 p-6 text-center rounded">
              <p className="text-gray-500 dark:text-gray-400">Tidak ada pesanan yang ditemukan</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              {isCardView || (typeof window !== 'undefined' && window.innerWidth < 768) ? (
                <div className="space-y-4">
                  {paginatedOrders.map((order, index) => (
                    <OrderCard key={order.id} order={order} index={index} />
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">No.</th>
                          <th 
                            scope="col" 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-24"
                            onClick={() => handleSort('created_at')}
                          >
                            Tanggal
                            <SortIndicator field="created_at" />
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-48"
                            onClick={() => handleSort('name')}
                          >
                            Pelanggan
                            <SortIndicator field="name" />
                          </th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-56">Layanan</th>
                          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Status</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Nilai Invoice</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">Link Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedOrders.map((order, index) => (
                          <motion.tr 
                            key={order.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{order.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{order.email}</div>
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-900 dark:text-gray-100">
                              <div className="max-w-xs truncate text-xs">{order.service_name}</div>
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(getServicePrice(order.service_name))}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              {order.payment_url ? (
                                <a 
                                  href={order.payment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Tautan Pembayaran
                                </a>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400">Belum Tersedia</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Responsive pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>

            {/* On mobile, show fewer pagination buttons */}
            <div className="flex gap-1">
              {typeof window !== 'undefined' && window.innerWidth < 640 ? (
                // Simplified pagination for mobile
                <>
                  <span className="px-3 py-1 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                </>
              ) : (
                // Full pagination for desktop
                <>{paginationButtons}</>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage < totalPages ? currentPage + 1 : totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        )}

        {/* Display number of results - responsive text */}
        <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
          Menampilkan {paginatedOrders.length} dari {filteredOrders.length} pesanan
          {filteredOrders.length > 0 && (
            <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
              Total Nilai: {formatCurrency(
                filteredOrders.reduce((total, order) => total + getServicePrice(order.service_name), 0)
              )}
            </div>
          )}
        </div>

        {/* Floating action button for mobile - Quick actions */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AuthGuard>
  );
}