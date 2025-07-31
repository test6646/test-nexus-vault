import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Quotation } from '@/types/studio';

interface SmartClientQuotationSelectorProps {
  selectedClientId: string | null;
  onQuotationSelect: (quotation: Quotation | null) => void;
  selectedQuotationId?: string;
}

const SmartClientQuotationSelector = ({ 
  selectedClientId, 
  onQuotationSelect, 
  selectedQuotationId 
}: SmartClientQuotationSelectorProps) => {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClientId && profile?.current_firm_id) {
      fetchClientQuotations();
    } else {
      setQuotations([]);
      onQuotationSelect(null);
    }
  }, [selectedClientId, profile?.current_firm_id]);

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
        .eq('firm_id', profile?.current_firm_id)
        .is('converted_to_event', null) // Only unconverted quotations
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error: any) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no quotations are found
  if (!quotations.length && !loading) {
    return null;
  }

  if (!selectedClientId) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Active Quotation</Label>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading quotations...</div>
      ) : quotations.length > 0 ? (
        <Select value={selectedQuotationId || ''} onValueChange={(value) => {
          const selected = quotations.find(q => q.id === value) || null;
          onQuotationSelect(selected);
        }}>
          <SelectTrigger className="rounded-full h-10">
            <SelectValue placeholder="Select quotation" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg">
            {quotations.map((quotation) => (
              <SelectItem key={quotation.id} value={quotation.id} className="hover:bg-accent">
                <div className="text-left">
                  <div className="font-medium">{quotation.title}</div>
                  <div className="text-xs text-muted-foreground">
                    ₹{quotation.amount.toLocaleString()} • {new Date(quotation.event_date).toLocaleDateString()}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="text-xs text-muted-foreground">No active quotations found</div>
      )}
    </div>
  );
};

export default SmartClientQuotationSelector;