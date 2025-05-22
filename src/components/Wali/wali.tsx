//E:\kp\New folder\src\components\Wali\wali.tsx
"use client"
import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { supabaseClient } from '@/lib/sb_client';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { OrderStatus } from '@/lib/order';
import { usePermissions } from '@/lib/Permissions';
import { AuthGuard } from '@/components/Common/AuthGuard';
import dynamic from 'next/dynamic';

// Import only essential parts from framer-motion to reduce bundle size
import { motion } from "framer-motion";

// Import core essential types that are needed immediately
import { Order, StatusChangeRequest } from './types';

// Minimal hooks that need to be available immediately
import { useFilteredOrders } from './hooks/useFilteredOrders';
import { usePagination } from './hooks/usePagination';
import { useSortOrders } from './hooks/useSortOrders';
import { useMobileDetection } from './hooks/useMobileDetection';
import { useLocalStorage } from './hooks/useLocalStorage';

// Add security check function
const sanitizeDisplayData = (data: any): any => {
  if (typeof data === 'string') {
    return data
      .replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '[JS_REMOVED]')
      .replace(/vbscript:/gi, '[VBS_REMOVED]')
      .replace(/on\w+\s*=/gi, '[EVENT_REMOVED]')
      .replace(/&#\d+;/g, '') // Remove HTML entities
      .replace(/%[0-9a-f]{2}/gi, '') // Remove URL encoded
      .replace(/\x00-\x1f/g, ''); // Remove control characters
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeDisplayData);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeDisplayData(value);
    }
    return sanitized;
  }
  return data;
};

// Dynamically import components with loading fallbacks
// These components are loaded only when needed and not in the initial JS bundle
const DashboardHeader = dynamic(() => import('./components/DashboardHeader'), {
  loading: () => <div className="w-full h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>,
  ssr: false
});

const FiltersPanel = dynamic(() => import('./components/FiltersPanel'), {
  loading: () => <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-4"></div>,
  ssr: false
});

// Lazy load table and card components - these are relatively large
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

// Dynamically import utility functions
const exportToExcelFunc = () => import('./export').then(mod => mod.exportToExcel);

// Export reusable loading component
export const LoadingState = () => (
  <div className="w-full p-4">
    <div className="w-full h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
    <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
  </div>
);

