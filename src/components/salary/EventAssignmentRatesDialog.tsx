import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar01Icon, DollarCircleIcon, UserIcon } from 'hugeicons-react';

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
}

const EventAssignmentRatesDialog: React.FC<Props> = ({ open, onOpenChange, staff, onSuccess }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AssignmentDayItem[]>([]);
  const [bulkRate, setBulkRate] = useState<string>('');

  const isFreelancer = !!staff?.is_freelancer;

  const summary = useMemo(() => {
    const uniqueEvents = new Set(items.map(i => i.event_id));
    const selectedDays = items.filter(i => i.selected).length;
    return { events: uniqueEvents.size, days: items.length, selectedDays };
  }, [items]);

  useEffect(() => {
    if (!open || !staff?.id || !profile?.current_firm_id) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staff?.id, profile?.current_firm_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1) Fetch all assignments for this person
      const personFilter = isFreelancer ? { freelancer_id: staff.id } : { staff_id: staff.id };

      const { data: assignments, error: aErr } = await supabase
        .from('event_staff_assignments')
        .select(`
          event_id,
          day_number,
          role,
          day_date,
          event:events(id, title)
        `)
        .match(personFilter)
        .eq('firm_id', profile!.current_firm_id)
        .order('day_number');

      if (aErr) throw aErr;

      const eventIds = Array.from(new Set((assignments || []).map(a => a.event_id)));

      // 2) Fetch any saved rates for these assignments
      const { data: savedRates, error: rErr } = await supabase
        .from('event_assignment_rates')
        .select('*')
        .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000'])
        .eq(isFreelancer ? 'freelancer_id' : 'staff_id', staff.id);

      if (rErr) throw rErr;

      // Try to get default rate for freelancer
      let defaultFreelancerRate: number | undefined = undefined;
      if (isFreelancer) {
        defaultFreelancerRate = Number(staff?.rate) || undefined;
      }

      const itemsBuilt: AssignmentDayItem[] = (assignments || []).map((a: any) => {
        const existing = (savedRates || []).find(r => r.event_id === a.event_id && r.day_number === a.day_number && r.role === a.role);
        const rate = existing?.rate ?? (defaultFreelancerRate ?? 0);
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
          selected: true,
        };
      });

      setItems(itemsBuilt);
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
      // For simplicity: delete existing rows for selected items, then insert fresh
      const groups = items.filter(i => i.selected);
      // Delete existing in batches per item (to respect RLS and indexes)
      await Promise.all(groups.map(async (i) => {
        const del = supabase
          .from('event_assignment_rates')
          .delete()
          .match({
            event_id: i.event_id,
            day_number: i.day_number,
            role: i.role,
            firm_id: profile!.current_firm_id,
            [i.person_type === 'freelancer' ? 'freelancer_id' : 'staff_id']: i.person_id,
          });
        const { error: delErr } = await del;
        if (delErr) console.warn('Delete existing rate failed (safe to ignore if none):', delErr.message);
      }));

      // Insert new rates
      const toInsert = groups.map(i => ({
        firm_id: profile!.current_firm_id,
        event_id: i.event_id,
        day_number: i.day_number,
        role: i.role,
        rate: Number(i.rate) || 0,
        quantity: 1,
        staff_id: i.person_type === 'staff' ? i.person_id : null,
        freelancer_id: i.person_type === 'freelancer' ? i.person_id : null,
      }));

      if (toInsert.length) {
        const { error: insErr } = await supabase.from('event_assignment_rates').insert(toInsert);
        if (insErr) throw insErr;
      }

      toast({ title: 'Rates saved', description: 'Assignment rates saved successfully.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Failed to save rates', e);
      toast({ title: 'Save failed', description: e.message || 'Could not save rates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarCircleIcon className="h-5 w-5" />
            {isFreelancer ? 'Set Freelancer Assignment Rates' : 'Set Staff Assignment Rates'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">{staff?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{staff?.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Events: {summary.events}</Badge>
                  <Badge variant="outline">Days: {summary.days}</Badge>
                  <Badge variant="secondary">Selected: {summary.selectedDays}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="select-all" 
                checked={items.every(i => i.selected) && items.length > 0} 
                onCheckedChange={(c) => setAllSelected(!!c)} 
              />
              <Label htmlFor="select-all">Select all assignments</Label>
            </div>
            {isFreelancer && (
              <Button size="sm" variant="outline" onClick={quickFillRate}>
                Use default rate ₹{Number(staff?.rate || 0).toLocaleString()}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Set same rate</Label>
              <Input type="number" className="w-32" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} min={0} step={0.01} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => applyBulkRate('selected')} disabled={items.length === 0}>Apply to selected</Button>
              <Button size="sm" onClick={() => applyBulkRate('all')} disabled={items.length === 0}>Apply to all</Button>
            </div>
          </div>

          <div className="max-h-[40vh] overflow-auto space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No assignments found.</div>
            ) : (
              items.map((i) => (
                <Card key={i.key} className="border-border/60">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={i.selected}
                        onCheckedChange={(c) => setItems(prev => prev.map(p => p.key === i.key ? { ...p, selected: !!c } : p))}
                      />
                      <div>
                        <div className="font-medium text-sm">{i.event_title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline">Day {i.day_number}</Badge>
                          <Badge variant="outline">{i.role}</Badge>
                          {i.date ? (
                            <span className="inline-flex items-center gap-1"><Calendar01Icon className="h-3 w-3" /> {new Date(i.date).toLocaleDateString()}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-[220px] justify-end">
                      <Label className="text-xs">Rate (₹)</Label>
                      <Input
                        type="number"
                        className="w-28"
                        value={Number(i.rate || 0)}
                        onChange={(e) => {
                          const v = Number(e.target.value || 0);
                          setItems(prev => prev.map(p => p.key === i.key ? { ...p, rate: v } : p));
                        }}
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Click "Save Rates" to save your assignment rates. Use the Pay button from the main salary page to make payments.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button onClick={saveRates} disabled={loading}>
                Save Rates
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventAssignmentRatesDialog;