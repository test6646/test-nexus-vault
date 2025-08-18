import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { Event, Client, EventFormData } from '@/types/studio';
import type { Database } from '@/integrations/supabase/types';

type EventType = Database['public']['Enums']['event_type'];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Ring-Ceremony', label: 'Ring Ceremony' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Maternity Photography', label: 'Maternity Photography' },
  { value: 'Others', label: 'Others' }
];

interface EventFormHeaderProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  extendedData: {
    advance_amount: number;
    total_days: number;
    same_day_editor: boolean;
  };
  setExtendedData: React.Dispatch<React.SetStateAction<{
    advance_amount: number;
    total_days: number;
    same_day_editor: boolean;
  }>>;
  clients: Client[];
  currentEvent: Event | null;
  isEventFromQuotation: boolean;
}

const EventFormHeader: React.FC<EventFormHeaderProps> = ({
  formData,
  setFormData,
  extendedData,
  setExtendedData,
  clients,
  currentEvent,
  isEventFromQuotation
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Event Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Event Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Event Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              required
              className="rounded-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Client</Label>
            <Select 
              value={formData.client_id} 
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              disabled={isEventFromQuotation}
            >
              <SelectTrigger className="rounded-full">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Event Type</Label>
            <Select 
              value={formData.event_type} 
              onValueChange={(value: EventType) => setFormData({ ...formData, event_type: value })}
              disabled={isEventFromQuotation}
            >
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Event Date
            </Label>
            <InlineDatePicker
              value={formData.event_date ? new Date(formData.event_date) : undefined}
              onSelect={(date) => setFormData({ ...formData, event_date: date ? date.toISOString().split('T')[0] : '' })}
              placeholder="DD/MM/YYYY"
              className=""
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Total Days</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={extendedData.total_days}
              onChange={(e) => setExtendedData({ ...extendedData, total_days: parseInt(e.target.value) || 1 })}
              placeholder="Enter total days"
              className="rounded-full"
              disabled={isEventFromQuotation}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Venue</Label>
          <Input
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            placeholder="Enter venue location"
            className="rounded-full"
          />
        </div>
      </div>

      {/* Financial Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Total Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
              placeholder="Enter total amount"
              className="rounded-full"
              disabled={isEventFromQuotation}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Advance Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              value={extendedData.advance_amount}
              onChange={(e) => setExtendedData({ ...extendedData, advance_amount: parseFloat(e.target.value) || 0 })}
              placeholder="Enter advance amount"
              className="rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Details</h3>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Event description and additional notes"
            rows={3}
            className="resize-none h-20"
          />
        </div>
      </div>
    </div>
  );
};

export default EventFormHeader;