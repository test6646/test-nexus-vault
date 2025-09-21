import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// Debounce utility
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export interface FilterOption {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'date_range';
  options?: string[];
  queryBuilder?: (query: any, value?: any) => any;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  tableName: string;
  searchFields: string[];
  sortOptions: SortOption[];
  filterOptions: FilterOption[];
  defaultSort?: string;
  selectQuery?: string;
  pageSize?: number;
  enableRealtime?: boolean;
}

interface UseBackendFiltersOptions {
  pageSize?: number;
  enableRealtime?: boolean;
  initialFilters?: string[];
  initialSearchTerm?: string;
}

export const useBackendFilters = (config: FilterConfig, options: UseBackendFiltersOptions = {}) => {
  const { currentFirmId, profile } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(options.initialSearchTerm || '');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(options.initialFilters || []);
  const [sortBy, setSortBy] = useState(config.defaultSort || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [pageSize, setPageSize] = useState(options.pageSize || config.pageSize || 50); // Default to 50 for UI

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const buildQuery = useCallback((withPagination = true) => {
    if (!currentFirmId) return null;

    let query = supabase
      .from(config.tableName as any)
      .select(config.selectQuery || '*', { count: 'exact' });

    // Apply role-based filtering for tasks
    if (config.tableName === 'tasks') {
      const isAdmin = profile?.role === 'Admin';
      if (isAdmin) {
        // Admin sees all tasks for their firm
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        // Staff only sees tasks assigned to them
        query = query.eq('assigned_to', profile.id);
      }
    } else if (config.tableName === 'event_staff_assignments') {
      const isAdmin = profile?.role === 'Admin';
      if (isAdmin) {
        // Admin sees all assignments in their firm
        query = query.eq('firm_id', currentFirmId);
      } else if (profile?.id) {
        // Staff/Freelancers only see assignments assigned to them
        query = query.or(`staff_id.eq.${profile.id},freelancer_id.eq.${profile.id}`);
      }
    } else {
      // For other tables, filter by firm_id
      query = query.eq('firm_id', currentFirmId);
    }

    // Quotations: enforce precise, mutually exclusive status/validity logic
    if (config.tableName === 'quotations') {
      const today = new Date().toISOString().split('T')[0];
      const isConverted = activeFilters.includes('converted');
      const isPending = activeFilters.includes('pending');
      const isExpired = activeFilters.includes('expired');
      const isValid = activeFilters.includes('valid');

      if (isConverted) {
        // Only converted quotations
        query = query.not('converted_to_event', 'is', null);
      } else {
        // Unconverted only (default and for pending/valid/expired)
        query = query.is('converted_to_event', null);

        if (isExpired) {
          query = query.lt('valid_until', today);
        } else if (isValid || isPending) {
          // Pending implies still-valid window
          query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
        } else {
          // Default: active only
          query = query.or(`valid_until.is.null,valid_until.gte.${today}`);
        }
      }
    }

    // Apply search
    if (isSearchActive && debouncedSearchTerm.trim()) {
      // Sanitize term to avoid breaking PostgREST logic tree
      const safeTerm = debouncedSearchTerm.trim().replace(/[,(\)]/g, ' ');

      // Top-level fields on the base table
      const baseFields = config.searchFields.map(field => `${field}.ilike.%${safeTerm}%`);
      if (baseFields.length > 0) {
        query = query.or(baseFields.join(','));
      }

      // Related client name search (apply on foreign table explicitly)
      if (config.tableName === 'events' || config.tableName === 'quotations') {
        query = query.or(`name.ilike.%${safeTerm}%`, { foreignTable: 'clients' });
      }
    }

    // Apply filters with proper grouping logic
    const roleFilters = activeFilters.filter(key => 
      ['photographer', 'cinematographer', 'editor', 'drone'].includes(key)
    );
    const otherFilters = activeFilters.filter(key => 
      !['photographer', 'cinematographer', 'editor', 'drone'].includes(key)
    );

    // Apply non-role filters individually (AND logic) with mutual exclusions
    const hasConverted = otherFilters.includes('converted');
    const hasPending = otherFilters.includes('pending');
    const hasExpired = otherFilters.includes('expired');
    const hasValid = otherFilters.includes('valid');

    const sanitizedOtherFilters = otherFilters.filter(key => {
      // converted vs pending -> prefer converted
      if (hasConverted && key === 'pending') return false;
      if (hasPending && key === 'converted') return false;
      // expired vs valid -> prefer expired
      if (hasExpired && key === 'valid') return false;
      if (hasValid && key === 'expired') return false;
      return true;
    });

    // Exclude quotation status/validity filters here (handled centrally above)
    const finalOtherFilters = config.tableName === 'quotations'
      ? sanitizedOtherFilters.filter(k => !['converted','pending','valid','expired'].includes(k))
      : sanitizedOtherFilters;

    finalOtherFilters.forEach(filterKey => {
      const filterOption = config.filterOptions.find(f => f.key === filterKey);
      if (filterOption?.queryBuilder) {
        query = filterOption.queryBuilder(query);
      }
    });

    // Apply role filters with OR logic (only for tables that have a 'role' column)
    if (roleFilters.length > 0) {
      const roleConditions = roleFilters.map(roleKey => {
        if (roleKey === 'photographer') return "role.eq.Photographer";
        if (roleKey === 'cinematographer') return "role.eq.Cinematographer";
        if (roleKey === 'editor') return "role.eq.Editor";
        if (roleKey === 'drone') return "role.eq.Drone";
        return null;
      }).filter(Boolean);
      
      if (roleConditions.length > 0) {
        query = query.or(roleConditions.join(','));
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (withPagination) {
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    return query;
  }, [config, currentFirmId, isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, currentPage, pageSize]);

  const fetchData = useCallback(async (append = false) => {
    const query = buildQuery();
    if (!query) {
      setLoading(false);
      return;
    }

    try {
      if (!append) setLoading(true);
      
      const { data: result, error, count } = await query;
      
      if (error) throw error;
      
      if (append) {
        setData(prev => [...prev, ...(result || [])]);
      } else {
        setData(result || []);
      }
      
      setTotalCount(count || 0);
      setAllDataLoaded((result?.length || 0) < pageSize);
    } catch (error: any) {
      console.error('Error fetching filtered data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      if (!append) setData([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, pageSize, toast]);

  const loadMore = useCallback(() => {
    if (!allDataLoaded && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [allDataLoaded, loading]);

  const resetPagination = useCallback(() => {
    setCurrentPage(0);
    setAllDataLoaded(false);
  }, []);

  // Reset pagination when page size changes
  useEffect(() => {
    setCurrentPage(0);
    setData([]);
    setAllDataLoaded(false);
  }, [pageSize]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [isSearchActive, debouncedSearchTerm, activeFilters, sortBy, sortOrder, resetPagination]);

  // Fetch data when pagination resets or page changes
  useEffect(() => {
    if (currentPage === 0) {
      fetchData(false);
    } else {
      fetchData(true);
    }
  }, [currentPage, fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!options.enableRealtime || !currentFirmId) return;

    const channel = supabase
      .channel(`${config.tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.tableName,
          filter: `firm_id=eq.${currentFirmId}`,
        },
        () => {
          resetPagination();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config.tableName, currentFirmId, options.enableRealtime, resetPagination]);

  const handleSearchApply = useCallback(() => {
    if (searchTerm.trim()) {
      setIsSearchActive(true);
    }
  }, [searchTerm]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm('');
    setIsSearchActive(false);
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // Optimized filter setters that reset pagination
  const setActiveFiltersOptimized = useCallback((filters: string[] | ((prev: string[]) => string[])) => {
    setActiveFilters(filters);
  }, [setActiveFilters]);

  const setSortByOptimized = useCallback((sort: string) => {
    setSortBy(sort);
  }, [setSortBy]);

  return {
    data,
    loading,
    searchTerm,
    setSearchTerm,
    isSearchActive,
    handleSearchApply,
    handleSearchClear,
    activeFilters,
    setActiveFilters: setActiveFiltersOptimized,
    sortBy,
    setSortBy: setSortByOptimized,
    sortOrder,
    toggleSortOrder,
    totalCount,
    filteredCount: totalCount,
    currentPage,
    allDataLoaded,
    loadMore,
    pageSize,
    setPageSize,
    refetch: () => {
      resetPagination();
      fetchData(false);
    }
  };
};