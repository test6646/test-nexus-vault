
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FirmCreationDialog from '@/components/FirmCreationDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const FirmSelector = () => {
  const { 
    profile, 
    currentFirmId, 
    currentFirm, 
    firms, 
    updateCurrentFirm, 
    loadFirms,
    loading 
  } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [firmDialogOpen, setFirmDialogOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();


  const handleFirmSelect = (firmId: string) => {
    updateCurrentFirm(firmId);
    setFirmDialogOpen(false);
    toast({
      title: "Firm switched",
      description: "Successfully switched to the selected firm.",
    });
  };

  const handleFirmCreated = async (newFirmId?: string) => {
    await loadFirms();
    if (newFirmId) {
      updateCurrentFirm(newFirmId);
    }
    setCreateDialogOpen(false);
  };

  const FirmSelectionContent = () => (
    <div className="max-h-[70vh] md:max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b pr-12">
        <h3 className="text-base sm:text-lg font-semibold">Select Firm</h3>
        <Badge variant="secondary" className="text-xs px-2 py-1 ml-2">
          {firms.length}
        </Badge>
      </div>
      
      {firms.length === 0 ? (
        <div className="p-4 sm:p-6 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
          <p className="text-xs sm:text-sm mb-1 sm:mb-2">No firms available</p>
          <p className="text-xs opacity-75">Create your first firm to get started</p>
        </div>
      ) : (
        <div className="p-2 sm:p-3 space-y-2">
          {firms.map((firm) => (
            <Button
              key={firm.id}
              variant="ghost"
              onClick={() => handleFirmSelect(firm.id)}
              className={`w-full justify-start h-auto p-3 sm:p-4 rounded-full border-2 border-dashed transition-all ${
                firm.id === currentFirmId 
                  ? 'border-primary bg-primary/5 text-primary font-medium shadow-sm' 
                  : 'border-border/40 hover:border-primary/50 hover:bg-accent/30'
              }`}
            >
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs sm:text-sm font-medium truncate">{firm.name}</p>
              </div>
              {firm.id === currentFirmId && (
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full ml-2 flex-shrink-0" />
              )}
            </Button>
          ))}
        </div>
      )}

      <div className="border-t p-2 sm:p-3">
        <Button 
          variant="outline"
          onClick={() => {
            setCreateDialogOpen(true);
            setFirmDialogOpen(false);
          }}
          className="w-full justify-center text-xs sm:text-sm py-2 sm:py-2.5 rounded-full border-2 border-dashed border-border/40 hover:border-primary/50 hover:bg-accent/30"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span>Create New Firm</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={firmDialogOpen} onOpenChange={setFirmDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-accent/50 transition-colors"
            disabled={loading}
            title={`Current Firm: ${currentFirm?.name || 'No firm selected'}`}
          >
            <Building2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[420px] sm:max-w-[450px] p-0 bg-card mx-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Firm</DialogTitle>
          </DialogHeader>
          <FirmSelectionContent />
        </DialogContent>
      </Dialog>

      <FirmCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFirmCreated={handleFirmCreated}
      />
    </>
  );
};

export default FirmSelector;
