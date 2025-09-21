import { useAuth } from '@/components/auth/AuthProvider';
import { Note01Icon } from 'hugeicons-react';
import QuotationStats from './QuotationStats';
import QuotationsListManager from './QuotationsListManager';
import { EmptyState } from '@/components/ui/empty-state';

const QuotationManagement = () => {
  const { profile, currentFirmId } = useAuth();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations</h1>
      </div>

      {/* Stats */}
      <QuotationStats />

      {/* Quotations List Manager */}
      <QuotationsListManager />
    </div>
  );
};

export default QuotationManagement;
