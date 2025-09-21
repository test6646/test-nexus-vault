
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { VenueDropdownSelect } from '@/components/forms/VenueDropdownSelect';
import { Add01Icon } from 'hugeicons-react';
import { Client, EventType, Quotation } from '@/types/studio';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: Date | undefined;
  venue: string;
  description: string;
  valid_until: Date | undefined;
}

interface QuotationFormDialogProps {
  clients: Client[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: QuotationFormData) => void;
  onNewQuotation: () => void;
  editingQuotation?: Quotation | null;
  formData?: {
    title: string;
    client_id: string;
    event_type: EventType;
    event_date: string;
    venue: string;
    description: string;
    valid_until: string;
  };
  disabled?: boolean;
}

const eventTypes: EventType[] = ['Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others'];

const QuotationFormDialog = ({ clients, isOpen, onOpenChange, onSubmit, onNewQuotation, editingQuotation, formData: initialFormData, disabled = false }: QuotationFormDialogProps) => {
  const { currentFirmId } = useAuth();
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: undefined,
    venue: '',
    description: '',
    valid_until: undefined
  });

  // Initialize form data when editing or dialog opens
  useEffect(() => {
    if (editingQuotation && initialFormData) {
      setFormData({
        title: initialFormData.title,
        client_id: initialFormData.client_id,
        event_type: initialFormData.event_type as EventType,
        event_date: initialFormData.event_date ? new Date(initialFormData.event_date) : undefined,
        venue: initialFormData.venue,
        description: initialFormData.description,
        valid_until: initialFormData.valid_until ? new Date(initialFormData.valid_until) : undefined
      });
    } else if (!editingQuotation) {
      // Reset to default when not editing
      setFormData({
        title: '',
        client_id: '',
        event_type: 'Wedding',
        event_date: undefined,
        venue: '',
        description: '',
        valid_until: undefined
      });
    }
  }, [editingQuotation, initialFormData]);

  // Calculate default expiry date based on event date
  const calculateDefaultExpiry = (eventDate: Date) => {
    const today = new Date();
    const thirtyDaysFromToday = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const oneDayBeforeEvent = new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    // Return whichever is shorter
    return thirtyDaysFromToday < oneDayBeforeEvent ? thirtyDaysFromToday : oneDayBeforeEvent;
  };


  // Memoize event date time to prevent unnecessary re-renders
  const eventDateTime = useMemo(() => formData.event_date?.getTime(), [formData.event_date]);

  // Auto-set expiry date when event date changes (only when not editing)
  useEffect(() => {
    if (formData.event_date && !editingQuotation) {
      const defaultExpiry = calculateDefaultExpiry(formData.event_date);
      setFormData(prev => ({ ...prev, valid_until: defaultExpiry }));
    }
  }, [eventDateTime, editingQuotation]);

  // Validate event date (must be future date)
  const isValidEventDate = (date: Date | undefined) => {
    if (!date) return true; // Allow empty date
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };


  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate event date
    if (formData.event_date && !isValidEventDate(formData.event_date)) {
      return; // Don't submit if event date is invalid
    }
    
    // Validate required fields
    if (!formData.title || !formData.client_id || !formData.event_date) {
      return; // Don't submit if required fields are missing
    }
    
    onSubmit(formData);
  }, [formData, onSubmit]);

  // Memoize client options to prevent re-creation
  const clientOptions = useMemo(() => 
    clients.map(client => ({
      value: client.id,
      label: client.name
    })), [clients]);

  // Memoize field change handlers
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);

  const handleClientChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, client_id: value }));
  }, []);

  const handleEventTypeChange = useCallback((value: EventType) => {
    setFormData(prev => ({ ...prev, event_type: value }));
  }, []);

  const handleEventDateChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, event_date: date }));
  }, []);

  const handleVenueChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, venue: value }));
  }, []);

  const handleValidUntilChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, valid_until: date }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onNewQuotation} className="rounded-full p-3" disabled={disabled}>
          <Add01Icon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>{editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quotation Title *</Label>
              <Input
                id="title"
                placeholder="Enter quotation title"
                value={formData.title}
                onChange={handleTitleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <SearchableSelect
                value={formData.client_id}
                onValueChange={handleClientChange}
                options={clientOptions}
                placeholder="Select a client"
                
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={handleEventTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date *</Label>
              <div className="h-10">
                <InlineDatePicker
                  onSelect={handleEventDateChange}
                  value={formData.event_date}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              {formData.event_date && !isValidEventDate(formData.event_date) && (
                <p className="text-sm text-destructive">Event date must be in the future</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <VenueDropdownSelect
                  value={formData.venue}
                  onValueChange={handleVenueChange}
                  placeholder="Select or add venue..."
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <div className="h-10">
                <InlineDatePicker
                  onSelect={handleValidUntilChange}
                  value={formData.valid_until}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter quotation description"
              value={formData.description}
              onChange={handleDescriptionChange}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full">
              {editingQuotation ? 'Update' : 'Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
