import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HardDriveIcon, Add01Icon, Delete02Icon } from 'hugeicons-react';
import { DiskDropdownSelect } from '@/components/forms/DiskDropdownSelect';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { syncEventInBackground } from '@/services/googleSheetsSync';
import type { Event } from '@/types/studio';

interface DiskEntry {
  id: string;
  name: string;
}

interface DiskManagementDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DiskManagementDialog = ({ event, open, onOpenChange }: DiskManagementDialogProps) => {
  const { toast } = useToast();
  const { currentFirmId } = useAuth();
  const [disks, setDisks] = useState<DiskEntry[]>([{ id: crypto.randomUUID(), name: '' }]);
  const [sizeValue, setSizeValue] = useState<string>('');
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event && open) {
      // Parse existing disks from comma-separated string
      const existingDisks = event.storage_disk 
        ? event.storage_disk.split(',').map(disk => ({ 
            id: crypto.randomUUID(), 
            name: disk.trim() 
          })).filter(disk => disk.name)
        : [{ id: crypto.randomUUID(), name: '' }];
      
      setDisks(existingDisks.length > 0 ? existingDisks : [{ id: crypto.randomUUID(), name: '' }]);
      
      if (event.storage_size && event.storage_size >= 1024 && event.storage_size % 1024 === 0) {
        setUnit('TB');
        setSizeValue(String((event.storage_size || 0) / 1024));
      } else {
        setUnit('GB');
        setSizeValue(event.storage_size ? String(event.storage_size) : '');
      }
    }
  }, [event, open]);

  const isValid = useMemo(() => {
    return disks.some(disk => disk.name.trim().length > 0);
  }, [disks]);

  const addDisk = () => {
    setDisks([...disks, { id: crypto.randomUUID(), name: '' }]);
  };

  const removeDisk = (id: string) => {
    if (disks.length > 1) {
      setDisks(disks.filter(disk => disk.id !== id));
    }
  };

  const updateDisk = (id: string, name: string) => {
    setDisks(disks.map(disk => disk.id === id ? { ...disk, name } : disk));
  };

  const handleSizeChange = (value: string) => {
    const numericValue = parseFloat(value);
    
    // Auto-convert to TB if GB value is >= 1024
    if (unit === 'GB' && numericValue >= 1024 && !isNaN(numericValue)) {
      setUnit('TB');
      setSizeValue((numericValue / 1024).toFixed(2));
    } else {
      setSizeValue(value);
    }
  };

  const handleSave = async () => {
    if (!event || !currentFirmId) return;
    if (!isValid) {
      toast({ title: 'Disk name required', description: 'Please enter/select at least one disk name.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const numericSize = sizeValue && !isNaN(Number(sizeValue)) ? Number(sizeValue) : null;
      const sizeInGB = numericSize ? Math.round(unit === 'TB' ? numericSize * 1024 : numericSize) : null;

      // Join all non-empty disk names with commas
      const diskNames = disks
        .map(disk => disk.name.trim())
        .filter(name => name.length > 0)
        .join(', ');

      const { error } = await supabase
        .from('events')
        .update({
          storage_disk: diskNames,
          storage_size: sizeInGB,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({ title: 'Disks updated', description: 'Storage details saved successfully.' });

      // Background sync to Google Sheets
      syncEventInBackground(event.id, currentFirmId, 'update');

      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Failed to update storage details', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><HardDriveIcon className="h-5 w-5" /> Storage Disk</DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Storage Disks</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDisk}
                  className="h-8 px-2"
                >
                  <Add01Icon className="h-3 w-3 mr-1" />
                  Add Disk
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {disks.map((disk, index) => (
                  <div key={disk.id} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <DiskDropdownSelect 
                        value={disk.name} 
                        onValueChange={(value) => updateDisk(disk.id, value)} 
                        placeholder={`Disk ${index + 1}...`}
                      />
                    </div>
                    {disks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDisk(disk.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Delete02Icon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={sizeValue}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  className="flex-1"
                />
                <Select value={unit} onValueChange={(v) => setUnit(v as 'GB' | 'TB')}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">GB</SelectItem>
                    <SelectItem value="TB">TB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !isValid}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DiskManagementDialog;