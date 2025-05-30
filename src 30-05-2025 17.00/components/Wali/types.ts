// src/components/Wali/types.ts
import { OrderStatus } from '@/lib/order';

export interface Order {
  id: string;
  name: string;
  email: string;
  service_name: string;
  invoice_id: string | null | undefined;  // Changed from optional to required with undefined
  payment_url: string | null | undefined;
  document_path: string | null | undefined;
  result_file_path: string | null | undefined;
  download_password: string | null | undefined;
  status: string;
  created_at: string;
  updated_at: string;
  revision_message: string | null | undefined;
  note: string | null | undefined;
  language: string | null | undefined;
}

// Rest of your interfaces remain the same...
export interface StatusChangeRequest {
  orderId: string;
  newStatus: OrderStatus;
}

export interface FilterState {
  statusFilter: string | string[];
  serviceFilter: string | string[];
  dayFilter: string;
  monthFilter: string;
  yearFilter: string;
  searchQuery: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  rowsPerPage: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ColumnVisibility {
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
  // Add index signature to make it compatible with Record<string, boolean>
  [key: string]: boolean;
}

export interface EditFormData {
  name: string;
  email: string;
  service_name: string;
  note: string;
}

export interface PerformanceMetrics {
  query_time_ms: number;
  total_time_ms?: number;
  total_records: number;
  returned_records: number;
}

export interface ApiResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  query: {
    page: number;
    limit: number;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    filters_applied: {
      status: number;
      service: number;
      search: boolean;
      date_filter: boolean;
    };
  };
  performance?: PerformanceMetrics;
  meta?: {
    timestamp: string;
    user_role: string;
    user_email?: string;
  };
}

export interface ExportOptions {
  filename: string;
  includeHeaders: boolean;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  includeColumns: string[];
}

export interface FilterOptions {
  statusTypes: string[];
  serviceTypes: string[];
  years: number[];
  months: Array<{ value: string; label: string }>;
  days: string[];
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

export interface UseOptimizedOrdersParams {
  page: number;
  limit: number;
  status?: string[];
  service?: string[];
  search?: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  day?: string;
  month?: string;
  year?: string;
  enabled?: boolean;
}

export interface UseOptimizedOrdersReturn {
  orders: Order[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  performance?: PerformanceMetrics;
}

// Component Props Types
export interface OrderCardProps {
  order: Order;
  index: number;
  startIndex: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export interface OrderTableProps {
  orders: Order[];
  startIndex: number;
  visibleColumns: ColumnVisibility;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export interface FiltersProps {
  statusFilter: string | string[];
  serviceFilter: string | string[];
  dayFilter: string;
  monthFilter: string;
  yearFilter: string;
  searchQuery: string;
  rowsPerPage: number;
  onStatusFilterChange: (status: string | string[]) => void;
  onServiceFilterChange: (service: string | string[]) => void;
  onDayFilterChange: (day: string) => void;
  onMonthFilterChange: (month: string) => void;
  onYearFilterChange: (year: string) => void;
  onSearchQueryChange: (query: string) => void;
  onRowsPerPageChange: (rows: number) => void;
  onResetFilters: () => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface StatusChangeModalProps extends ModalProps {
  pendingStatus: OrderStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export interface RevisionRequestModalProps {
  orderId: string;
  orderLanguage: string;
  onSave: (orderId: string, message: string) => void;
  onCancel: () => void;
}

export interface ColumnSettingsModalProps extends ModalProps {
  visibleColumns: ColumnVisibility;
  toggleColumnVisibility: (columnKey: string) => void;
  updateMultipleColumns: (columns: ColumnVisibility) => void;
}

// Event handler types
export type FormChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
export type ButtonClickHandler = () => void;
export type StatusChangeHandler = (orderId: string, newStatus: OrderStatus) => void;
export type OrderActionHandler = (orderId: string) => void;
export type FileUploadHandler = (orderId: string, filePath: string) => void;

// Utility types
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'card';
export type FilterValue = string | string[] | number | boolean | null | undefined;