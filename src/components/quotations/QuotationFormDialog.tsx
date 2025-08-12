
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Add01Icon } from 'hugeicons-react';
import { Client, EventType } from '@/types/studio';
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
}

const eventTypes: EventType[] = ['Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others'];

const QuotationFormDialog = ({ clients, isOpen, onOpenChange, onSubmit, onNewQuotation }: QuotationFormDialogProps) => {
  const { currentFirmId } = useAuth();
  const [venueSuggestions, setVenueSuggestions] = useState<string[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: undefined,
    venue: '',
    description: '',
    valid_until: undefined
  });

  // Calculate default expiry date based on event date
  const calculateDefaultExpiry = (eventDate: Date) => {
    const today = new Date();
    const thirtyDaysFromToday = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const oneDayBeforeEvent = new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    // Return whichever is shorter
    return thirtyDaysFromToday < oneDayBeforeEvent ? thirtyDaysFromToday : oneDayBeforeEvent;
  };

  // Load venue suggestions from database
  const loadVenueSuggestions = async () => {
    if (!currentFirmId) return;
    
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

      const venues = new Set<string>();
      
      if (eventsData.data) {
        eventsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) venues.add(item.venue.trim());
        });
      }
      
      if (quotationsData.data) {
        quotationsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) venues.add(item.venue.trim());
        });
      }

      setVenueSuggestions(Array.from(venues).sort());
    } catch (error) {
      console.error('Error loading venue suggestions:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVenueSuggestions();
    }
  }, [isOpen, currentFirmId]);

  // Auto-set expiry date when event date changes (only for new forms)
  useEffect(() => {
    if (formData.event_date && isOpen) {
      const defaultExpiry = calculateDefaultExpiry(formData.event_date);
      setFormData(prev => ({ ...prev, valid_until: defaultExpiry }));
    }
  }, [formData.event_date, isOpen]);

  // Validate event date (must be future date)
  const isValidEventDate = (date: Date | undefined) => {
    if (!date) return true; // Allow empty date
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      client_id: '',
      event_type: 'Wedding',
      event_date: undefined,
      venue: '',
      description: '',
      valid_until: undefined
    });
    setShowVenueSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    resetForm();
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onNewQuotation} className="rounded-full p-3">
          <Add01Icon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>Create New Quotation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quotation Title *</Label>
              <Input
                id="title"
                placeholder="Enter quotation title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value: EventType) => setFormData({ ...formData, event_type: value })}
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
                  onSelect={(date) => {
                    setFormData({ ...formData, event_date: date });
                  }}
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
              <div className="relative">
                <Input
                  id="venue"
                  placeholder="Type venue name..."
                  value={formData.venue}
                  onFocus={() => setShowVenueSuggestions(true)}
                  onBlur={() => {
                    // Delay hiding to allow clicking on suggestions
                    setTimeout(() => setShowVenueSuggestions(false), 150);
                  }}
                  onChange={(e) => {
                    setFormData({ ...formData, venue: e.target.value });
                    setShowVenueSuggestions(true);
                  }}
                  className="pr-8"
                />
                {showVenueSuggestions && formData.venue && venueSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto bg-background border border-border rounded-md shadow-lg">
                    {venueSuggestions
                      .filter(venue => venue.toLowerCase().includes(formData.venue.toLowerCase()))
                      .slice(0, 10)
                      .map((venue, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur
                            setFormData({ ...formData, venue });
                            setShowVenueSuggestions(false);
                          }}
                        >
                          {venue}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <div className="h-10">
                <InlineDatePicker
                  onSelect={(date) => setFormData({ ...formData, valid_until: date })}
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full">
              Continue to Builder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
