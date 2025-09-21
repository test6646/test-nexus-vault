import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building02Icon, Edit01Icon, Delete01Icon, PaintBoardIcon, MoneyBag02Icon } from 'hugeicons-react';
import FirmDetailsDialog from '@/components/FirmDetailsDialog';
import PricingConfigurationDialog from '@/components/profile/PricingConfigurationDialog';

const FirmManagement = () => {
  const { profile, refreshProfile, currentFirmId } = useAuth();
  const { toast } = useToast();
  
  // Only allow Admin users to access firm management
  if (profile?.role !== 'Admin') {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <Building02Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">Only administrators can manage firm settings.</p>
        </CardContent>
      </Card>
    );
  }
  
  const [currentFirm, setCurrentFirm] = useState<any>(null);
  const [renameFirmName, setRenameFirmName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCurrentFirm = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data: firm, error } = await supabase
        .from('firms')
        .select('*')
        .eq('id', currentFirmId)
        .single();

      if (error) throw error;
      setCurrentFirm(firm);
    } catch (error: any) {
      console.error('Error fetching firm:', error);
    }
  };

  useEffect(() => {
    fetchCurrentFirm();
  }, [currentFirmId]);

  const handleRenameFirm = async () => {
    if (!currentFirm || !renameFirmName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid firm name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('firms')
        .update({ name: renameFirmName.trim() })
        .eq('id', currentFirm.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Firm name updated successfully",
      });
      
      setRenameDialogOpen(false);
      setRenameFirmName('');
      refreshProfile();
      
      // Refetch firm data
      const { data: updatedFirm } = await supabase
        .from('firms')
        .select('*')
        .eq('id', currentFirm.id)
        .single();
      
      if (updatedFirm) {
        setCurrentFirm(updatedFirm);
      }
    } catch (error: any) {
      toast({
        title: "Error updating firm name",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFirm = async () => {
    if (!currentFirm) return;

    setLoading(true);
    try {
      // First check if there are any dependent records
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('firm_id', currentFirm.id)
        .limit(1);

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('firm_id', currentFirm.id)
        .limit(1);

      if (events && events.length > 0 || clients && clients.length > 0) {
        toast({
          title: "Cannot delete firm",
          description: "This firm has existing data (events, clients, etc.). Please remove all data first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('firms')
        .delete()
        .eq('id', currentFirm.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Firm deleted successfully",
      });
      
      refreshProfile();
    } catch (error: any) {
      toast({
        title: "Error deleting firm",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (!currentFirm) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Building02Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Firm Selected</h3>
          <p className="text-muted-foreground">Please select a firm to manage its settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building02Icon className="h-5 w-5" />
          Firm Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Firm</Label>
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="font-semibold">{currentFirm.name}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Firm ID:</Label>
                <code className="px-2 py-1 bg-background rounded text-xs font-mono select-all">{currentFirm.id}</code>
              </div>
              <p className="text-xs text-muted-foreground">Share this ID with team members for signup</p>
            </div>
            <p className="text-sm text-muted-foreground">Created: {new Date(currentFirm.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-1">
          {/* Firm Details & Branding */}
          <Button variant="outline" className="w-full" onClick={() => setDetailsDialogOpen(true)}>
            <PaintBoardIcon className="h-4 w-4 mr-2" />
            Firm Details & Branding
          </Button>

          {/* Default Pricing Configuration */}
          <Button variant="outline" className="w-full" onClick={() => setPricingDialogOpen(true)}>
            <MoneyBag02Icon className="h-4 w-4 mr-2" />
            Default Pricing Configuration
          </Button>

          {/* Rename Firm */}
          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" onClick={() => setRenameFirmName(currentFirm.name)}>
                <Edit01Icon className="h-4 w-4 mr-2" />
                Rename Firm
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Firm</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firmName">New Firm Name</Label>
                  <Input
                    id="firmName"
                    value={renameFirmName}
                    onChange={(e) => setRenameFirmName(e.target.value)}
                    placeholder="Enter new firm name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRenameFirm} disabled={loading || !renameFirmName.trim()}>
                    {loading ? "Updating..." : "Update Name"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Firm */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Delete01Icon className="h-4 w-4 mr-2" />
                Delete Firm
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the firm "{currentFirm.name}" 
                  and all associated data including events, clients, tasks, and payments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFirm} disabled={loading}>
                  {loading ? "Deleting..." : "Delete Firm"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Firm Details Dialog */}
        <FirmDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          firmId={currentFirm.id}
          onSuccess={() => {
            fetchCurrentFirm();
            refreshProfile();
          }}
        />

        {/* Pricing Configuration Dialog */}
        <PricingConfigurationDialog
          open={pricingDialogOpen}
          onOpenChange={setPricingDialogOpen}
          firmId={currentFirm.id}
          onSuccess={() => {
            fetchCurrentFirm();
            refreshProfile();
          }}
        />
      </CardContent>
    </Card>
  );
};

export default FirmManagement;