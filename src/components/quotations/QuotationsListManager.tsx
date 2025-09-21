import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Add01Icon } from 'hugeicons-react';
import { Note01Icon } from 'hugeicons-react';
import { Quotation, EventType } from '@/types/studio';
import QuotationCardGrid from './QuotationCardGrid';
import CustomizableQuotationBuilder from './CustomizableQuotationBuilder';
import { useQuotations } from './hooks/useQuotations';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import QuotationFormDialog from './QuotationFormDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useFirmData } from '@/hooks/useFirmData';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useQuotationExportConfig } from '@/hooks/useQuotationExportConfig';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue: string;
  description: string;
  valid_until: string;
}

// Helper function to check if quotation is expired
const isExpired = (validUntil: string | null) => {
  if (!validUntil) return false;
  const expiryDate = new Date(validUntil);
  const today = new Date();
  
  // Set both dates to midnight for date-only comparison
  expiryDate.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);
  
  return expiryDate < today;
};

const QuotationsListManager = () => {
  const { profile, currentFirmId } = useAuth();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const isMobile = useIsMobile();
  const { quotations, clients, loading, loadQuotations, deleteQuotation, confirmDialog, setConfirmDialog } = useQuotations();
  const { firmData } = useFirmData();
  const [events, setEvents] = useState<any[]>([]);
  const quotationExportConfig = useQuotationExportConfig(events);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    valid_until: ''
  });
  const { toast } = useToast();

  useEffect(() => {
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

  const processedQuotations = quotations;

  if (loading) {
    return <PageSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <EmptyState
        icon={Note01Icon}
        title="No Firm Selected"
        description="Please select a firm to view and manage quotations."
      />
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
          loadQuotations();
        }}
      />
    );
  }

  const activeQuotations = quotations.filter(q => !q.converted_to_event);
  const expiredQuotations = activeQuotations.filter(q => isExpired(q.valid_until));

  return (
    <div className="space-y-4">
      {/* Export and New Quotation Actions */}
      <div className="flex items-center justify-end gap-2">
        {quotations.length > 0 && canExport && (
          <UniversalExportDialog 
            data={processedQuotations}
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

      {/* Quotations Grid */}
      {processedQuotations.length === 0 ? (
        <EmptyState
          icon={Note01Icon}
          title="No Active Quotations"
          description="All quotations have been confirmed or start managing your quotes by creating your first quotation."
          action={{
            label: "Add Quotation",
            onClick: handleNewQuotation
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processedQuotations.map((quotation) => (
            <QuotationCardGrid
              key={quotation.id}
              quotation={quotation}
              onUpdate={loadQuotations}
              onEdit={handleEditQuotation}
              onDelete={deleteQuotation}
              firmData={firmData}
            />
          ))}
        </div>
      )}

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

export default QuotationsListManager;