
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FirmCreationDialog from '@/components/FirmCreationDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface Firm {
  id: string;
  name: string;
  created_by: string;
}

const FirmSelector = () => {
  const { profile, updateCurrentFirm, refreshProfile } = useAuth();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (profile?.user_id) {
      loadFirms();
    }
  }, [profile?.user_id]);

  // Auto-refresh firms when profile changes (after firm creation)
  useEffect(() => {
    if (profile?.current_firm_id && firms.length === 0) {
      loadFirms();
    }
  }, [profile?.current_firm_id]);

  const loadFirms = async () => {
    if (!profile?.user_id) return;

    setLoading(true);
    try {
      
      
      // Get firms where user is the creator
      const { data: ownedFirms, error: ownedError } = await supabase
        .from('firms')
        .select('*')
        .eq('created_by', profile.user_id);

      if (ownedError) throw ownedError;

      // Get firms where user is a member
      const { data: memberFirms, error: memberError } = await supabase
        .from('firm_members')
        .select(`
          firm_id,
          firms!inner(*)
        `)
        .eq('user_id', profile.user_id);

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      // Combine and deduplicate firms
      const allFirms = [
        ...(ownedFirms || []),
        ...(memberFirms?.map(m => m.firms).filter(Boolean) || [])
      ];

      // Remove duplicates based on firm id
      const uniqueFirms = allFirms.filter((firm, index, self) => 
        index === self.findIndex(f => f.id === firm.id)
      );

      setFirms(uniqueFirms);

      // If no current firm is selected but firms exist, select the first one
      if (!profile.current_firm_id && uniqueFirms.length > 0) {
        await handleFirmSelect(uniqueFirms[0].id);
      }
    } catch (error: any) {
      console.error('❌ Error loading firms:', error);
      toast({
        title: "Error loading firms",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFirmSelect = async (firmId: string) => {
    try {
      
      await updateCurrentFirm(firmId);
      setDropdownOpen(false);
      toast({
        title: "Firm switched",
        description: "Successfully switched to the selected firm.",
      });
    } catch (error: any) {
      toast({
        title: "Error switching firm",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFirmCreated = async (newFirmId?: string) => {
    
    
    // If we have a firm ID and it's not already current, reload everything
    if (newFirmId && profile?.current_firm_id !== newFirmId) {
      await loadFirms();
    } else {
      // Just refresh the profile and firms list
      await refreshProfile();
      await loadFirms();
    }
    
    setCreateDialogOpen(false);
  };

  const currentFirm = firms.find(f => f.id === profile?.current_firm_id);

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={`h-9 px-3 rounded-full hover:bg-muted/50 transition-all duration-200 ${
              isMobile ? 'max-w-[120px]' : 'max-w-32'
            }`}
            disabled={loading}
          >
            <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {currentFirm?.name || 'Select Firm'}
            </span>
            <ChevronDown className="h-3 w-3 ml-2 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={`shadow-xl border-border/50 bg-popover ${
            isMobile ? 'w-64' : 'w-64'
          }`} 
          align="center"
          side={isMobile ? "bottom" : "bottom"}
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Select Firm</span>
            <Badge variant="secondary" className="text-xs">
              {firms.length} {firms.length === 1 ? 'firm' : 'firms'}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {firms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No firms available</p>
              <p className="text-xs">Create your first firm to get started</p>
            </div>
          ) : (
            firms.map((firm) => (
              <DropdownMenuItem
                key={firm.id}
                onClick={() => handleFirmSelect(firm.id)}
                className={`cursor-pointer ${
                  firm.id === profile?.current_firm_id 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : ''
                }`}
              >
                <Building2 className="h-4 w-4 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{firm.name}</p>
                  {firm.created_by === profile?.user_id && (
                    <Badge variant="outline" className="text-xs mt-1">Owner</Badge>
                  )}
                </div>
                {firm.id === profile?.current_firm_id && (
                  <div className="w-2 h-2 bg-primary rounded-full ml-2" />
                )}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              setCreateDialogOpen(true);
              setDropdownOpen(false);
            }}
            className="cursor-pointer text-primary hover:text-primary"
          >
            <Plus className="h-4 w-4 mr-3" />
            <span>Create New Firm</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FirmCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFirmCreated={handleFirmCreated}
      />
    </>
  );
};

export default FirmSelector;
