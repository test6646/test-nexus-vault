
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Add01Icon } from 'hugeicons-react';
import { Client, EventType } from '@/types/studio';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';

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
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: undefined,
    venue: '',
    description: '',
    valid_until: undefined
  });

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quotation</DialogTitle>
          <DialogDescription>
            Create a new quotation for a potential project. Fill in the details below.
          </DialogDescription>
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
                  onSelect={(date) => setFormData({ ...formData, event_date: date })}
                  value={formData.event_date}
                  placeholder="Select event date"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="Enter event venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <div className="h-10">
                <InlineDatePicker
                  onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                  value={formData.valid_until}
                  placeholder="Select validity date"
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
          <div className="flex justify-end space-x-2">
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
