import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent } from '@/components/ui/card';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Add01Icon, Call02Icon, Mail01Icon, Location01Icon } from 'hugeicons-react';
import { User } from 'lucide-react';
import StatsGrid from '@/components/ui/stats-grid';
import ClientTableView from './ClientTableView';
import { Client } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const ClientTableManagement = () => {
  const { profile, currentFirmId } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showOptimisticUpdate, setShowOptimisticUpdate] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'default' as 'destructive' | 'warning' | 'default',
    requireTextConfirmation: false,
    confirmationKeyword: '',
    loading: false
  });
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const { toast } = useToast();

  const isAdmin = profile?.role === 'Admin';

  useEffect(() => {
    if (currentFirmId) {
      loadClients();
    } else {
      setLoading(false);
    }
  }, [currentFirmId]);

  const loadClients = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent multiple submissions
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required fields",
        variant: "destructive",
      });
      return;
    }

    // Phone number validation - must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      toast({
        title: "Validation Error",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "No firm selected",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setShowOptimisticUpdate(true);
    
    try {
      const clientData = {
        ...formData,
        firm_id: currentFirmId,
      };

      if (editingClient) {
        // Show confirmation for updates
        setConfirmDialog({
          open: true,
          title: 'Update Client',
          description: `Are you sure you want to update ${editingClient.name}'s information? This action will modify their existing data.`,
          variant: 'warning',
          requireTextConfirmation: false,
          confirmationKeyword: '',
          loading: false,
          onConfirm: async () => {
            const { data: updatedClient, error } = await supabase
              .from('clients')
              .update(clientData)
              .eq('id', editingClient.id)
              .select()
              .single();

            if (error) throw error;
            
            // Background sync to Google Sheets using centralized service
            import('@/services/googleSheetsSync').then(({ syncClientInBackground }) => {
              syncClientInBackground(updatedClient.id, currentFirmId, 'update');
            }).catch(console.error);
            
            toast({
              title: "Client Updated",
              description: "Client information has been updated successfully",
            });
            
            setIsDialogOpen(false);
            resetForm();
            loadClients();
            setConfirmDialog(prev => ({ ...prev, open: false }));
          }
        });
        return;
      } else {
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (error) throw error;
        
        // Background sync to Google Sheets using centralized service
        import('@/services/googleSheetsSync').then(({ syncClientInBackground }) => {
          syncClientInBackground(newClient.id, currentFirmId, 'create');
        }).catch(console.error);
        
        toast({
          title: "Client Created",
          description: "New client has been added successfully",
        });
        
        setIsDialogOpen(false);
        resetForm();
        loadClients();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowOptimisticUpdate(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Client',
      description: `You are about to permanently delete "${client.name}". This action cannot be undone and will permanently remove all client information including contact details and history.`,
      variant: 'destructive',
      requireTextConfirmation: true,
      confirmationKeyword: 'DELETE',
      loading: false,
      onConfirm: async () => {
        if (submitting) return;
        
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        setSubmitting(true);
        try {
          // Delete from Google Sheets first using centralized service
          try {
            const { googleSheetsSync } = await import('@/services/googleSheetsSync');
            await googleSheetsSync.syncInBackground({
              itemType: 'client',
              itemId: client.id,
              firmId: currentFirmId,
              operation: 'delete'
            });
          } catch (sheetError) {
            console.error('Google Sheets delete error:', sheetError);
          }

          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', client.id);

          if (error) throw error;
          
          toast({
            title: "Client Deleted",
            description: "Client has been deleted from both database and Google Sheets",
          });
          loadClients();
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
          setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setEditingClient(null);
  };

  // Show all clients without filtering
  const clientsToShow = clients;

  if (loading) {
    return <PageTableSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
        </div>
        <EmptyState
          icon={User}
          title="No Firm Selected"
          description="Please select a firm to view and manage clients."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { 
            setIsDialogOpen(open); 
            if (!open) resetForm(); 
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-full p-3">
                <Add01Icon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Client Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter client name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter 10-digit phone number"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phone: value });
                      }}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || showOptimisticUpdate} className="rounded-full">
                    {submitting || showOptimisticUpdate ? 'Processing...' : (editingClient ? 'Update Client' : 'Add Client')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Client Statistics */}
      <StatsGrid stats={[
        {
          title: "Total Clients",
          value: clients.length,
          icon: <User className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "With Email",
          value: clients.filter(c => c.email).length,
          icon: <Mail01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/15 text-primary"
        },
        {
          title: "With Address",
          value: clients.filter(c => c.address).length,
          icon: <Location01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/25 text-primary"
        },
        {
          title: "Recent",
          value: clients.filter(c => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(c.created_at) > weekAgo;
          }).length,
          icon: <Call02Icon className="h-4 w-4" />,
          colorClass: "bg-primary/10 text-primary"
        }
      ]} />


      {/* Clients List */}
      {clientsToShow.length === 0 ? (
        <EmptyState
          icon={User}
          title="No Clients Yet"
          description="Start building your client database by adding your first client."
          action={isAdmin ? {
            label: "Add Client",
            onClick: () => setIsDialogOpen(true)
          } : undefined}
        />
      ) : (
        <ClientTableView
          clients={clientsToShow}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      
      <EnhancedConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Update'}
        requireTextConfirmation={confirmDialog.requireTextConfirmation}
        confirmationKeyword={confirmDialog.confirmationKeyword}
        loading={confirmDialog.loading}
      />
    </div>
  );
};

export default ClientTableManagement;
