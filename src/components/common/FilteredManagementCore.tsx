import React from 'react';
import { UniversalFilterBar } from './UniversalFilterBar';
import { useBackendFilters, FilterConfig } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { PageTableSkeleton } from '@/components/ui/skeleton';

interface FilteredManagementCoreProps {
  pageType: keyof typeof FILTER_CONFIGS;
  renderContent: (data: {
    data: any[];
    loading: boolean;
    refetch: () => void;
    loadMore?: () => void;
    allDataLoaded?: boolean;
    currentPage?: number;
    totalCount?: number;
    filteredCount?: number;
    pageSize?: number;
    setPageSize?: (size: number) => void;
  }) => React.ReactNode;
  renderHeader?: (data: {
    hasData: boolean;
    data: any[];
    totalCount: number;
    filteredCount: number;
  }) => React.ReactNode;
  renderStats?: (data: {
    data: any[];
    activeFilters: string[];
    isSearchActive: boolean;
    searchTerm: string;
  }) => React.ReactNode;
  searchPlaceholder?: string;
  enableRealtime?: boolean;
  pageSize?: number;
}

export const FilteredManagementCore: React.FC<FilteredManagementCoreProps> = ({
  pageType,
  renderContent,
  renderHeader,
  renderStats,
  searchPlaceholder = "Search...",
  enableRealtime = true,
  pageSize: initialPageSize = 50
}) => {
  const config = FILTER_CONFIGS[pageType];
  
  const {
    data,
    loading,
    searchTerm,
    setSearchTerm,
    isSearchActive,
    handleSearchApply,
    handleSearchClear,
    activeFilters,
    setActiveFilters,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    totalCount,
    filteredCount,
    loadMore,
    allDataLoaded,
    refetch,
    currentPage,
    pageSize,
    setPageSize
  } = useBackendFilters(config, {
    enableRealtime,
    pageSize: initialPageSize
  });

  if (loading && data.length === 0) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {renderHeader && renderHeader({
        hasData: data.length > 0,
        data,
        totalCount,
        filteredCount
      })}

      {/* Stats - only re-render when filters change */}
      {renderStats && renderStats({
        data,
        activeFilters,
        isSearchActive,
        searchTerm
      })}

      {/* Filter Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-background border-b pb-4">
        <UniversalFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchApply={handleSearchApply}
        onSearchClear={handleSearchClear}
        isSearchActive={isSearchActive}
        searchPlaceholder={searchPlaceholder}
        
        sortBy={sortBy}
        sortOptions={config.sortOptions}
        onSortChange={setSortBy}
        sortOrder={sortOrder}
        onSortReverse={toggleSortOrder}
        
        activeFilters={activeFilters}
        filterOptions={config.filterOptions}
        onFiltersChange={setActiveFilters}
        
        totalCount={totalCount}
        filteredCount={filteredCount}
        loading={loading}
      />
      </div>

      {/* Content */}
      {renderContent({
        data,
        loading,
        refetch,
        loadMore,
        allDataLoaded,
        currentPage,
        totalCount,
        filteredCount,
        pageSize,
        setPageSize
      })}
    </div>
  );
};