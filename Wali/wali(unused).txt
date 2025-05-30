// src/components/Wali/wali.tsx - FIXED VERSION
"use client"
import React, { useState, useCallback, Suspense, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { OrderStatus } from '@/lib/order';
import { usePermissions } from '@/lib/Permissions';
import { AuthGuard } from '@/components/Common/AuthGuard';
import dynamic from 'next/dynamic';
import { motion } from "framer-motion";

// Import optimized hook
import { useOptimizedOrders } from './hooks/useOptimizedOrders';

// Import core essential types
import { Order, StatusChangeRequest } from './types';

// Import lightweight hooks
import { useMobileDetection } from './hooks/useMobileDetection';
import { useLocalStorage } from './hooks/useLocalStorage';

// Dynamically import heavy components
const DashboardHeader = dynamic(() => import('./components/DashboardHeader'), {
  loading: () => <div className="w-full h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>,
  ssr: false
});

const FiltersPanel = dynamic(() => import('./components/FiltersPanel'), {
  loading: () => <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-4"></div>,
  ssr: false
});

const OrdersTable = dynamic(() => import('./components/OrdersTable'), {
  loading: () => <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-4"></div>,
  ssr: false
});

const OrderCards = dynamic(() => import('./components/OrderCards'), {
  loading: () => <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-4"></div>,
  ssr: false
});

// Modal components - load only when needed
const StatusChangeModal = dynamic(() => import('./modals/StatusChangeModal'));
const DeleteOrderModal = dynamic(() => import('./modals/DeleteOrderModal'));
const DeleteResultModal = dynamic(() => import('./modals/DeleteResultModal'));
const RevisionRequestModal = dynamic(() => import('./modals/RevisionRequestModal'));
const AddAdminModal = dynamic(() => import('./components/addadmin'));
const ColumnSettingsModal = dynamic(() => import('./modals/ColumnSettingsModal'));

// Utility imports
const exportToExcelFunc = () => import('./export').then(mod => mod.exportToExcel);

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const permissions = usePermissions();
  
  // FIXED: Filter state - Change to support both single and multi-select
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterInitialized, setFilterInitialized] = useState(false);
  
  // Editing states
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [uploadingResultFor, setUploadingResultFor] = useState<string | null>(null);
  
  // Form data
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    service_name: '',
    note: ''
  });
  
  // Modal states
  const [pendingStatusChange, setPendingStatusChange] = useState<StatusChangeRequest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingDeleteResult, setPendingDeleteResult] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [selectedOrderForRevision, setSelectedOrderForRevision] = useState<string | null>(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState<boolean>(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // UI preferences
  const { isCardView, setIsCardView } = useMobileDetection();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useLocalStorage('adminDashboardColumns', {
    number: true,
    id: true,
    date: true,
    customer: true,
    service: true,
    status: true,
    note: true,
    invoice: true,
    result: true,
    downloadPassword: true,
    actions: true
  });

  // Sorting and pagination
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // FIXED: Load filter state from URL or localStorage on component mount
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
      const searchParam = url.searchParams.get('search');
      const pageParam = url.searchParams.get('page');
      const rowsParam = url.searchParams.get('rows');
      const sortParam = url.searchParams.get('sort');
      const orderParam = url.searchParams.get('order');
      
      // Fall back to localStorage if URL params don't exist
      const savedFilters = localStorage.getItem('adminDashboardFilters');
      const filters = savedFilters ? JSON.parse(savedFilters) : {};
      
      // Set filters with URL parameters taking precedence
      setStatusFilter(statusParam || filters.status || 'all');
      setServiceFilter(serviceParam || filters.service || 'all');
      setDayFilter(dayParam || filters.day || '');
      setMonthFilter(monthParam || filters.month || '');
      setYearFilter(yearParam || filters.year || '');
      setSearchQuery(searchParam || filters.search || '');
      setCurrentPage(pageParam ? parseInt(pageParam) : filters.page || 1);
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

  // FIXED: Handle filter state persistence with debounce for better performance
  useEffect(() => {
    if (!filterInitialized) return;
    
    // Use debounce to avoid excessive URL updates
    const debounceTimer = setTimeout(() => {
      const newFilters = {
        status: statusFilter,
        service: serviceFilter,
        day: dayFilter,
        month: monthFilter,
        year: yearFilter,
        search: searchQuery,
        page: currentPage,
        rowsPerPage,
        sortField,
        sortDirection
      };
      
      // Save to localStorage
      localStorage.setItem('adminDashboardFilters', JSON.stringify(newFilters));
      
      // Update URL parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        
        const updateUrlParam = (name: string, value: string | number | null) => {
          if (value && value !== '' && value !== 'all') {
            url.searchParams.set(name, String(value));
          } else {
            url.searchParams.delete(name);
          }
        };
        
        updateUrlParam('status', statusFilter !== 'all' ? statusFilter : null);
        updateUrlParam('service', serviceFilter !== 'all' ? serviceFilter : null);
        updateUrlParam('day', dayFilter);
        updateUrlParam('month', monthFilter);
        updateUrlParam('year', yearFilter);
        updateUrlParam('search', searchQuery);
        updateUrlParam('page', currentPage !== 1 ? currentPage : null);
        updateUrlParam('rows', rowsPerPage !== 10 ? rowsPerPage : null);
        updateUrlParam('sort', sortField !== 'created_at' ? sortField : null);
        updateUrlParam('order', sortDirection !== 'desc' ? sortDirection : null);
        
        window.history.replaceState({}, '', url.toString());
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(debounceTimer);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      searchQuery, currentPage, rowsPerPage, sortField, sortDirection, filterInitialized]);

  // Reset current page when filters change
  useEffect(() => {
    if (filterInitialized) setCurrentPage(1);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, searchQuery, filterInitialized]);

  // FIXED: Prepare parameters for optimized hook with correct format
  const ordersParams = useMemo(() => ({
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter !== 'all' ? [statusFilter] : undefined,
    service: serviceFilter !== 'all' ? [serviceFilter] : undefined,
    search: searchQuery || undefined,
    sortField,
    sortDirection,
    day: dayFilter || undefined,
    month: monthFilter || undefined,
    year: yearFilter || undefined,
  }), [currentPage, rowsPerPage, statusFilter, serviceFilter, searchQuery, sortField, sortDirection, dayFilter, monthFilter, yearFilter]);

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
  const totalPages = pagination?.totalPages || 0;
  const startIndex = pagination ? (pagination.page - 1) * pagination.limit : 0;

  // Handle form data changes
  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Start editing an order
  const startEditing = useCallback((order: Order) => {
    if (!permissions.canEditOrders) return;
    setEditingOrder(order.id);
    setEditFormData({
      name: order.name,
      email: order.email,
      service_name: order.service_name,
      note: order.note || ''
    });
  }, [permissions.canEditOrders]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingOrder(null);
  }, []);

  // Start editing note
  const startEditingNote = useCallback((order: Order) => {
    if (!permissions.canEditOrders) return;
    setEditingNote(order.id);
    setNoteText(order.note || '');
  }, [permissions.canEditOrders]);

  // Save note
  const saveNote = useCallback(async (orderId: string) => {
    if (!permissions.canEditOrders) return;
    try {
      const response = await fetch('/api/update-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, note: noteText }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save note');
      }
      
      setEditingNote(null);
      toast.success('Catatan berhasil disimpan');
      refetch(); // Refresh data
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
      console.error('Error saving note:', err);
    }
  }, [noteText, permissions.canEditOrders, refetch]);

  // Cancel editing note
  const cancelEditingNote = useCallback(() => {
    setEditingNote(null);
    setNoteText('');
  }, []);

  // Multiple column update
  const updateMultipleColumns = useCallback((columnsSettings: any) => {
    setVisibleColumns(columnsSettings);
  }, [setVisibleColumns]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, [setVisibleColumns]);

  // Upload file related functions
  const startUploadingResultFileOnly = useCallback((orderId: string) => {
    setUploadingResultFor(orderId);
  }, []);

  const cancelUploadingResult = useCallback(() => {
    setUploadingResultFor(null);
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback((orderId: string, newStatus: OrderStatus) => {
    if (!permissions.canChangeStatus) return;
    setPendingStatusChange({ orderId, newStatus });
  }, [permissions.canChangeStatus]);
  
  const confirmStatusChange = useCallback(async () => {
    if (!permissions.canChangeStatus || !pendingStatusChange) return;
    
    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: pendingStatusChange.orderId,
          newStatus: pendingStatusChange.newStatus
        }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update status');
      }
      
      toast.success("Status berhasil diperbarui");
      refetch(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setPendingStatusChange(null);
    }
  }, [pendingStatusChange, permissions.canChangeStatus, refetch]);
  
  const cancelStatusChange = useCallback(() => {
    setPendingStatusChange(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('status_change_canceled'));
    }
  }, []);

  // Order deletion
  const handleDeleteOrder = useCallback((orderId: string) => {
    if (!permissions.canDeleteOrders) return;
    setPendingDelete(orderId);
  }, [permissions.canDeleteOrders]);

  const confirmDeleteOrder = useCallback(async () => {
    if (!permissions.canDeleteOrders || !pendingDelete) return;
    
    try {
      const response = await fetch('/api/delete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pendingDelete }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete order');
      }
      
      toast.success("Berhasil dihapus");
      refetch(); // Refresh data
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pesanan");
    }
  }, [pendingDelete, permissions.canDeleteOrders, refetch]);

  const cancelDeleteOrder = useCallback(() => {
    setPendingDelete(null);
  }, []);

  // Result file deletion
  const handleDeleteResultFile = useCallback((orderId: string) => {
    if (!permissions.canEditOrders) return;
    setPendingDeleteResult(orderId);
  }, [permissions.canEditOrders]);

  const confirmDeleteResultFile = useCallback(async () => {
    if (!permissions.canEditOrders || !pendingDeleteResult) return;
    
    try {
      const response = await fetch('/api/delete-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pendingDeleteResult }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus file hasil');
      }
      
      toast.success("File hasil berhasil dihapus");
      refetch(); // Refresh data
      setPendingDeleteResult(null);
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus file hasil");
    }
  }, [pendingDeleteResult, permissions.canEditOrders, refetch]);

  const cancelDeleteResultFile = useCallback(() => {
    setPendingDeleteResult(null);
  }, []);

  // Save order changes
  const saveOrderChanges = useCallback(async (orderId: string) => {
    if (!permissions.canEditOrders) return;
    try {
      const response = await fetch('/api/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          data: {
            name: editFormData.name,
            email: editFormData.email,
            service_name: editFormData.service_name,
            note: editFormData.note,
            updated_at: new Date().toISOString()
          }
        }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update order');
      }
      
      setEditingOrder(null);
      toast.success("Berhasil diperbarui");
      refetch(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui pesanan");
    }
  }, [editFormData, permissions.canEditOrders, refetch]);

  // Document revision request
  const [selectedOrderLanguage, setSelectedOrderLanguage] = useState<string>('en');

  const requestDocumentRevision = useCallback((orderId: string) => {
    if (!permissions.canRequestRevision) return;
    const orderData = orders.find(order => order.id === orderId);
    
    if (orderData) {
      setSelectedOrderForRevision(orderId);
      setSelectedOrderLanguage(orderData.language || 'en');
      setShowRevisionModal(true);
    } else {
      toast.error("Order tidak ditemukan");
    }
  }, [orders, permissions.canRequestRevision]);

  const saveRevisionRequest = useCallback(async (orderId: string, message: string) => {
    if (!permissions.canRequestRevision) return;
    try {
      const response = await fetch('/api/save-revision-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, revisionMessage: message }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save revision request');
      }
      
      setShowRevisionModal(false);
      setSelectedOrderForRevision(null);
      toast.success("Permintaan revisi berhasil dikirim");
      refetch(); // Refresh data
    } catch (err: any) {
      toast.error(err.message || "Failed to send revision request");
    }
  }, [permissions.canRequestRevision, refetch]);

  const cancelRevisionRequest = useCallback(() => {
    setShowRevisionModal(false);
    setSelectedOrderForRevision(null);
  }, []);

  // View document
  const viewDocument = useCallback((orderId: string) => {
    try {
      window.open(`/api/documents/${orderId}?timestamp=${Date.now()}`, '_blank');
    } catch (err: any) {
      toast.error(`Gagal membuka dokumen: ${err.message || "Kesalahan tidak diketahui"}`);
    }
  }, []);

  // View result file
  const viewResultFile = useCallback(async (orderId: string) => {
    try {
      window.open(`/api/view-result/${orderId}`, '_blank');
    } catch (error) {
      console.error('Error viewing result file:', error);
      toast.error('Gagal membuka file hasil');
    }
  }, []);

  // Update UI after successful file upload
  const handleResultFileUpload = useCallback((orderId: string, filePath: string) => {
    // Exit edit mode if active
    if (editingOrder === orderId) {
      setEditingOrder(null);
    }
    
    toast.success("File berhasil diunggah");
    refetch(); // Refresh data
  }, [editingOrder, refetch]);

  // Sorting handler
  const handleSort = useCallback((field: string) => {
    setSortDirection(prev => field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : field === 'created_at' ? 'desc' : 'asc');
    setSortField(field);
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [sortField]);

  // FIXED: Reset filters function - clears localStorage
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setServiceFilter('all');
    setDayFilter('');
    setMonthFilter('');
    setYearFilter('');
    setSearchQuery('');
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
    
    // Clear localStorage filters
    localStorage.removeItem('adminDashboardFilters');
    
    // Clear URL parameters
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  // Excel export handler
  const handleExport = useCallback(async () => {
    try {
      // For export, we need all filtered data, not just current page
      const exportParams = new URLSearchParams({
        limit: '10000', // Large limit to get all data
        page: '1',
        sortField,
        sortDirection,
      });

      if (statusFilter !== 'all') exportParams.set('status', statusFilter);
      if (serviceFilter !== 'all') exportParams.set('service', serviceFilter);
      if (searchQuery) exportParams.set('search', searchQuery);
      if (dayFilter) exportParams.set('day', dayFilter);
      if (monthFilter) exportParams.set('month', monthFilter);
      if (yearFilter) exportParams.set('year', yearFilter);

      const response = await fetch(`/api/orders/optimized?${exportParams.toString()}`);
      const result = await response.json();
      
      const exportToExcel = await exportToExcelFunc();
      const success = await exportToExcel(result.data || [], 'data');
      
      if (success) {
        toast.success('Berhasil mengunduh data pesanan');
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  }, [statusFilter, serviceFilter, searchQuery, dayFilter, monthFilter, yearFilter, sortField, sortDirection]);

  // FIXED: Logout handler - Keep filter preferences
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
  const toggleCardExpansion = useCallback((orderId: string) => {
    setExpandedCardId(prev => prev === orderId ? null : orderId);
  }, []);

  // Pagination navigation
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  }, []);

  // Generate pagination buttons
  const paginationButtons = useMemo(() => {
    const buttons: React.ReactNode[] = [];
    const maxButtons = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => handlePageChange(1)}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="px-3 py-1">...</span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
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
        buttons.push(
          <span key="ellipsis2" className="px-3 py-1">...</span>
        );
      }
      
      buttons.push(
        <button
          key="last"
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  }, [currentPage, totalPages, handlePageChange]);

  return (
    <AuthGuard requiredPermission="canViewDashboard">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full p-2"
      >
        {/* Header */}
        <DashboardHeader 
          session={session}
          permissions={permissions}
          handleExport={handleExport}
          filteredOrders={orders}
          loading={loading}
          isCardView={isCardView}
          setIsCardView={setIsCardView}
          setShowColumnSettings={setShowColumnSettings}
          setShowAddAdminModal={setShowAddAdminModal}
          handleLogout={handleLogout}
        />
        
        {/* Error message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 p-4 rounded mb-4"
          >
            {error}
            <button 
              className="ml-2 text-sm underline" 
              onClick={() => refetch()}
            >
              Coba Lagi
            </button>
          </motion.div>
        )}
        
        {/* Modals - conditionally rendered */}
        {permissions.canAddAdmin && showAddAdminModal && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <AddAdminModal 
              isOpen={showAddAdminModal} 
              onClose={() => setShowAddAdminModal(false)} 
            />
          </Suspense>
        )}
        
        {showColumnSettings && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <ColumnSettingsModal 
              isOpen={showColumnSettings} 
              onClose={() => setShowColumnSettings(false)}
              visibleColumns={visibleColumns}
              toggleColumnVisibility={toggleColumnVisibility}
              updateMultipleColumns={updateMultipleColumns}
            />
          </Suspense>
        )}
        
        {pendingStatusChange && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <StatusChangeModal 
              pendingStatus={pendingStatusChange.newStatus}
              onConfirm={confirmStatusChange}
              onCancel={cancelStatusChange}
            />
          </Suspense>
        )}
        
        {pendingDelete && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <DeleteOrderModal 
              onConfirm={confirmDeleteOrder}
              onCancel={cancelDeleteOrder}
            />
          </Suspense>
        )}

        {pendingDeleteResult && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <DeleteResultModal 
              onConfirm={confirmDeleteResultFile}
              onCancel={cancelDeleteResultFile}
            />
          </Suspense>
        )}
        
        {/* Filters Panel */}
        <FiltersPanel 
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          dayFilter={dayFilter}
          setDayFilter={setDayFilter}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resetFilters={resetFilters}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={handleRowsPerPageChange}
          setCurrentPage={setCurrentPage}
        />

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent"></div>
          </div>
        )}

        {/* Orders content */}
        {!loading && (
          <>
            {orders.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-6 text-center rounded">
                <p className="text-gray-500 dark:text-gray-400">Tidak ada pesanan yang ditemukan</p>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                {isCardView ? (
                  <OrderCards 
                    paginatedOrders={orders}
                    startIndex={startIndex}
                    expandedCardId={expandedCardId}
                    toggleCardExpansion={toggleCardExpansion}
                    editingOrder={editingOrder}
                    editFormData={editFormData}
                    handleEditFormChange={handleEditFormChange}
                    saveOrderChanges={saveOrderChanges}
                    cancelEditing={cancelEditing}
                    editingNote={editingNote}
                    noteText={noteText}
                    setNoteText={setNoteText}
                    saveNote={saveNote}
                    cancelEditingNote={cancelEditingNote}
                    startEditingNote={startEditingNote}
                    uploadingResultFor={uploadingResultFor}
                    startUploadingResultFileOnly={startUploadingResultFileOnly}
                    cancelUploadingResult={cancelUploadingResult}
                    handleResultFileUpload={handleResultFileUpload}
                    viewResultFile={viewResultFile}
                    handleDeleteResultFile={handleDeleteResultFile}
                    handleStatusChange={handleStatusChange}
                    startEditing={startEditing}
                    handleDeleteOrder={handleDeleteOrder}
                    viewDocument={viewDocument}
                    requestDocumentRevision={requestDocumentRevision}
                  />
                ) : (
                  // Table view
                  <OrdersTable 
                    paginatedOrders={orders}
                    startIndex={startIndex}
                    visibleColumns={visibleColumns}
                    handleSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    editingOrder={editingOrder}
                    editFormData={editFormData}
                    handleEditFormChange={handleEditFormChange}
                    saveOrderChanges={saveOrderChanges}
                    cancelEditing={cancelEditing}
                    editingNote={editingNote}
                    noteText={noteText}
                    setNoteText={setNoteText}
                    saveNote={saveNote}
                    cancelEditingNote={cancelEditingNote}
                    startEditingNote={startEditingNote}
                    uploadingResultFor={uploadingResultFor}
                    startUploadingResultFileOnly={startUploadingResultFileOnly}
                    cancelUploadingResult={cancelUploadingResult}
                    handleResultFileUpload={handleResultFileUpload}
                    viewResultFile={viewResultFile}
                    handleDeleteResultFile={handleDeleteResultFile}
                    handleStatusChange={handleStatusChange}
                    startEditing={startEditing}
                    handleDeleteOrder={handleDeleteOrder}
                    viewDocument={viewDocument}
                    requestDocumentRevision={requestDocumentRevision}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center mt-6 gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPreviousPage}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>

            <div className="flex gap-1">
              {typeof window !== 'undefined' && window.innerWidth < 640 ? (
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
              ) : (
                <>{paginationButtons}</>
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        )}

        {/* Display results info */}
        <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
          {pagination && (
            <>
              Menampilkan {orders.length} dari {pagination.total} pesanan
              (Halaman {pagination.page} dari {pagination.totalPages})
            </>
          )}
        </div>
        
        {/* Revision Request Modal */}
        {showRevisionModal && selectedOrderForRevision && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
            <RevisionRequestModal
              orderId={selectedOrderForRevision}
              orderLanguage={selectedOrderLanguage}
              onSave={saveRevisionRequest}
              onCancel={cancelRevisionRequest}
            />
          </Suspense>
        )}

        {/* Floating action button for mobile */}
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