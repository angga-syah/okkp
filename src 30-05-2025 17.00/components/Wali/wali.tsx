// src/components/Wali/wali.tsx - ENHANCED UI VERSION
"use client";

import React, { useState, useCallback, Suspense, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { OrderStatus } from '@/lib/order';
import { usePermissions } from '@/lib/Permissions';
import { AuthGuard } from '@/components/Common/AuthGuard';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";

// Import optimized hook
import { useOptimizedOrders } from './hooks/useOptimizedOrders';

// Import core essential types
import { Order, StatusChangeRequest } from './types';

// Import lightweight hooks
import { useMobileDetection } from './hooks/useMobileDetection';
import { useLocalStorage } from './hooks/useLocalStorage';

// Dynamically import heavy components with enhanced loading states
const DashboardHeader = dynamic(() => import('./components/DashboardHeader'), {
  loading: () => (
    <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl animate-pulse shadow-lg">
      <div className="flex justify-between items-center p-6">
        <div className="flex gap-3">
          <div className="w-24 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
          <div className="w-24 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
        </div>
        <div className="w-20 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
      </div>
    </div>
  ),
  ssr: false
});

const FiltersPanel = dynamic(() => import('./components/FiltersPanel'), {
  loading: () => (
    <div className="w-full h-32 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl animate-pulse mt-6 shadow-lg">
      <div className="p-6">
        <div className="flex gap-4">
          <div className="w-1/3 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
          <div className="w-24 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
          <div className="w-24 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  ),
  ssr: false
});

const OrdersTable = dynamic(() => import('./components/OrdersTable'), {
  loading: () => (
    <div className="w-full h-96 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl animate-pulse mt-6 shadow-lg">
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse"></div>
        ))}
      </div>
    </div>
  ),
  ssr: false
});

const OrderCards = dynamic(() => import('./components/OrderCards'), {
  loading: () => (
    <div className="w-full space-y-4 mt-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl animate-pulse shadow-lg"></div>
      ))}
    </div>
  ),
  ssr: false
});

