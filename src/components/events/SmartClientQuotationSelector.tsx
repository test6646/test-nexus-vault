import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Quotation } from '@/types/studio';

interface SmartClientQuotationSelectorProps {
  selectedClientId: string | null;
  onQuotationSelect: (quotation: Quotation | null) => void;
  selectedQuotationId?: string;
  isEditMode?: boolean;
  existingQuotation?: Quotation | null;
}

const SmartClientQuotationSelector = ({ 
  selectedClientId, 
  onQuotationSelect, 
  selectedQuotationId,
  isEditMode = false,
  existingQuotation = null
}: SmartClientQuotationSelectorProps) => {
  const { profile, currentFirmId } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClientId && currentFirmId) {
      fetchClientQuotations();
    } else {
      setQuotations([]);
      onQuotationSelect(null);
    }
  }, [selectedClientId, currentFirmId]);

  const fetchClientQuotations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('client_id', selectedClientId)
        .eq('firm_id', currentFirmId)
        .is('converted_to_event', null) // Only unconverted quotations
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error: any) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  // If a specific quotation is linked (edit mode), always show it
  if (existingQuotation) {
    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium">Selected Quotation</Label>
        <div className="flex h-10 w-full rounded-full border-2 border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm opacity-50 cursor-not-allowed">
          <div className="flex-1 text-left">
            <div className="font-medium text-sm truncate">{existingQuotation.title || 'Untitled Quotation'}</div>
            <div className="text-xs text-muted-foreground truncate">
              ₹{((existingQuotation.discount_amount && existingQuotation.discount_amount > 0) 
                ? (existingQuotation.amount - existingQuotation.discount_amount) 
                : existingQuotation.amount || 0).toLocaleString()} • {new Date(existingQuotation.event_date || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Note: keep rendering even if there are no quotations to show an empty state


  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Active Quotation</Label>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading quotations...</div>
      ) : quotations.length > 0 ? (
        <SearchableSelect
          value={selectedQuotationId || ''}
          onValueChange={(value) => {
            const selected = quotations.find(q => q.id === value) || null;
            onQuotationSelect(selected);
          }}
          options={quotations.map(quotation => ({
            value: quotation.id,
            label: `${quotation.title || 'Untitled Quotation'} - ₹${((quotation.discount_amount && quotation.discount_amount > 0) 
              ? (quotation.amount - quotation.discount_amount) 
              : quotation.amount || 0).toLocaleString()} • ${new Date(quotation.event_date || Date.now()).toLocaleDateString()}`
          }))}
          placeholder="Select quotation"
          
          className="rounded-full h-10"
        />
      ) : (
        <div className="text-xs text-muted-foreground">No active quotations found</div>
      )}
    </div>
  );
};

export default SmartClientQuotationSelector;