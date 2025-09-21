/**
 * Enterprise-Grade Type Definitions
 * Replaces generic 'any' types with strict TypeScript interfaces
 */

// Database Response Types
export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  success: boolean;
  metadata?: {
    count?: number;
    page?: number;
    totalPages?: number;
  };
}

// Staff and User Types
export interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
  email?: string;
  is_freelancer?: boolean;
}

export interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number?: string;
  role: 'Admin' | 'Staff' | 'Other';
  firm_id?: string;
  
  created_at: string;
  updated_at: string;
}

// Event and Assignment Types
export interface EventAssignment {
  id: string;
  event_id: string;
  staff_id?: string;
  freelancer_id?: string;
  role: 'Photographer' | 'Cinematographer' | 'Drone Pilot' | 'Editor';
  day_number: number;
  rate?: number;
  staff?: StaffMember;
  freelancer?: StaffMember;
}

export interface EventWithDetails {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  client_id: string;
  firm_id: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  photo_editing_status: boolean;
  video_editing_status: boolean;
  client?: {
    name: string;
  };
  assignments?: EventAssignment[];
  payments?: PaymentDetails[];
}

export interface PaymentDetails {
  id: string;
  event_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

// Form and UI Types
export interface FormState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SortOption {
  value: string;
  label: string;
  direction?: 'asc' | 'desc';
}

// Export Configuration Types
export interface ExportConfig<T> {
  filename: string;
  columns: TableColumn<T>[];
  filters: {
    type: keyof T;
    options: FilterOption[];
  }[];
  transformer?: (data: T[]) => unknown[];
}

// Background Sync Types
export interface SyncRequest {
  itemType: 'client' | 'event' | 'task' | 'expense' | 'freelancer' | 'payment';
  itemId: string;
  firmId: string;
  operation: 'create' | 'update' | 'delete';
  retryCount?: number;
}

export interface SyncResponse {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

// Performance Monitoring Types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  updateCount: number;
  lastRender: number;
}

// Error Context Types
export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  firmId?: string;
  metadata?: Record<string, unknown>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type NonEmptyArray<T> = [T, ...T[]];