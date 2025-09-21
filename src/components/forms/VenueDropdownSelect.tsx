import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface VenueDropdownSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const VenueDropdownSelect = ({
  value,
  onValueChange,
  placeholder = "Select or add venue...",
  className
}: VenueDropdownSelectProps) => {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const { currentFirmId } = useAuth();
  const { toast } = useToast();

  // Load venues from database
  const loadVenues = useCallback(async () => {
    if (!currentFirmId) return;
    
    setLoading(true);
    try {
      // Get unique venues from both events and quotations
      const [eventsData, quotationsData] = await Promise.all([
        supabase
          .from('events')
          .select('venue')
          .eq('firm_id', currentFirmId)
          .not('venue', 'is', null)
          .not('venue', 'eq', ''),
        supabase
          .from('quotations')
          .select('venue')
          .eq('firm_id', currentFirmId)
          .not('venue', 'is', null)
          .not('venue', 'eq', '')
      ]);

      const venueSet = new Set<string>();
      
      if (eventsData.data) {
        eventsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) {
            venueSet.add(item.venue.trim());
          }
        });
      }
      
      if (quotationsData.data) {
        quotationsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) {
            venueSet.add(item.venue.trim());
          }
        });
      }

      setVenues(Array.from(venueSet).sort());
    } catch (error) {
      console.error('Error loading venues:', error);
      toast({
        title: "Error",
        description: "Failed to load venue suggestions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentFirmId, toast]);

  useEffect(() => {
    if (open && currentFirmId) {
      loadVenues();
    }
  }, [open, currentFirmId, loadVenues]);

  // Filter venues based on search
  const filteredVenues = venues.filter(venue =>
    venue.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Show "Add new" option when search value doesn't match any existing venue
  const showAddNewOption = searchValue.trim() && 
    !filteredVenues.some(venue => venue.toLowerCase().trim() === searchValue.toLowerCase().trim());

  const handleAddNew = () => {
    if (searchValue.trim()) {
      onValueChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
      setShowAddNew(false);
      toast({
        title: "Venue Added",
        description: `"${searchValue.trim()}" will be saved when you submit the form`,
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search venues..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {!showAddNewOption && (
              <CommandEmpty>
                {loading ? "Loading venues..." : "No venues found."}
              </CommandEmpty>
            )}
            
            {/* Existing venues */}
            {filteredVenues.length > 0 && (
              <CommandGroup>
                {filteredVenues.map((venue) => (
                  <CommandItem
                    key={venue}
                    value={venue}
                    onSelect={() => {
                      onValueChange(venue);
                      setOpen(false);
                      setSearchValue('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === venue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {venue}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Add new venue option */}
            {showAddNewOption && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleAddNew}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{searchValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
