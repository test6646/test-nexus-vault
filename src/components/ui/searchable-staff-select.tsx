import { useState, useMemo, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Staff {
  id: string;
  full_name: string;
  role?: string;
}

interface SearchableStaffSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  staffOptions: Staff[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  required?: boolean;
  getDisplayText?: (staff: Staff) => string;
}

export const SearchableStaffSelect = ({
  value,
  onValueChange,
  staffOptions,
  placeholder = "Select staff",
  searchPlaceholder = "Search staff...",
  className,
  disabled,
  allowClear = false,
  required = false,
  getDisplayText
}: SearchableStaffSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staffOptions;
    
    return staffOptions.filter(staff =>
      staff.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.role && staff.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [staffOptions, searchTerm]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm(''); // Clear search when closing
    }
  };

  const getStaffDisplayText = (staff: Staff) => {
    if (getDisplayText) {
      return getDisplayText(staff);
    }
    return staff.full_name;
  };

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      onOpenChange={handleOpenChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="p-0 bg-card">
        <div className="sticky top-0 bg-card backdrop-blur-md border-b p-2 z-50 shadow-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div>
          {allowClear && (
            <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
          )}
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {getStaffDisplayText(staff)}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No staff found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};