// Modal components - load only when needed with better fallbacks
const StatusChangeModal = dynamic(() => import('./modals/StatusChangeModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-64 h-32 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

const DeleteOrderModal = dynamic(() => import('./modals/DeleteOrderModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-64 h-32 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

const DeleteResultModal = dynamic(() => import('./modals/DeleteResultModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-64 h-32 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

const RevisionRequestModal = dynamic(() => import('./modals/RevisionRequestModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-80 h-48 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

const AddAdminModal = dynamic(() => import('./components/addadmin'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-96 h-64 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

const ColumnSettingsModal = dynamic(() => import('./modals/ColumnSettingsModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="w-80 h-96 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      </div>
    </div>
  )
});

//Utility imports
const exportToExcelFunc = (): Promise<{ exportToExcel: (orders: Order[], fileName?: string) => Promise<boolean> }> => 
  import('./export').then(mod => mod as any);

interface ColumnVisibility {
  number: boolean;
  id: boolean;
  date: boolean;
  customer: boolean;
  service: boolean;
  status: boolean;
  note: boolean;
  invoice: boolean;
  result: boolean;
  downloadPassword: boolean;
  actions: boolean;
  [key: string]: boolean;
}

const AdminDashboard: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const permissions = usePermissions();
  
  // State management (keeping existing logic)
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterInitialized, setFilterInitialized] = useState<boolean>(false);
  
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
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  
  // UI preferences
  const { isCardView, setIsCardView } = useMobileDetection();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnVisibility>('adminDashboardColumns', {
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

  // [Keep all existing useEffect hooks and logic exactly as they were]
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
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
      
      const savedFilters = localStorage.getItem('adminDashboardFilters');
      const filters = savedFilters ? JSON.parse(savedFilters) : {};
      
      setStatusFilter(statusParam ? statusParam.split(',').filter(Boolean) : filters.statusFilter || []);
      setServiceFilter(serviceParam ? serviceParam.split(',').filter(Boolean) : filters.serviceFilter || []);
      setDayFilter(dayParam || filters.day || '');
      setMonthFilter(monthParam || filters.month || '');
      setYearFilter(yearParam || filters.year || '');
      setSearchQuery(searchParam || filters.search || '');
      setCurrentPage(pageParam ? parseInt(pageParam, 10) : filters.page || 1);
      setRowsPerPage(rowsParam ? parseInt(rowsParam, 10) : filters.rowsPerPage || 10);
      setSortField(sortParam || filters.sortField || 'created_at');
      setSortDirection((orderParam || filters.sortDirection || 'desc') as 'asc' | 'desc');
      
      setFilterInitialized(true);
    } catch (e) {
      console.error('Error loading saved filters:', e);
      setFilterInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!filterInitialized) return;
    
    const debounceTimer = setTimeout(() => {
      const newFilters = {
        statusFilter,
        serviceFilter,
        day: dayFilter,
        month: monthFilter,
        year: yearFilter,
        search: searchQuery,
        page: currentPage,
        rowsPerPage,
        sortField,
        sortDirection
      };
      
      localStorage.setItem('adminDashboardFilters', JSON.stringify(newFilters));
      
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        
        const updateUrlParam = (name: string, value: string | number | string[] | null): void => {
          if (value && (Array.isArray(value) ? value.length > 0 : value !== '' && value !== 'all')) {
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
        updateUrlParam('search', searchQuery);
        updateUrlParam('page', currentPage !== 1 ? currentPage : null);
        updateUrlParam('rows', rowsPerPage !== 10 ? rowsPerPage : null);
        updateUrlParam('sort', sortField !== 'created_at' ? sortField : null);
        updateUrlParam('order', sortDirection !== 'desc' ? sortDirection : null);
        
        window.history.replaceState({}, '', url.toString());
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, 
      searchQuery, currentPage, rowsPerPage, sortField, sortDirection, filterInitialized]);

  useEffect(() => {
    if (filterInitialized) setCurrentPage(1);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, searchQuery, filterInitialized]);

  // Prepare parameters for optimized hook with array support
  const ordersParams = useMemo(() => ({
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    service: serviceFilter.length > 0 ? serviceFilter : undefined,
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
  const totalPages: number = pagination?.totalPages || 0;
  const startIndex: number = pagination ? (pagination.page - 1) * pagination.limit : 0;

  // [Keep all existing handlers and functions exactly as they were - only updating the UI rendering part]
  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const startEditing = useCallback((order: Order): void => {
    if (!permissions.canEditOrders) return;
    setEditingOrder(order.id);
    setEditFormData({
      name: order.name,
      email: order.email,
      service_name: order.service_name,
      note: order.note || ''
    });
  }, [permissions.canEditOrders]);

  const cancelEditing = useCallback((): void => {
    setEditingOrder(null);
  }, []);

  const startEditingNote = useCallback((order: Order): void => {
    if (!permissions.canEditOrders) return;
    setEditingNote(order.id);
    setNoteText(order.note || '');
  }, [permissions.canEditOrders]);

  const saveNote = useCallback(async (orderId: string): Promise<void> => {
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
      refetch();
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
      console.error('Error saving note:', err);
    }
  }, [noteText, permissions.canEditOrders, refetch]);

  const cancelEditingNote = useCallback((): void => {
    setEditingNote(null);
    setNoteText('');
  }, []);

  const updateMultipleColumns = useCallback((columnsSettings: ColumnVisibility): void => {
    setVisibleColumns(columnsSettings);
  }, [setVisibleColumns]);

  const toggleColumnVisibility = useCallback((columnKey: string): void => {
    setVisibleColumns((prev: ColumnVisibility) => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof ColumnVisibility]
    }));
  }, [setVisibleColumns]);

  const startUploadingResultFileOnly = useCallback((orderId: string): void => {
    setUploadingResultFor(orderId);
  }, []);

  const cancelUploadingResult = useCallback((): void => {
    setUploadingResultFor(null);
  }, []);

  const handleStatusChange = useCallback((orderId: string, newStatus: OrderStatus): void => {
    if (!permissions.canChangeStatus) return;
    setPendingStatusChange({ orderId, newStatus });
  }, [permissions.canChangeStatus]);
  
  const confirmStatusChange = useCallback(async (): Promise<void> => {
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
      refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status";
      toast.error(errorMessage);
    } finally {
      setPendingStatusChange(null);
    }
  }, [pendingStatusChange, permissions.canChangeStatus, refetch]);
  
  const cancelStatusChange = useCallback((): void => {
    setPendingStatusChange(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('status_change_canceled'));
    }
  }, []);

  const handleDeleteOrder = useCallback((orderId: string): void => {
    if (!permissions.canDeleteOrders) return;
    setPendingDelete(orderId);
  }, [permissions.canDeleteOrders]);

  const confirmDeleteOrder = useCallback(async (): Promise<void> => {
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
      refetch();
      setPendingDelete(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menghapus pesanan";
      toast.error(errorMessage);
    }
  }, [pendingDelete, permissions.canDeleteOrders, refetch]);

  const cancelDeleteOrder = useCallback((): void => {
    setPendingDelete(null);
  }, []);

  const handleDeleteResultFile = useCallback((orderId: string): void => {
    if (!permissions.canEditOrders) return;
    setPendingDeleteResult(orderId);
  }, [permissions.canEditOrders]);

  const confirmDeleteResultFile = useCallback(async (): Promise<void> => {
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
      refetch();
      setPendingDeleteResult(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menghapus file hasil";
      toast.error(errorMessage);
    }
  }, [pendingDeleteResult, permissions.canEditOrders, refetch]);

  const cancelDeleteResultFile = useCallback((): void => {
    setPendingDeleteResult(null);
  }, []);

  const saveOrderChanges = useCallback(async (orderId: string): Promise<void> => {
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
      refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memperbarui pesanan";
      toast.error(errorMessage);
    }
  }, [editFormData, permissions.canEditOrders, refetch]);

  const [selectedOrderLanguage, setSelectedOrderLanguage] = useState<string>('en');

  const requestDocumentRevision = useCallback((orderId: string): void => {
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

  const saveRevisionRequest = useCallback(async (orderId: string, message: string): Promise<void> => {
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
      refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send revision request";
      toast.error(errorMessage);
    }
  }, [permissions.canRequestRevision, refetch]);

  const cancelRevisionRequest = useCallback((): void => {
    setShowRevisionModal(false);
    setSelectedOrderForRevision(null);
  }, []);

  const viewDocument = useCallback((orderId: string): void => {
    try {
      window.open(`/api/documents/${orderId}?timestamp=${Date.now()}`, '_blank');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Kesalahan tidak diketahui";
      toast.error(`Gagal membuka dokumen: ${errorMessage}`);
    }
  }, []);

  const viewResultFile = useCallback(async (orderId: string): Promise<void> => {
    try {
      window.open(`/api/view-result/${orderId}`, '_blank');
    } catch (error) {
      console.error('Error viewing result file:', error);
      toast.error('Gagal membuka file hasil');
    }
  }, []);

  const handleResultFileUpload = useCallback((orderId: string, filePath: string): void => {
    if (editingOrder === orderId) {
      setEditingOrder(null);
    }
    
    toast.success("File berhasil diunggah");
    refetch();
  }, [editingOrder, refetch]);

  const handleSort = useCallback((field: string): void => {
    setSortDirection(prev => field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : field === 'created_at' ? 'desc' : 'asc');
    setSortField(field);
    setCurrentPage(1);
  }, [sortField]);

  const resetFilters = useCallback((): void => {
    setStatusFilter([]);
    setServiceFilter([]);
    setDayFilter('');
    setMonthFilter('');
    setYearFilter('');
    setSearchQuery('');
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
    
    localStorage.removeItem('adminDashboardFilters');
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  const handleExport = useCallback(async (): Promise<void> => {
    try {
      console.log('📊 Starting export with current filters...');
      
      const exportParams = new URLSearchParams({
        limit: '10000',
        page: '1',
        sortField,
        sortDirection,
      });

      if (statusFilter.length > 0) {
        exportParams.set('status', statusFilter.join(','));
      }
      if (serviceFilter.length > 0) {
        exportParams.set('service', serviceFilter.join(','));
      }
      if (searchQuery && searchQuery.trim()) {
        exportParams.set('search', searchQuery.trim());
      }
      if (dayFilter) {
        exportParams.set('day', dayFilter);
      }
      if (monthFilter) {
        exportParams.set('month', monthFilter);
      }
      if (yearFilter) {
        exportParams.set('year', yearFilter);
      }
      
      console.log('📊 Export params:', exportParams.toString());
      
      const response = await fetch(`/api/orders/optimized?${exportParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Export API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.data || result.data.length === 0) {
        toast.error('Tidak ada data untuk diekspor dengan filter saat ini');
        return;
      }
      
      console.log(`📊 Exporting ${result.data.length} records...`);
      
      const { exportToExcel } = await exportToExcelFunc();
      const success = await exportToExcel(result.data, 'filtered_data');
      
      if (success) {
        toast.success(`Berhasil mengekspor ${result.data.length} data pesanan`);
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  }, [statusFilter, serviceFilter, searchQuery, dayFilter, monthFilter, yearFilter, sortField, sortDirection]);

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

  const toggleCardExpansion = useCallback((orderId: string): void => {
    setExpandedCardId(prev => prev === orderId ? null : orderId);
  }, []);

  const handlePageChange = useCallback((newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number): void => {
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
        <motion.button
          key="first"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePageChange(1)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg transition-all duration-300 backdrop-blur-sm font-medium"
          type="button"
        >
          1
        </motion.button>
      );
      
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="px-3 py-2 text-gray-500">...</span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <motion.button
          key={i}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
            currentPage === i
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg backdrop-blur-sm'
          }`}
          type="button"
        >
          {i}
        </motion.button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis2" className="px-3 py-2 text-gray-500">...</span>
        );
      }
      
      buttons.push(
        <motion.button
          key="last"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePageChange(totalPages)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 hover:shadow-lg transition-all duration-300 backdrop-blur-sm font-medium"
          type="button"
        >
          {totalPages}
        </motion.button>
      );
    }

    return buttons;
  }, [currentPage, totalPages, handlePageChange]);

  return (
    <AuthGuard requiredPermission="canViewDashboard">
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full p-4 lg:p-6"
        >
          {/* Enhanced Header with better animations */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
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
          </motion.div>
          
          {/* Enhanced Error message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-6 rounded-2xl mb-6 shadow-xl backdrop-blur-sm"
            >
              <div className="flex items-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <div>
                  <p className="font-semibold text-lg">{error}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-2 text-sm bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 shadow-lg" 
                    onClick={() => refetch()}
                    type="button"
                  >
                    🔄 Coba Lagi
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Enhanced Modals with better loading states */}
          <AnimatePresence>
            {permissions.canAddAdmin && showAddAdminModal && (
              <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>}>
                <AddAdminModal 
                  isOpen={showAddAdminModal} 
                  onClose={() => setShowAddAdminModal(false)} 
                />
              </Suspense>
            )}
            
            {showColumnSettings && (
              <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
              </div>}>
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
              <Suspense>
                <StatusChangeModal 
                  pendingStatus={pendingStatusChange.newStatus}
                  onConfirm={confirmStatusChange}
                  onCancel={cancelStatusChange}
                />
              </Suspense>
            )}
            
            {pendingDelete && (
              <Suspense>
                <DeleteOrderModal 
                  onConfirm={confirmDeleteOrder}
                  onCancel={cancelDeleteOrder}
                />
              </Suspense>
            )}

            {pendingDeleteResult && (
              <Suspense>
                <DeleteResultModal 
                  onConfirm={confirmDeleteResultFile}
                  onCancel={cancelDeleteResultFile}
                />
              </Suspense>
            )}
            
            {showRevisionModal && selectedOrderForRevision && (
              <Suspense>
                <RevisionRequestModal
                  orderId={selectedOrderForRevision}
                  orderLanguage={selectedOrderLanguage}
                  onSave={saveRevisionRequest}
                  onCancel={cancelRevisionRequest}
                />
              </Suspense>
            )}
          </AnimatePresence>
          
          {/* Enhanced Filters Panel */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
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
          </motion.div>

          {/* Enhanced Loading state */}
          {loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center p-16"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-16 w-16 border-4 border-indigo-500/30 rounded-full border-t-indigo-500"
                ></motion.div>
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 h-16 w-16 border-4 border-purple-500/20 rounded-full border-t-purple-500"
                ></motion.div>
                <div className="absolute inset-0 h-16 w-16 animate-ping border-4 border-indigo-500/10 rounded-full"></div>
              </div>
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-6 text-gray-600 dark:text-gray-400 text-lg font-medium"
              >
                ✨ Memuat data pesanan...
              </motion.p>
            </motion.div>
          )}

          {/* Enhanced Orders content */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {orders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 p-16 text-center rounded-3xl shadow-2xl"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-2">Tidak ada pesanan ditemukan</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Coba ubah kriteria pencarian atau filter untuk melihat data</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetFilters}
                    className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    type="button"
                  >
                    🔄 Reset Semua Filter
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  {/* Mobile card view */}
                  {isCardView ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
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
                    </motion.div>
                  ) : (
                    // Table view
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
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
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Enhanced Pagination controls */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
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
                  <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold shadow-lg">
                    {currentPage} / {totalPages}
                  </div>
                ) : (
                  <>{paginationButtons}</>
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
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-6"
          >
            {pagination && (
              <div className="bg-white/70 backdrop-blur-sm dark:bg-gray-800/70 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  Menampilkan <span className="font-bold text-indigo-600 dark:text-indigo-400">{orders.length}</span> dari{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{pagination.total}</span> pesanan
                  (Halaman <span className="font-bold">{pagination.page}</span> dari <span className="font-bold">{pagination.totalPages}</span>)
                </div>
              </div>
            )}
          </motion.div>

          {/* Enhanced Floating action button for mobile */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="md:hidden fixed bottom-6 right-6 z-40"
          >
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-all duration-300"
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

export default AdminDashboard;