import React, { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import QuotationStats from './QuotationStats';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useQuotationExportConfig } from '@/hooks/useQuotationExportConfig';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import QuotationFormDialog from './QuotationFormDialog';
import QuotationCardGrid from './QuotationCardGrid';
import CustomizableQuotationBuilder from './CustomizableQuotationBuilder';
import { useQuotations } from './hooks/useQuotations';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Note01Icon } from 'hugeicons-react';
import { useFirmData } from '@/hooks/useFirmData';
import { Quotation, EventType } from '@/types/studio';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue: string;
  description: string;
  valid_until: string;
}

const QuotationManagementWithFilters = () => {
  const { profile, currentFirmId } = useAuth();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const { firmData } = useFirmData();
  const { toast } = useToast();

  const filterState = useBackendFilters(FILTER_CONFIGS.quotations, {
    enableRealtime: true,
    pageSize: 50 // Standard UI pagination
  });

  const { clients, deleteQuotation, confirmDialog, setConfirmDialog } = useQuotations();
  const [events, setEvents] = useState<any[]>([]);
  const quotationExportConfig = useQuotationExportConfig(events);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    valid_until: ''
  });

  React.useEffect(() => {
    if (currentFirmId) {
      loadEvents();
    }
  }, [currentFirmId]);

  const loadEvents = async () => {
    if (!currentFirmId) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('firm_id', currentFirmId);
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleSubmit = async (formData: any) => {
    if (!formData.title.trim() || !formData.client_id || !formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Title, client, and event date are required fields",
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

    const processedFormData = {
      ...formData,
      event_date: formData.event_date instanceof Date 
        ? `${formData.event_date.getFullYear()}-${String(formData.event_date.getMonth() + 1).padStart(2, '0')}-${String(formData.event_date.getDate()).padStart(2, '0')}`
        : formData.event_date,
      valid_until: formData.valid_until instanceof Date 
        ? `${formData.valid_until.getFullYear()}-${String(formData.valid_until.getMonth() + 1).padStart(2, '0')}-${String(formData.valid_until.getDate()).padStart(2, '0')}`
        : formData.valid_until || ''
    };

    setFormData(processedFormData);
    setIsDialogOpen(false);
    setShowBuilder(true);
  };

  const handleEditQuotation = useCallback((quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      title: quotation.title,
      client_id: quotation.client_id || '',
      event_type: quotation.event_type,
      event_date: quotation.event_date,
      venue: quotation.venue || '',
      description: quotation.description || '',
      valid_until: quotation.valid_until || ''
    });
    setIsEditingMode(true);
    setIsDialogOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      client_id: '',
      event_type: 'Wedding',
      event_date: '',
      venue: '',
      description: '',
      valid_until: ''
    });
    setEditingQuotation(null);
    setIsEditingMode(false);
  }, []);

  const handleNewQuotation = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingQuotation(null);
      setIsEditingMode(false);
    }
  }, []);

  if (filterState.loading && filterState.data.length === 0) {
    return <PageTableSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations</h1>
        </div>
        <EmptyState
          icon={Note01Icon}
          title="No Firm Selected"
          description="Please select a firm to view and manage quotations."
        />
      </div>
    );
  }

  if (showBuilder) {
    return (
      <CustomizableQuotationBuilder
        formData={formData}
        editingQuotation={editingQuotation}
        onBack={() => {
          setShowBuilder(false);
          if (editingQuotation) {
            resetForm();
          } else {
            setIsDialogOpen(true);
          }
        }}
        onComplete={() => {
          setShowBuilder(false);
          resetForm();
          filterState.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations</h1>
        
        <div className="flex items-center gap-2">
          {filterState.data.length > 0 && canExport && (
            <UniversalExportDialog 
              data={filterState.data}
              config={quotationExportConfig}
            />
          )}
          <QuotationFormDialog
            clients={clients}
            isOpen={isDialogOpen}
            onOpenChange={handleDialogOpenChange}
            onSubmit={handleSubmit}
            onNewQuotation={handleNewQuotation}
            editingQuotation={isEditingMode ? editingQuotation : null}
            formData={isEditingMode ? formData : undefined}
            disabled={!canCreateNew}
          />
        </div>
      </div>

      {/* Stats */}
      <QuotationStats />

      {/* Universal Filter Bar */}
      <UniversalFilterBar
        searchValue={filterState.searchTerm}
        onSearchChange={filterState.setSearchTerm}
        onSearchApply={filterState.handleSearchApply}
        onSearchClear={filterState.handleSearchClear}
        isSearchActive={filterState.isSearchActive}
        searchPlaceholder="Search quotations by title or venue..."
        
        sortBy={filterState.sortBy}
        sortOptions={FILTER_CONFIGS.quotations.sortOptions}
        onSortChange={filterState.setSortBy}
        sortOrder={filterState.sortOrder}
        onSortReverse={filterState.toggleSortOrder}
        
        activeFilters={filterState.activeFilters}
        filterOptions={FILTER_CONFIGS.quotations.filterOptions}
        onFiltersChange={filterState.setActiveFilters}
        
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        loading={filterState.loading}
      />

      {/* Quotations Grid */}
      {filterState.data.length === 0 ? (
        <EmptyState
          icon={Note01Icon}
          title="No Quotations Found"
          description="No quotations match your current search and filter criteria. Try adjusting your filters or create a new quotation."
          action={{
            label: "Add Quotation",
            onClick: handleNewQuotation
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filterState.data.map((quotation) => (
            <QuotationCardGrid
              key={quotation.id}
              quotation={quotation}
              onUpdate={filterState.refetch}
              onEdit={handleEditQuotation}
              onDelete={deleteQuotation}
              firmData={firmData}
            />
          ))}
        </div>
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
        showLoadMore={true}
      />

      {/* Confirmation Dialog */}
      <EnhancedConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        requireTextConfirmation={confirmDialog.requireTextConfirmation}
        confirmationKeyword={confirmDialog.confirmationKeyword}
        loading={confirmDialog.loading}
        confirmText={confirmDialog.loading ? "Processing..." : "Confirm"}
      />
    </div>
  );
};

export default QuotationManagementWithFilters;