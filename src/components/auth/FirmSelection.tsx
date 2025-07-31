
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Alert02Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Firm {
  id: string;
  name: string;
}

interface FirmSelectionProps {
  selectedFirmId: string;
  onFirmChange: (firmId: string) => void;
  userRole: string;
}

const FirmSelection = ({ selectedFirmId, onFirmChange, userRole }: FirmSelectionProps) => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userRole !== 'Admin') {
      loadFirms();
    }
  }, [userRole]);

  const loadFirms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('firms')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFirms(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading firms",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (userRole === 'Admin') return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="signup-firm">Select Firm *</Label>
      <Select value={selectedFirmId} onValueChange={onFirmChange}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading firms..." : "Select a firm to join"} />
        </SelectTrigger>
        <SelectContent>
          {firms.map((firm) => (
            <SelectItem key={firm.id} value={firm.id}>
              {firm.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {firms.length === 0 && !loading && (
        <Alert>
          <Alert02Icon className="h-4 w-4" />
          <AlertDescription>
            No firms are currently available. Please contact an admin to create a firm, 
            or register as an Admin to create your own firm.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FirmSelection;
