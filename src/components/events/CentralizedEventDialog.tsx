import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { CentralizedEvent } from '@/hooks/useCentralizedEvents';
import { EventType } from '@/types/studio';

interface CentralizedEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CentralizedEvent | null;
  onSave: (eventData: any, assignments: any[]) => Promise<any>;
}

const CentralizedEventDialog = ({ open, onOpenChange, event, onSave }: CentralizedEventDialogProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    event_type: 'Wedding' as EventType,
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
    total_days: 1
  });

  // Assignment state - simplified
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        client_id: event.client_id || '',
        event_type: event.event_type as EventType,
        event_date: event.event_date,
        venue: event.venue || '',
        description: event.description || '',
        total_amount: event.total_amount,
        total_days: 1 // TODO: Get from event
      });
      setAssignments(event.assignments || []);
    } else {
      setFormData({
        title: '',
        client_id: '',
        event_type: 'Wedding',
        event_date: '',
        venue: '',
        description: '',
        total_amount: 0,
        total_days: 1
      });
      setAssignments([]);
    }
  }, [event]);

  const loadData = async () => {
    if (!profile?.current_firm_id) return;

    try {
      const [clientsRes, staffRes, freelancersRes] = await Promise.all([
        supabase.from('clients').select('*').eq('firm_id', profile.current_firm_id),
        supabase.from('profiles').select('*').eq('firm_id', profile.current_firm_id),
        supabase.from('freelancers').select('*').eq('firm_id', profile.current_firm_id)
      ]);

      setClients(clientsRes.data || []);
      setStaff(staffRes.data || []);
      setFreelancers(freelancersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const eventData = {
        ...formData,
        firm_id: profile?.current_firm_id,
        ...(event?.id && { id: event.id })
      };

      await onSave(eventData, assignments);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = () => {
    setAssignments(prev => [...prev, {
      person_id: '',
      person_type: 'staff',
      role: 'Photographer',
      day_number: 1,
      rate: 0
    }]);
  };

  const updateAssignment = (index: number, field: string, value: any) => {
    setAssignments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const allPeople = [
    ...staff.map(s => ({ id: s.id, name: s.full_name, type: 'staff', role: s.role })),
    ...freelancers.map(f => ({ id: f.id, name: f.full_name, type: 'freelancer', role: f.role }))
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
              />
            </div>
            
            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value as EventType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Pre-Wedding">Pre-Wedding</SelectItem>
                  <SelectItem value="Ring-Ceremony">Ring Ceremony</SelectItem>
                  <SelectItem value="Maternity Photography">Maternity Photography</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="Event venue"
              />
            </div>

            <div>
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Event description (optional)"
              rows={3}
            />
          </div>

          {/* Staff Assignments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Staff Assignments</h3>
              <Button type="button" onClick={addAssignment} variant="outline" size="sm">
                Add Assignment
              </Button>
            </div>

            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-5 p-3 border rounded-lg">
                  <div>
                    <Label>Person Type</Label>
                    <Select 
                      value={assignment.person_type} 
                      onValueChange={(value) => updateAssignment(index, 'person_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Person</Label>
                    <Select 
                      value={assignment.person_id} 
                      onValueChange={(value) => updateAssignment(index, 'person_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPeople
                          .filter(p => p.type === assignment.person_type)
                          .map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name} ({person.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Role</Label>
                    <Select 
                      value={assignment.role} 
                      onValueChange={(value) => updateAssignment(index, 'role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Photographer">Photographer</SelectItem>
                        <SelectItem value="Cinematographer">Cinematographer</SelectItem>
                        <SelectItem value="Drone Pilot">Drone Pilot</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Rate</Label>
                    <Input
                      type="number"
                      value={assignment.rate}
                      onChange={(e) => updateAssignment(index, 'rate', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      onClick={() => removeAssignment(index)} 
                      variant="destructive" 
                      size="sm"
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CentralizedEventDialog;