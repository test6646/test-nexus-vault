import React, { useEffect, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SortOption, FilterOption } from '@/hooks/useBackendFilters';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface UniversalFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchApply: () => void;
  onSearchClear: () => void;
  isSearchActive: boolean;
  searchPlaceholder?: string;

  sortBy: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortReverse: () => void;

  activeFilters: string[];
  filterOptions: FilterOption[];
  onFiltersChange: (filters: string[]) => void;

  totalCount?: number;
  filteredCount?: number;
  loading?: boolean;
}

export const UniversalFilterBar: React.FC<UniversalFilterBarProps> = ({
  searchValue,
  onSearchChange,
  onSearchApply,
  onSearchClear,
  isSearchActive,
  searchPlaceholder = 'Search...',
  sortBy,
  sortOptions,
  onSortChange,
  sortOrder,
  onSortReverse,
  activeFilters,
  filterOptions,
  onFiltersChange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFilterToggle = (filterKey: string) => {
    const newFilters = activeFilters.includes(filterKey)
      ? activeFilters.filter((f) => f !== filterKey)
      : [...activeFilters, filterKey];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    // Optimize filter clearing to prevent unnecessary re-renders
    if (activeFilters.length > 0) {
      onFiltersChange([]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && isSearchActive) {
        onSearchClear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchActive, onSearchClear]);

  return (
    <div className="bg-background border-b border-border p-3">
      {/* MOBILE layout */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        {/* Search */}
        <div className="flex flex-1 gap-2">
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchApply();
              if (e.key === 'Escape') onSearchClear();
            }}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 border-2 border-input"
            onClick={isSearchActive ? onSearchClear : onSearchApply}
            disabled={!isSearchActive && !searchValue.trim()}
          >
            {isSearchActive ? <X className="h-4 w-4"/> : <Search className="h-4 w-4"/>}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 relative border-2 border-input" 
            onClick={() => setIsFilterOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters.length > 0 && (
              <Badge
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-primary text-primary-foreground border-0 flex items-center justify-center"
              >
                {activeFilters.length}
              </Badge>
            )}
          </Button>

          {/* Global Clear Button */}
          {activeFilters.length > 0 && (
            <Button
              size="icon"
              onClick={clearAllFilters}
              title="Clear all filters"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* DESKTOP layout */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {/* Left: Search */}
        <div className="flex items-center gap-2 w-[35%]">
          <Input
            ref={searchInputRef}
            placeholder={`${searchPlaceholder} (Ctrl+K)`}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchApply();
              if (e.key === 'Escape') onSearchClear();
            }}
            className="w-full"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 border-2 border-input"
            onClick={isSearchActive ? onSearchClear : onSearchApply}
            disabled={!isSearchActive && !searchValue.trim()}
          >
            {isSearchActive ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Middle: Sort */}
        <div className="flex items-center gap-2 w-[30%] justify-center">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px]">
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
            size="icon"
            onClick={onSortReverse}
            title={`Currently: ${sortOrder === 'asc' ? 'A-Z' : 'Z-A'}. Click to reverse.`}
            className="border-2 border-input"
          >
            <ArrowUp
              className={`h-4 w-4 transition-transform duration-300 ${
                sortOrder === 'desc' ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </Button>
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-2 w-[30%] justify-end">
          <Button 
            variant="outline" 
            onClick={() => setIsFilterOpen(true)} 
            className="h-10 w-[140px] justify-between border-2 border-input"
          >
            <div className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </div>
            {activeFilters.length > 0 && (
              <Badge className="h-5 w-5 p-0 text-xs bg-primary text-primary-foreground border-0 flex items-center justify-center">
                {activeFilters.length}
              </Badge>
            )}
          </Button>

          {activeFilters.length > 0 && (
            <Button
              size="icon"
              onClick={clearAllFilters}
              title="Clear all filters"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar (Filters) */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="w-[80vw] sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {filterOptions.map((filter) => (
              <div key={filter.key} className="flex items-center space-x-2">
                <Checkbox
                  id={filter.key}
                  checked={activeFilters.includes(filter.key)}
                  onCheckedChange={() => handleFilterToggle(filter.key)}
                />
                <label
                  htmlFor={filter.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {filter.label}
                </label>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};