import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft02Icon, ArrowRight02Icon, MoreHorizontalCircle01Icon, Add01Icon, ArrowUp02Icon, ArrowDown02Icon } from 'hugeicons-react';

interface UniversalPaginationProps {
  currentPage: number;
  totalCount: number;
  filteredCount: number;
  pageSize: number;
  allDataLoaded: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onPageChange?: (page: number) => void;
  showLoadMore?: boolean;
  onPageSizeChange?: (size: number) => void;
}

export const UniversalPagination: React.FC<UniversalPaginationProps> = ({
  currentPage,
  totalCount,
  filteredCount,
  pageSize,
  allDataLoaded,
  loading,
  onLoadMore,
  onPageChange,
  showLoadMore = true,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentlyShowing = Math.min(filteredCount, (currentPage + 1) * pageSize);
  
  // Don't show pagination if there's no data or all data is loaded and it's less than one page
  if (totalCount === 0 || (allDataLoaded && totalCount <= pageSize)) {
    return null;
  }

  // Load More Button Style (for infinite scroll pattern)
  if (showLoadMore) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-sm text-muted-foreground">
          Showing {currentlyShowing} of {totalCount} results ({pageSize} per page)
        </div>
        
        {/* Load All and Page Size Controls */}
        {onPageSizeChange && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onPageSizeChange(Math.max(100, pageSize - 100))}
              disabled={pageSize <= 100}
              size="sm"
              className="text-xs px-3"
            >
              Less ({Math.max(100, pageSize - 100)})
            </Button>
            
            <Button
              variant="default"
              onClick={() => onPageSizeChange(1000)}
              disabled={pageSize >= 1000}
              size="sm" 
              className="text-xs px-3 bg-primary hover:bg-primary/90"
            >
              Load All
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onPageSizeChange(Math.min(500, pageSize + 100))}
              disabled={pageSize >= 500}
              size="sm"
              className="text-xs px-3"
            >
              More ({Math.min(500, pageSize + 100)})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Simple Arrow-Only Pagination Style (Consistent across all pages)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="text-sm text-muted-foreground">
        Showing {((currentPage) * pageSize) + 1} to {currentlyShowing} of {totalCount} results ({pageSize} per page)
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 0 || loading}
          className="h-10 w-10 rounded-full"
        >
          <ArrowLeft02Icon className="h-5 w-5" />
        </Button>
        
        <span className="text-sm text-muted-foreground px-3">
          {currentPage + 1} of {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          className="h-10 w-10 rounded-full"
        >
          <ArrowRight02Icon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};