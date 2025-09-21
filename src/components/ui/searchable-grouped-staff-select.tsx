import { useState, useMemo, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, DroneIcon } from 'hugeicons-react';
import { displayRole } from '@/lib/role-utils';

interface Staff {
  id: string;
  full_name: string;
  role?: string;
  is_freelancer?: boolean;
}

interface SearchableGroupedStaffSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  staffOptions: Staff[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  required?: boolean;
}

const getRoleIcon = (role: string) => {
  const normalizedRole = displayRole(role);
  switch (normalizedRole) {
    case 'Photographer':
      return <Camera02Icon className="h-4 w-4" />;
    case 'Cinematographer':
      return <VideoReplayIcon className="h-4 w-4" />;
    case 'Editor':
      return <AdobePremierIcon className="h-4 w-4" />;
    case 'Drone Pilot':
      return <DroneIcon className="h-4 w-4" />;
    default:
      return null;
  }
};

export const SearchableGroupedStaffSelect = ({
  value,
  onValueChange,
  staffOptions,
  placeholder = "Select staff or freelancer",
  searchPlaceholder = "Search staff...",
  className,
  disabled,
  allowClear = false,
  required = false,
}: SearchableGroupedStaffSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const { staffMembers, freelancers } = useMemo(() => {
    const filtered = staffOptions.filter(person =>
      !searchTerm.trim() || 
      person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.role && person.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Deduplicate by name across Staff and Freelancers
    const normalize = (s: string) => s.trim().toLowerCase();

    const isFreelancerSelected = value?.startsWith('freelancer_');
    const selectedFreelancerId = isFreelancerSelected ? value?.replace('freelancer_', '') : undefined;
    const selectedStaffId = !isFreelancerSelected && value ? value : undefined;

    const staffCandidates = filtered.filter(person => !person.is_freelancer);
    const freelancerCandidates = filtered.filter(person => person.is_freelancer);

    const staffMap = new Map<string, Staff>();
    for (const s of staffCandidates) {
      const key = normalize(s.full_name);
      if (!staffMap.has(key) || (selectedStaffId && s.id === selectedStaffId)) {
        staffMap.set(key, s);
      }
    }

    const freelancerMap = new Map<string, Staff>();
    for (const f of freelancerCandidates) {
      const key = normalize(f.full_name);
      const isSelectedFreelancerItem = !!selectedFreelancerId && f.id === selectedFreelancerId;

      // If a Staff with same name exists, hide the Freelancer duplicate unless it is the currently selected value
      if (staffMap.has(key) && !isSelectedFreelancerItem) continue;

      if (!freelancerMap.has(key) || isSelectedFreelancerItem) {
        freelancerMap.set(key, f);
      }
    }

    return {
      staffMembers: Array.from(staffMap.values()),
      freelancers: Array.from(freelancerMap.values())
    };
  }, [staffOptions, searchTerm, value]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  const getPersonDisplayValue = (person: Staff) => {
    if (person.is_freelancer) {
      return `freelancer_${person.id}`;
    }
    return person.id;
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
          
          {/* Staff Section */}
          {staffMembers.length > 0 && (
            <>
               <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-card border-b">
                Staff
              </div>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(staff.role || '')}
                    <span>{staff.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {/* Freelancers Section */}
          {freelancers.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-card border-b">
                Freelancers
              </div>
              {freelancers.map((freelancer) => (
                <SelectItem key={freelancer.id} value={getPersonDisplayValue(freelancer)}>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(freelancer.role || '')}
                    <span>{freelancer.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {staffMembers.length === 0 && freelancers.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No staff or freelancers found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};