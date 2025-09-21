import { useState, useEffect, useMemo } from 'react';
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
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useClientExportConfig } from '@/hooks/useClientExportConfig';
import { UserCircleIcon } from 'hugeicons-react';
import ClientStats from './ClientStats';
import ClientTableView from './ClientTableView';
import { Client } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useDeletionValidation } from '@/hooks/useDeletionValidation';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const ClientManagement = () => {
  const { profile, currentFirmId } = useAuth();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const isMobile = useIsMobile();
  
  const [events, setEvents] = useState<any[]>([]);
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
  const { validateClientDeletion } = useDeletionValidation();
  const clientExportConfig = useClientExportConfig(events);
  const filterState = useBackendFilters(FILTER_CONFIGS.clients, {
    enableRealtime: true,
    pageSize: 50 // Standard UI pagination
  });

  const isAdmin = profile?.role === 'Admin';

  useEffect(() => {
    if (currentFirmId) {
      loadEvents();
    }
  }, [currentFirmId]);

  // Remove manual client loading - let filterState handle it

  const loadEvents = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          event_date,
          client_id,
          client:clients(id, name)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      // Error loading events
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
            }).catch(() => {});
            
            toast({
              title: "Client Updated",
              description: "Client information has been updated successfully",
            });
            
            setIsDialogOpen(false);
            filterState.refetch();
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
        }).catch(() => {});
        
        toast({
          title: "Client Created",
          description: "New client has been added successfully",
        });
        
        setIsDialogOpen(false);
        filterState.refetch();
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
    try {
      const validation = await validateClientDeletion(client.id);
      
      if (!validation.canDelete) {
        setConfirmDialog({
          open: true,
          title: validation.title,
          description: validation.description,
          variant: 'warning',
          requireTextConfirmation: false,
          confirmationKeyword: '',
          loading: false,
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
          }
        });
        return;
      }

      setConfirmDialog({
        open: true,
        title: validation.title,
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
            // STEP 1: Delete from Google Sheets FIRST
            if (currentFirmId) {
              try {
                await supabase.functions.invoke('delete-item-from-google', {
                  body: {
                    itemType: 'client',
                    itemId: client.id,
                    firmId: currentFirmId
                  }
                });
              } catch (error) {
                // Google Sheets delete failed - continuing with database deletion
              }
            }

            // STEP 2: Delete from database
            const { error: dbError } = await supabase
              .from('clients')
              .delete()
              .eq('id', client.id);

            if (dbError) {
              throw dbError;
            }

            toast({
              title: "Client Deleted",
              description: "Client has been deleted from both database and Google Sheets",
            });
            filterState.refetch();
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to validate client deletion. Please try again.",
        variant: "destructive",
      });
    }
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

  // Reset form when dialog closes or editing client changes
  useEffect(() => {
    if (!isDialogOpen && !editingClient) {
      // Only reset form when dialog is fully closed and no client is being edited
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
    } else if (editingClient && isDialogOpen) {
      // Only populate form when dialog is open and client is being edited
      setFormData({
        name: editingClient.name,
        phone: editingClient.phone,
        email: editingClient.email || '',
        address: editingClient.address || '',
        notes: editingClient.notes || ''
      });
    }
  }, [isDialogOpen, editingClient]);

  if (filterState.loading && !filterState.data.length) {
    return <PageTableSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
        </div>
        <EmptyState
          icon={UserCircleIcon}
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
        
        <div className="flex items-center gap-2">
          {filterState.data.length > 0 && canExport && (
            <UniversalExportDialog 
              data={filterState.data}
              config={clientExportConfig}
            />
          )}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingClient(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-full p-3" disabled={!canCreateNew}>
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
      </div>

      {/* Client Statistics */}
      <ClientStats />

      {/* Search & Sort Bar - Positioned after stats */}
      <div className="my-6">
        <UniversalFilterBar
          searchValue={filterState.searchTerm}
          onSearchChange={filterState.setSearchTerm}
          onSearchApply={filterState.handleSearchApply}
          onSearchClear={filterState.handleSearchClear}
          isSearchActive={filterState.isSearchActive}
          searchPlaceholder="Search clients..."
          
          sortBy={filterState.sortBy}
          sortOptions={FILTER_CONFIGS.clients.sortOptions}
          onSortChange={filterState.setSortBy}
          sortOrder={filterState.sortOrder}
          onSortReverse={filterState.toggleSortOrder}
          
          activeFilters={filterState.activeFilters}
          filterOptions={FILTER_CONFIGS.clients.filterOptions}
          onFiltersChange={filterState.setActiveFilters}
          
          totalCount={filterState.totalCount}
          filteredCount={filterState.filteredCount}
          loading={filterState.loading}
        />
      </div>

      {/* Clients List */}
      {filterState.data.length === 0 && !filterState.loading ? (
        <EmptyState
          icon={UserCircleIcon}
          title={filterState.isSearchActive || filterState.activeFilters.length > 0 ? "No Matching Clients" : "No Clients Yet"}
          description={filterState.isSearchActive || filterState.activeFilters.length > 0 
            ? "No clients match your current search or filter criteria. Try adjusting your filters." 
            : "Start building your client database by adding your first client."
          }
          action={isAdmin && !filterState.isSearchActive && filterState.activeFilters.length === 0 ? {
            label: "Add Client",
            onClick: () => setIsDialogOpen(true)
          } : undefined}
        />
      ) : (
        <ClientTableView
          clients={filterState.data}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={filterState.currentPage}
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        pageSize={filterState.pageSize}
        allDataLoaded={filterState.allDataLoaded}
        loading={filterState.loading}
        onLoadMore={filterState.loadMore}
        onPageSizeChange={filterState.setPageSize}
        showLoadMore={true}
      />
      
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

export default ClientManagement;
