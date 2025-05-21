  //E:\kp\New folder\src\components\Wali\wali2.tsx
  "use client"
  import React, { useEffect, useState, useCallback } from 'react';
  import { supabaseClient } from '@/lib/sb_client';
  import { motion } from "framer-motion";
  import { useSession } from 'next-auth/react';
  import { toast } from 'react-hot-toast';
  import { exportToExcel } from './export';
  import { StatusBadge } from './status';
  import { AuthGuard } from '@/components/Common/AuthGuard';
  import { usePermissions } from '@/lib/Permissions';
  import { OrderStatus } from '@/lib/order';


  export default function FinanceDashboard() {
    const permissions = usePermissions();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [dayFilter, setDayFilter] = useState<string>('');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [yearFilter, setYearFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Cards view state for mobile
    const [isCardView, setIsCardView] = useState<boolean>(false);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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

    // Check for mobile view on component mount and window resize
    useEffect(() => {
      const checkMobileView = () => {
        setIsCardView(window.innerWidth < 768);
      };
      
      // Initial check
      checkMobileView();
      
      // Add event listener for window resize
      window.addEventListener('resize', checkMobileView);
      
      // Clean up event listener
      return () => window.removeEventListener('resize', checkMobileView);
    }, []);

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

    // reset filters function
    const resetFilters = () => {
      setStatusFilter('all');
      setServiceFilter('all');
      setDayFilter('');
      setMonthFilter('');
      setYearFilter('');
      setSearchQuery('');
    };

    // log out
    const handleLogout = () => {
      try {
        // Set flags for cross-tab synchronization
        localStorage.setItem('logout-in-progress', 'true');
        localStorage.setItem('logout-event', Date.now().toString());
        
        // Clear any stored user data
        localStorage.removeItem('user-state');
        sessionStorage.clear();
        
        // Use our custom logout endpoint that directly clears cookies
        window.location.href = '/api/auth/logout?callbackUrl=' + encodeURIComponent('/wall-e?reason=manual_logout');
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback to redirect
        window.location.href = '/wall-e?reason=error_logout';
      }
    };

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
      
      // Apply status filter
      if (statusFilter !== 'all') {
        result = result.filter(order => order.status === statusFilter);
      }
      
      // Apply service filter
      if (serviceFilter !== 'all') {
        result = result.filter(order => 
          order.service_name === serviceFilter
        );
      }
      
      // Apply date filters
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
          (order.note && order.note.toLowerCase().includes(query)) // tambahkan pencarian pada note
        );
      }
      
      // Apply sorting
      result = sortOrders(result);
      
      setFilteredOrders(result);
      setCurrentPage(1); // Reset to first page when filters change
    }, [orders, statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, searchQuery, sortField, sortDirection, sortOrders]);

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
      { value: 'all', label: 'Semua Layanan' },
      { value: 'E-Visa Business Single Entry', label: 'E-Visa Business Single Entry' },
      { value: 'E-Visa Business Multiple Entry', label: 'E-Visa Business Multiple Entry' }
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
                <span className="font-mono text-xs">
                  {order.id.slice(0, 6)}...
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
                    Invoice
                  </label>
                  <div className="text-sm">
                    {order.invoice_id ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {order.invoice_id}
                        </span>
                        {order.payment_url && (
                          <a 
                            href={order.payment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Tautan Pembayaran
                          </a>
                        )}
                      </div>
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
          
          {/* Search bar and filters section - Responsive layout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
              {/* Search bar */}
              <div className="relative w-full md:w-1/3 mb-2 md:mb-0">
                <input
                  type="text"
                  placeholder="Cari pesanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-2 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Reset filters button */}
              <button
                onClick={resetFilters}
                className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded text-sm w-full md:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filter
              </button>
            </div>
            
  {/* Filters grid - Responsive layout */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status filter */}
              <div className="relative">
                <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending_payment">Pending Payment</option>
                  <option value="payment_verified">Payment Verified</option>
                  <option value="document_verification">Document Verification</option>
                  <option value="pending_document">Pending Document</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="payment_expired">Payment Expired</option>
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Service filter */}
              <div className="relative">
                <label htmlFor="service-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter Layanan
                </label>
                <select
                  id="service-filter"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {serviceTypes.map(service => (
                    <option key={service.value} value={service.value}>{service.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Date filters */}
              <div className="relative">
                <label htmlFor="day-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filter Tanggal
                </label>
                <div className="flex space-x-1">
                  <select
                    id="day-filter"
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tgl</option>
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  
                  <select
                    id="month-filter"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Bln</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  
                  <select
                    id="year-filter"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-1/3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Thn</option>
                    {years.map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>    
              {/* Rows per page selector */}
              <div className="relative">
                <label htmlFor="rows-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Baris per Halaman
                </label>
                <select
                  id="rows-filter"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing rows per page
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value={5}>5 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={25}>25 baris</option>
                  <option value={50}>50 baris</option>
                  <option value={100}>100 baris</option>
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-2 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
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
                {isCardView || window.innerWidth < 768 ? (
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
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">ID Pesanan</th>
                            <th 
                              scope="col" 
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-10"
                              onClick={() => handleSort('created_at')}
                            >
                              Tanggal
                              <SortIndicator field="created_at" />
                            </th>
                            <th 
                              scope="col" 
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 w-10"
                              onClick={() => handleSort('name')}
                            >
                              Pelanggan
                              <SortIndicator field="name" />
                            </th>
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">Layanan</th>
                            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">Status</th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">Invoice</th>
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
                              <td className="px-2 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                                {order.id.slice(0, 6)}...
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
                              
                              <td className="px-3 py-3 text-sm">
                                {order.invoice_id ? (
                                  <div className="flex flex-col">
                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{order.invoice_id}</span>
                                    {order.payment_url && (
                                      <a 
                                        href={order.payment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        Tautan Pembayaran
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Belum Ada Invoice</span>
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
                {window.innerWidth < 640 ? (
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
          </div>

          {/* Floating action button for mobile - Quick actions */}
          <div className="md:hidden fixed bottom-6 right-6">
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