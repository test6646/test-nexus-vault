import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface DiskDropdownSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const DiskDropdownSelect = ({
  value,
  onValueChange,
  placeholder = 'Select or add disk...',
  className,
}: DiskDropdownSelectProps) => {
  const [open, setOpen] = useState(false);
  const [disks, setDisks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { currentFirmId } = useAuth();
  const { toast } = useToast();

  const loadDisks = useCallback(async () => {
    if (!currentFirmId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('storage_disk')
        .eq('firm_id', currentFirmId)
        .not('storage_disk', 'is', null)
        .not('storage_disk', 'eq', '');

      if (error) throw error;
      const diskSet = new Set<string>();
      (data || []).forEach((row: any) => {
        const d = row.storage_disk?.trim();
        if (d) diskSet.add(d);
      });
      setDisks(Array.from(diskSet).sort());
    } catch (err) {
      console.error('Error loading disks:', err);
      toast({ title: 'Error', description: 'Failed to load disk suggestions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentFirmId, toast]);

  useEffect(() => {
    if (open && currentFirmId) {
      loadDisks();
    }
  }, [open, currentFirmId, loadDisks]);

  const filtered = disks.filter((d) => d.toLowerCase().includes(searchValue.toLowerCase()));
  const showAddNewOption = searchValue.trim() && !filtered.some((d) => d.toLowerCase().trim() === searchValue.toLowerCase().trim());

  const handleAddNew = () => {
    if (searchValue.trim()) {
      onValueChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
      toast({ title: 'Disk Selected', description: `"${searchValue.trim()}" will be saved on update` });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between', className)}>
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search disks..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            {!showAddNewOption && <CommandEmpty>{loading ? 'Loading disks...' : 'No disks found.'}</CommandEmpty>}

            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((disk) => (
                  <CommandItem
                    key={disk}
                    value={disk}
                    onSelect={() => {
                      onValueChange(disk);
                      setOpen(false);
                      setSearchValue('');
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === disk ? 'opacity-100' : 'opacity-0')} />
                    {disk}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showAddNewOption && (
              <CommandGroup>
                <CommandItem onSelect={handleAddNew} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" /> Add "{searchValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};