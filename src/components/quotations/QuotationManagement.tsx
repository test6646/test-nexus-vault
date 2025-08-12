
import { useState } from 'react';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Add01Icon } from 'hugeicons-react';
import { FileText } from 'lucide-react';
import { Quotation, EventType } from '@/types/studio';
import QuotationCardGrid from './QuotationCardGrid';
import CustomizableQuotationBuilder from './CustomizableQuotationBuilder';
import { useQuotations } from './hooks/useQuotations';
import { filterAndSortQuotations, isExpired } from './QuotationFilters';
import QuotationFormDialog from './QuotationFormDialog';
import { EmptyState } from '@/components/ui/empty-state';
import QuotationStats from './QuotationStats';
import { useFirmData } from '@/hooks/useFirmData';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useQuotationExportConfig } from './QuotationExportConfig';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue: string;
  description: string;
  valid_until: string;
}

const QuotationManagement = () => {
  const { profile, currentFirmId } = useAuth();
  const { quotations, clients, loading, loadQuotations } = useQuotations();
  const { firmData } = useFirmData();
  const quotationExportConfig = useQuotationExportConfig();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
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
      event_date: formData.event_date instanceof Date ? formData.event_date.toISOString().split('T')[0] : formData.event_date,
      valid_until: formData.valid_until instanceof Date ? formData.valid_until.toISOString().split('T')[0] : formData.valid_until || ''
    };

    setFormData(processedFormData);
    setIsDialogOpen(false);
    setShowBuilder(true);
  };

  const handleEditQuotation = (quotation: Quotation) => {
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
    setShowBuilder(true);
  };


  const resetForm = () => {
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
  };

  const handleNewQuotation = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Filter out expired and converted quotations
  const quotationsToShow = quotations.filter(q => 
    !q.converted_to_event && 
    (!q.valid_until || !isExpired(q.valid_until))
  );

  if (loading) {
    return <PageSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations</h1>
        </div>
        <EmptyState
          icon={FileText}
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
          loadQuotations();
        }}
      />
    );
  }

  const activeQuotations = quotations.filter(q => !q.converted_to_event);
  const expiredQuotations = activeQuotations.filter(q => isExpired(q.valid_until));

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations</h1>
        <div className="flex items-center gap-2">
          {quotationsToShow.length > 0 && (
            <UniversalExportDialog 
              data={quotationsToShow}
              config={quotationExportConfig}
            />
          )}
          <QuotationFormDialog
            clients={clients}
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSubmit={handleSubmit}
            onNewQuotation={handleNewQuotation}
          />
        </div>
      </div>

      <QuotationStats quotations={quotations} />


      {quotationsToShow.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Active Quotations"
          description="All quotations have been confirmed or start managing your quotes by creating your first quotation."
          action={{
            label: "Add Quotation",
            onClick: handleNewQuotation
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quotationsToShow.map((quotation) => (
            <QuotationCardGrid
              key={quotation.id}
              quotation={quotation}
              onUpdate={loadQuotations}
              onEdit={handleEditQuotation}
              firmData={firmData}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotationManagement;
