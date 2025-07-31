import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search01Icon, FilterIcon, ArrowUpDownIcon, SlidersHorizontalIcon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface SortOption {
  value: string;
  label: string;
}

interface UnifiedSearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilters?: FilterOption[];
  selectedStatus?: string;
  onStatusChange?: (value: string) => void;
  sortOptions?: SortOption[];
  selectedSort?: string;
  onSortChange?: (value: string) => void;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;
  placeholder?: string;
  className?: string;
}

const UnifiedSearchFilter = ({
  searchValue,
  onSearchChange,
  statusFilters = [],
  selectedStatus = 'all',
  onStatusChange = () => {},
  sortOptions = [],
  selectedSort = '',
  onSortChange = () => {},
  sortDirection = 'desc',
  onSortDirectionChange = () => {},
  placeholder = "Search...",
  className,
}: UnifiedSearchFilterProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const hasActiveFilters = selectedStatus !== 'all' || selectedSort !== '';
  const filterCount = (selectedStatus !== 'all' ? 1 : 0) + (selectedSort ? 1 : 0);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Search Input - Left side */}
      <div className="relative w-full max-w-md">
        <Search01Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
          autoComplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      {/* Desktop: Center - Status Filter */}
      <div className="hidden md:flex items-center">
        {statusFilters.length > 0 && (
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Desktop: Right side - Sort */}
      <div className="hidden md:flex items-center gap-2">
        {sortOptions.length > 0 && (
          <>
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10 p-0 rounded-full"
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDownIcon className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Mobile: Filter Sheet */}
      <div className="md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full relative"
            >
              <SlidersHorizontalIcon className="h-4 w-4" />
              {hasActiveFilters && (
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground"
                >
                  {filterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filters & Sort</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Sort Options */}
              {sortOptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Sort By</h4>
                  <Select value={selectedSort} onValueChange={onSortChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose sort option" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedSort && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Direction:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2"
                      >
                        <ArrowUpDownIcon className="h-4 w-4" />
                        {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Status Filters */}
              {statusFilters.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Status Filter</h4>
                  <Select value={selectedStatus} onValueChange={onStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onStatusChange('all');
                    onSortChange('');
                    setIsSheetOpen(false);
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default UnifiedSearchFilter;