export default function AdminDashboard() {
  const { data: session } = useSession();
  const permissions = usePermissions();
  
  // States
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
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
    actions: true
  });

  // Type for column settings
  type ColumnSettings = {
    number: boolean;
    id: boolean;
    date: boolean;
    customer: boolean;
    service: boolean;
    status: boolean;
    note: boolean;
    invoice: boolean;
    result: boolean;
    actions: boolean;
  };
  
  // Sorting and pagination
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Custom hooks
  const { sortOrders } = useSortOrders(sortField, sortDirection);
  const filteredOrders = useFilteredOrders(
    orders, 
    statusFilter, 
    serviceFilter, 
    dayFilter, 
    monthFilter, 
    yearFilter, 
    searchQuery, 
    sortOrders
  );
  
  const { 
    paginatedOrders, 
    totalPages, 
    startIndex, 
    paginationButtons 
  } = usePagination(filteredOrders, currentPage, rowsPerPage, setCurrentPage);

  // Security: Sanitize orders data when it loads
  useEffect(() => {
    if (orders.length > 0) {
      const originalOrdersString = JSON.stringify(orders);
      const sanitizedOrders = orders.map(order => sanitizeDisplayData(order));
      const sanitizedOrdersString = JSON.stringify(sanitizedOrders);
      
      // Only update if there are actual changes to prevent infinite loop
      if (originalOrdersString !== sanitizedOrdersString) {
        setOrders(sanitizedOrders);
      }
    }
  }, []); // Empty dependency to run only once

  // Reset current page when filters change
  useEffect(() => {
    if (filterInitialized) setCurrentPage(1);
  }, [statusFilter, serviceFilter, dayFilter, monthFilter, yearFilter, searchQuery, filterInitialized]);

  // Load column visibility from localStorage
  useEffect(() => {
    setFilterInitialized(true);
  }, []);

  // Handle filter state persistence with debounce for better performance
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

  // Load filter state from URL or localStorage
  useEffect(() => {
    // Use a try-catch to prevent errors during hydration
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
      setFilterInitialized(true); // Still mark as initialized even if there's an error
    }
  }, []); // Empty dependency array - only run once on mount

  // Toggle card expansion for mobile view
  const toggleCardExpansion = useCallback((orderId: string) => {
    setExpandedCardId(prev => prev === orderId ? null : orderId);
  }, []);

  // Sorting handler
  const handleSort = useCallback((field: string) => {
    setSortDirection(prev => field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : field === 'created_at' ? 'desc' : 'asc');
    setSortField(field);
  }, [sortField]);

  // Reset filters function
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setServiceFilter('all');
    setDayFilter('');
    setMonthFilter('');
    setYearFilter('');
    setSearchQuery('');
  }, []);

  // Excel export handler - using dynamic import
  const handleExport = useCallback(async () => {
    try {
      // Dynamic import of exportToExcel function
      const exportToExcel = await exportToExcelFunc();
      const success = await exportToExcel(filteredOrders, 'data');
      
      if (success) {
        toast.success('Berhasil mengunduh data pesanan');
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  }, [filteredOrders]);

  // Logout handler
  const handleLogout = useCallback(() => {
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

  // Handle form data changes
  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Sanitize input before setting
    const sanitizedValue = sanitizeDisplayData(value);
    setEditFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  }, []);

  // Start editing an order
  const startEditing = useCallback((order: Order) => {
    if (!permissions.canEditOrders) return;
    setEditingOrder(order.id);
    setEditFormData({
      name: sanitizeDisplayData(order.name),
      email: sanitizeDisplayData(order.email),
      service_name: sanitizeDisplayData(order.service_name),
      note: sanitizeDisplayData(order.note || '')
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
    setNoteText(sanitizeDisplayData(order.note || ''));
  }, [permissions.canEditOrders]);

  // Save note
  const saveNote = useCallback(async (orderId: string) => {
    if (!permissions.canEditOrders) return;
    try {
      const sanitizedNote = sanitizeDisplayData(noteText);
      const response = await fetch('/api/update-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          note: sanitizedNote
        }),
      });
      
      const result = await response.json();
          
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save note');
      }
      
      setOrders(orders => orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          note: sanitizedNote
        } : order
      ));
      
      setEditingNote(null);
      toast.success('Catatan berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan catatan');
      console.error('Error saving note:', err);
    }
  }, [noteText, permissions.canEditOrders]);

  // Cancel editing note
  const cancelEditingNote = useCallback(() => {
    setEditingNote(null);
    setNoteText('');
  }, []);

  //multiple column update
  const updateMultipleColumns = useCallback((columnsSettings: ColumnSettings) => {
    setVisibleColumns(columnsSettings);
  }, [setVisibleColumns]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev => ({
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
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: pendingStatusChange.orderId,
          newStatus: pendingStatusChange.newStatus
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }
      
      setOrders(orders => orders.map(order => 
        order.id === pendingStatusChange.orderId ? { 
          ...order, 
          status: pendingStatusChange.newStatus
        } : order
      ));
      
      toast.success("Status berhasil diperbarui");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setLoading(false);
      setPendingStatusChange(null);
    }
  }, [pendingStatusChange, permissions.canChangeStatus]);
  
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
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete order');
      }
      
      setOrders(orders => orders.filter(order => order.id !== pendingDelete));
      toast.success("Berhasil dihapus");
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pesanan");
    }
  }, [pendingDelete, permissions.canDeleteOrders]);

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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus file hasil');
      }
      
      setOrders(orders => orders.map(order => 
        order.id === pendingDeleteResult ? { 
          ...order, 
          result_file_path: null 
        } : order
      ));
      
      toast.success("File hasil berhasil dihapus");
      setPendingDeleteResult(null);
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus file hasil");
    }
  }, [pendingDeleteResult, permissions.canEditOrders]);

  const cancelDeleteResultFile = useCallback(() => {
    setPendingDeleteResult(null);
  }, []);

  // Save order changes
  const saveOrderChanges = useCallback(async (orderId: string) => {
    if (!permissions.canEditOrders) return;
    try {
      const sanitizedFormData = {
        name: sanitizeDisplayData(editFormData.name),
        email: sanitizeDisplayData(editFormData.email),
        service_name: sanitizeDisplayData(editFormData.service_name),
        note: sanitizeDisplayData(editFormData.note),
        updated_at: new Date().toISOString()
      };

      const response = await fetch('/api/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          data: sanitizedFormData
        }),
      });
      
      const result = await response.json();
          
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order');
      }
      
      setOrders(orders => orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          name: sanitizedFormData.name,
          email: sanitizedFormData.email,
          service_name: sanitizedFormData.service_name,
          note: sanitizedFormData.note
        } : order
      ));
      
      setEditingOrder(null);
      toast.success("Berhasil diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui pesanan");
    }
  }, [editFormData, permissions.canEditOrders]);

  // Document revision request
  const [selectedOrderLanguage, setSelectedOrderLanguage] = useState<string>('en');

  const requestDocumentRevision = useCallback((orderId: string) => {
    if (!permissions.canRequestRevision) return;
    const orderData = orders.find(order => order.id === orderId);
    
    if (orderData) {
      setSelectedOrderForRevision(orderId); // Store the language from the order data, default to 'en' if not available
      setSelectedOrderLanguage(orderData.language || 'en');
      setShowRevisionModal(true);
    } else {
      setError("Order tidak ditemukan");
      setTimeout(() => setError(null), 3000);
    }
  }, [orders, permissions.canRequestRevision]);

  const saveRevisionRequest = useCallback(async (orderId: string, message: string) => {
    if (!permissions.canRequestRevision) return;
    try {
      setLoading(true);
      
      const sanitizedMessage = sanitizeDisplayData(message);
      const response = await fetch('/api/save-revision-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          revisionMessage: sanitizedMessage
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save revision request');
      }
      
      setOrders(orders => orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          status: 'pending_document' as OrderStatus,
          revision_message: sanitizedMessage
        } : order
      ));
      
      setShowRevisionModal(false);
      setSelectedOrderForRevision(null);
      toast.success("Permintaan revisi berhasil dikirim");
    } catch (err: any) {
      setError(err.message || "Failed to send revision request");
    } finally {
      setLoading(false);
    }
  }, [permissions.canRequestRevision]);

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
    setOrders(orders => orders.map(order => {
      if (order.id === orderId) {
        return { ...order, result_file_path: filePath };
      }
      return order;
    }));
    
    // Exit edit mode if active
    if (editingOrder === orderId) {
      setEditingOrder(null);
    }
    
    toast.success("File berhasil diunggah");
  }, [editingOrder]);

  // Initial data loading with delay for better performance
  const fetchInitialData = useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Sanitize data before setting
      const sanitizedData = data ? data.map(order => sanitizeDisplayData(order)) : [];
      setOrders(sanitizedData);
    } catch (err: any) {
      setError(err.message || "Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Use a deferred data loading approach for better initial render performance
  useEffect(() => {
    // Set a small delay to prioritize UI rendering first
    const loadTimer = setTimeout(() => {
      fetchInitialData();
    }, 100);
    
    return () => clearTimeout(loadTimer);
  }, [fetchInitialData]);

  // Set up real-time subscription with lazy loading
  useEffect(() => {
    let channel: any = null;
    
    // Set up subscription after component is mounted and initial render
    const setupRealtimeSubscription = () => {
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
const newOrder = sanitizeDisplayData(payload.new as Order);
               // Check if order already exists
               if (currentOrders.some(order => order.id === newOrder.id)) {
                 return currentOrders;
               }
               // Add new order at the beginning of the array
               const updatedOrders = [newOrder, ...currentOrders];
               return updatedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
             });
           }
           
           if (payload.eventType === 'UPDATE') {
             setOrders(currentOrders => 
               currentOrders.map(order => 
                 order.id === payload.new.id ? sanitizeDisplayData(payload.new as Order) : order
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
       .subscribe();
   };
   
   // Delay setting up real-time subscription
   const subscriptionTimer = setTimeout(() => {
     setupRealtimeSubscription();
   }, 500);
   
   // Cleanup function to unsubscribe when component unmounts
   return () => {
     clearTimeout(subscriptionTimer);
     if (channel) {
       supabaseClient.removeChannel(channel);
     }
   };
 }, []);

 // Loading state component to improve user experience
 const LoadingState = () => (
   <div className="w-full p-4">
     <div className="w-full h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
     <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4"></div>
     <div className="grid grid-cols-1 gap-4">
       {[...Array(5)].map((_, i) => (
         <div key={i} className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
       ))}
     </div>
   </div>
 );

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
         filteredOrders={filteredOrders}
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
           className={`${
             error.includes("Berhasil") || 
             error.includes("success") 
               ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100' 
               : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100'
           } p-4 rounded mb-4`}
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
       
       {/* Conditionally render modals only when needed */}
       {permissions.canAddAdmin && showAddAdminModal && (
         <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
           <AddAdminModal 
             isOpen={showAddAdminModal} 
             onClose={() => setShowAddAdminModal(false)} 
           />
         </Suspense>
       )}
       
       {/* Column Settings Modal - only load when visible */}
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
       
       {/* Status change confirmation modal - only load when needed */}
       {pendingStatusChange && (
         <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
           <StatusChangeModal 
             pendingStatus={pendingStatusChange.newStatus}
             onConfirm={confirmStatusChange}
             onCancel={cancelStatusChange}
           />
         </Suspense>
       )}
       
       {/* Delete confirmation modal - only load when needed */}
       {pendingDelete && (
         <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
           <DeleteOrderModal 
             onConfirm={confirmDeleteOrder}
             onCancel={cancelDeleteOrder}
           />
         </Suspense>
       )}

       {/* Delete Result File confirmation modal - only load when needed */}
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
         setRowsPerPage={setRowsPerPage}
         setCurrentPage={setCurrentPage}
       />

       {/* Show loading state while initial data is loading */}
       {loading ? (
         <LoadingState />
       ) : (
         <>
           {/* Mobile card view - conditionally render based on view preference */}
           {isCardView ? (
             <OrderCards 
               paginatedOrders={paginatedOrders}
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
             // Table view with dynamic columns
             <OrdersTable 
               paginatedOrders={paginatedOrders}
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

       {/* Responsive pagination controls - only render when we have multiple pages */}
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
       </div>
       
       {/* Revision Request Modal - only load when needed */}
       {showRevisionModal && selectedOrderForRevision && (
         <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">Loading...</div>}>
           <RevisionRequestModal
             orderId={selectedOrderForRevision}
             orderLanguage={selectedOrderLanguage} // Pass the language prop
             onSave={saveRevisionRequest}
             onCancel={cancelRevisionRequest}
           />
         </Suspense>
       )}

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