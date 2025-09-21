import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar01Icon, DollarCircleIcon, UserIcon } from 'hugeicons-react';
import { getEventTypeColors } from '@/lib/status-colors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any; // can be staff or freelancer (staff.is_freelancer flag)
  onSuccess?: () => void;
}

interface AssignmentDayItem {
  key: string; // eventId-day-role-personId
  event_id: string;
  event_title: string;
  day_number: number;
  role: string;
  date?: string | null;
  person_id: string; // staff_id or freelancer_id
  person_type: 'staff' | 'freelancer';
  rate: number; // current saved or default
  has_saved_rate: boolean;
  selected: boolean;
  event_type?: string;
  event_date?: string;
  client_name?: string;
}

const EventAssignmentRatesDialog: React.FC<Props> = ({ open, onOpenChange, staff, onSuccess }) => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AssignmentDayItem[]>([]);
  const [allItems, setAllItems] = useState<AssignmentDayItem[]>([]);
  const [bulkRate, setBulkRate] = useState<string>('');

  const isFreelancer = !!staff?.is_freelancer;



  // Set items directly from allItems
  useEffect(() => {
    setItems(allItems);
  }, [allItems]);

  useEffect(() => {
    if (!open || !staff?.id || !currentFirmId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staff?.id, currentFirmId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1) Fetch all assignments for this person with event details
      let query = supabase
        .from('event_staff_assignments')
        .select(`
          event_id,
          day_number,
          role,
          day_date,
          event:events(
            id, 
            title, 
            event_type, 
            event_date,
            client:clients(name)
          )
        `)
        .eq('firm_id', currentFirmId!)
        .order('day_number');

      // Apply person filter based on type
      if (isFreelancer) {
        query = query.eq('freelancer_id', staff.id).is('staff_id', null);
      } else {
        query = query.eq('staff_id', staff.id).is('freelancer_id', null);
      }

      const { data: assignments, error: aErr } = await query;

      if (aErr) throw aErr;

      const eventIds = Array.from(new Set((assignments || []).map(a => a.event_id)));

      // 2) Fetch any saved rates for these assignments
      const { data: savedRates, error: rErr } = await supabase
        .from('event_assignment_rates')
        .select('*')
        .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000'])
        .eq(isFreelancer ? 'freelancer_id' : 'staff_id', staff.id);

      if (rErr) throw rErr;

      // Try to get default rate for freelancer (with fallback fetch)
      let defaultFreelancerRate: number | undefined = undefined;
      if (isFreelancer) {
        if (staff?.rate !== undefined && staff?.rate !== null && !isNaN(Number(staff.rate))) {
          defaultFreelancerRate = Number(staff.rate);
        } else {
          const { data: fr } = await supabase
            .from('freelancers')
            .select('rate')
            .eq('id', staff.id)
            .single();
          if (fr?.rate !== undefined && fr?.rate !== null) {
            defaultFreelancerRate = Number(fr.rate);
          }
        }
      }

      const itemsBuilt: AssignmentDayItem[] = (assignments || []).map((a: any) => {
        const existing = (savedRates || []).find(r => r.event_id === a.event_id && r.day_number === a.day_number && r.role === a.role);
        const rate = existing?.rate ?? (defaultFreelancerRate || 0);
        return {
          key: `${a.event_id}-${a.day_number}-${a.role}-${staff.id}`,
          event_id: a.event_id,
          event_title: a.event?.title || 'Event',
          day_number: a.day_number,
          role: a.role,
          date: a.day_date,
          person_id: staff.id,
          person_type: isFreelancer ? 'freelancer' : 'staff',
          rate: Number(rate) || 0,
          has_saved_rate: !!existing,
          selected: false,
          event_type: a.event?.event_type,
          event_date: a.event?.event_date,
          client_name: a.event?.client?.name,
        };
      });

      // Sort by event date (recent first), then by day number
      const sortedItems = itemsBuilt.sort((a, b) => {
        const dateA = new Date(a.event_date || a.date || '');
        const dateB = new Date(b.event_date || b.date || '');
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime(); // Recent first
        }
        return a.day_number - b.day_number; // Then by day number
      });

      setAllItems(sortedItems);
      setItems(sortedItems);
    } catch (e: any) {
      console.error('Failed to load assignment data', e);
      toast({ title: 'Failed to load', description: e.message || 'Could not load assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const setAllSelected = (checked: boolean) => {
    setItems(prev => prev.map(i => ({ ...i, selected: checked })));
  };

  const quickFillRate = () => {
    if (isFreelancer && staff?.rate) {
      setItems(prev => prev.map(i => ({ ...i, rate: Number(staff.rate) })));
    }
  };

  const applyBulkRate = (scope: 'selected' | 'all') => {
    const value = Number(bulkRate || 0);
    setItems(prev => prev.map(i => (scope === 'all' || i.selected) ? { ...i, rate: value } : i));
  };

  const saveRates = async () => {
    try {
      setLoading(true);
      const groups = items.filter(i => i.selected);
      
      if (groups.length === 0) {
        toast({ title: 'No rates selected', description: 'Please select at least one rate to save.' });
        return;
      }

      // 🚀 OPTIMIZED: Batch operations for better performance
      // Step 1: Delete existing rates for selected items in a single operation
      const deletePromises = groups.map(i => 
        supabase
          .from('event_assignment_rates')
          .delete()
          .match({
            event_id: i.event_id,
            day_number: i.day_number,
            role: i.role,
            firm_id: currentFirmId!,
            [i.person_type === 'freelancer' ? 'freelancer_id' : 'staff_id']: i.person_id,
          })
      );

      // Execute deletes in parallel
      await Promise.allSettled(deletePromises);

      // Step 2: Insert new rates in a single batch
      const toInsert = groups.map(i => ({
        firm_id: currentFirmId!,
        event_id: i.event_id,
        day_number: i.day_number,
        role: i.role,
        rate: Number(i.rate) || 0,
        quantity: 1,
        staff_id: i.person_type === 'staff' ? i.person_id : null,
        freelancer_id: i.person_type === 'freelancer' ? i.person_id : null,
      }));

      if (toInsert.length) {
        const { error: insErr } = await supabase
          .from('event_assignment_rates')
          .insert(toInsert);
        
        if (insErr) throw insErr;
      }

      toast({ 
        title: 'Rates saved', 
        description: `Successfully saved ${groups.length} assignment rate${groups.length > 1 ? 's' : ''}.` 
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Failed to save rates', e);
      toast({ 
        title: 'Save failed', 
        description: e.message || 'Could not save rates', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarCircleIcon className="h-5 w-5" />
            <span className="break-words">Assignment Rates</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={items.every(i => i.selected) && items.length > 0} 
                onCheckedChange={(c) => setAllSelected(!!c)} 
              />
              <Label htmlFor="select-all" className="text-sm">Select all assignments</Label>
            </div>
            

            <div className="space-y-3">
              <Label className="font-medium text-sm">Bulk Rate Update</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  type="number" 
                  className="h-10 text-sm" 
                  value={bulkRate} 
                  onChange={(e) => setBulkRate(e.target.value)} 
                  min={0} 
                  step={0.01} 
                  placeholder="Enter rate amount"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="default" 
                    variant="outline" 
                    onClick={() => applyBulkRate('selected')} 
                    disabled={items.length === 0}
                    className="h-10 text-xs"
                  >
                    Selected
                  </Button>
                  <Button 
                    size="default" 
                    onClick={() => applyBulkRate('all')} 
                    disabled={items.length === 0}
                    className="h-10 text-xs"
                  >
                    All
                  </Button>
                </div>
              </div>
            </div>
          </div>


          {/* Assignments List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No assignments found.</div>
            ) : (
              items.map((i) => (
                <Card key={i.key} className="border">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Desktop Layout */}
                      <div className="hidden md:block">
                        {/* Row 1: Checkbox, Event Title, and Rate Input */}
                        <div className="flex items-center gap-3 mb-3">
                          <Checkbox
                            checked={i.selected}
                            onCheckedChange={(c) => setItems(prev => prev.map(p => p.key === i.key ? { ...p, selected: !!c } : p))}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 font-medium text-sm break-words min-w-0">
                            {i.event_title}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Label className="text-xs font-medium">₹</Label>
                            <Input
                              type="number"
                              className="w-20 h-8 text-xs"
                              value={Number(i.rate || 0)}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                setItems(prev => prev.map(p => p.key === i.key ? { ...p, rate: v } : p));
                              }}
                              min={0}
                              step={0.01}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Row 2: Client Details and Event Info */}
                        <div className="flex items-center justify-between gap-4 pl-8">
                          {/* Left: Client Info */}
                          <div className="flex-1 min-w-0">
                            {i.client_name && (
                              <div className="text-xs text-muted-foreground font-medium truncate">
                                Client: {i.client_name}
                              </div>
                            )}
                          </div>
                          
                          {/* Right: Event Details */}
                          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                            <span className="text-xs text-muted-foreground">Day {i.day_number}</span>
                            {i.event_type && (
                              <span className={`text-xs font-medium ${getEventTypeColors(i.event_type, 'text')}`}>
                                {i.event_type}
                              </span>
                            )}
                            {i.date && (() => {
                              const today = new Date();
                              const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              const d = new Date(i.date);
                              const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                              const diff = Math.ceil((dd.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
                              const statusInfo = dd < t
                                ? { label: 'COMPLETED', className: 'text-status-completed' }
                                : dd.getTime() === t.getTime()
                                  ? { label: 'IN PROGRESS', className: 'text-status-in-progress' }
                                  : (diff > 0 && diff <= 7)
                                    ? { label: 'UPCOMING', className: 'text-status-pending' }
                                    : { label: 'PENDING', className: 'text-status-draft' };
                              return (
                                <span className={`text-xs font-medium ${statusInfo.className}`}>
                                  {statusInfo.label}
                                </span>
                              );
                            })()}
                            {i.date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(i.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={i.selected}
                            onCheckedChange={(c) => setItems(prev => prev.map(p => p.key === i.key ? { ...p, selected: !!c } : p))}
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="font-medium text-sm break-words">{i.event_title}</div>
                            {i.client_name && (
                              <div className="text-xs text-muted-foreground font-medium">
                                Client: {i.client_name}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>Day {i.day_number}</span>
                              {i.event_type && (
                                <>
                                  <span>•</span>
                                  <span className={`font-medium ${getEventTypeColors(i.event_type, 'text')}`}>{i.event_type}</span>
                                </>
                              )}
                              {i.date && (
                                <>
                                  <span>•</span>
                                  {(() => {
                                    const today = new Date();
                                    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                    const d = new Date(i.date);
                                    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    const diff = Math.ceil((dd.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
                                    const status = dd < t
                                      ? { label: 'COMPLETED', className: 'text-status-completed' }
                                      : dd.getTime() === t.getTime()
                                        ? { label: 'IN PROGRESS', className: 'text-status-in-progress' }
                                        : (diff > 0 && diff <= 7)
                                          ? { label: 'UPCOMING', className: 'text-status-pending' }
                                          : { label: 'PENDING', className: 'text-status-draft' };
                                    return <span className={`font-medium ${status.className}`}>{status.label}</span>;
                                  })()}
                                  <span>•</span>
                                  <span>{new Date(i.date).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3 items-center mt-3">
                          <Label className="font-medium text-sm col-span-1">Rate (₹)</Label>
                          <Input
                            type="number"
                            className="col-span-3 h-10 text-sm"
                            value={Number(i.rate || 0)}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setItems(prev => prev.map(p => p.key === i.key ? { ...p, rate: v } : p));
                            }}
                            min={0}
                            step={0.01}
                            placeholder="Enter rate"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs text-muted-foreground text-center break-words">
              Save rates first, then use Pay button to make payments.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={loading}
                className="h-10 text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveRates} 
                disabled={loading}
                className="h-10 text-sm"
              >
                {loading ? 'Saving...' : 'Save Rates'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventAssignmentRatesDialog;