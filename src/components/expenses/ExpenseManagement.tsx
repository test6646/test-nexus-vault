import { useState } from 'react';
import { Add01Icon } from 'hugeicons-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import ExpenseStats from './ExpenseStats';
import ExpenseTableView from './ExpenseTableView';
import { FilteredManagementCore } from '@/components/common/FilteredManagementCore';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useExpenseExportConfig } from '@/hooks/useExportConfigs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useToast } from '@/hooks/use-toast';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { UniversalPagination } from '@/components/common/UniversalPagination';

const ExpenseManagement = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const expenseExportConfig = useExpenseExportConfig();

  const handleExpenseCreated = () => {
    setCreateDialogOpen(false);
  };

  const handleExpenseUpdated = () => {
    setEditDialogOpen(false);
    setEditingExpense(null);
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDelete = async (expense: any, refetch: () => void) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Expense',
      description: `You are about to permanently delete this expense "${expense.description}". This action cannot be undone.`,
      onConfirm: async () => {
        if (submitting) return;
        
        setSubmitting(true);
        try {
          // First, try to delete from Google Sheets
          if (currentFirmId) {
            try {
              await supabase.functions.invoke('delete-item-from-google', {
                body: { 
                  itemType: 'expense', 
                  itemId: expense.id, 
                  firmId: currentFirmId 
                }
              });
            } catch (sheetError) {
              console.error('Sheet deletion error:', sheetError);
            }
          }

          // If this is a salary expense, also delete the corresponding freelancer/staff payment
          if (expense.category === 'Salary') {
            try {
              // Check if this expense has a corresponding freelancer payment
              const { data: freelancerPayments } = await supabase
                .from('freelancer_payments')
                .select('id')
                .eq('firm_id', currentFirmId)
                .eq('amount', expense.amount)
                .eq('payment_date', expense.expense_date);

              if (freelancerPayments && freelancerPayments.length > 0) {
                await supabase.functions.invoke('sync-salary-payments-to-google', {
                  body: {
                    paymentType: 'freelancer',
                    paymentId: freelancerPayments[0].id,
                    firmId: currentFirmId,
                    operation: 'delete'
                  }
                });

                await supabase
                  .from('freelancer_payments')
                  .delete()
                  .eq('id', freelancerPayments[0].id);
              }

              // Check if this expense has a corresponding staff payment
              const { data: staffPayments } = await supabase
                .from('staff_payments')
                .select('id')
                .eq('firm_id', currentFirmId)
                .eq('amount', expense.amount)
                .eq('payment_date', expense.expense_date);

              if (staffPayments && staffPayments.length > 0) {
                await supabase.functions.invoke('sync-salary-payments-to-google', {
                  body: {
                    paymentType: 'staff',
                    paymentId: staffPayments[0].id,
                    firmId: currentFirmId,
                    operation: 'delete'
                  }
                });

                await supabase
                  .from('staff_payments')
                  .delete()
                  .eq('id', staffPayments[0].id);
              }
            } catch (paymentError) {
              console.error('Payment deletion error:', paymentError);
            }
          }

          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expense.id);

          if (error) throw error;
          
          toast({
            title: "Expense Deleted",
            description: "Expense has been deleted from both database and Google Sheets",
          });
          refetch();
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  return (
    <FilteredManagementCore
      pageType="expenses"
      searchPlaceholder="Search expenses by description..."
      renderHeader={({ data }) => {
        return (
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <div className="flex items-center gap-2">
              {data.length > 0 && profile?.role === 'Admin' && canExport && (
                <UniversalExportDialog 
                  data={data}
                  config={expenseExportConfig}
                />
              )}
              {profile?.role === 'Admin' && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="rounded-full p-3"
                  disabled={!canCreateNew}
                >
                  <Add01Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      }}
      renderStats={() => (
        <ExpenseStats />
      )}
      renderContent={({ data, refetch, loadMore, allDataLoaded, currentPage, totalCount, filteredCount, pageSize, setPageSize }) => (
        <>
          <ExpenseTableView
            expenses={data}
            allExpenses={data}
            onEdit={handleEdit}
            onDelete={(expense) => handleDelete(expense, refetch)}
            onAddExpense={() => setCreateDialogOpen(true)}
          />
          
          <UniversalPagination
            currentPage={currentPage || 0}
            totalCount={totalCount || 0}
            filteredCount={filteredCount || 0}
            pageSize={pageSize || 50}
            allDataLoaded={allDataLoaded || false}
            loading={false}
            onLoadMore={loadMore || (() => {})}
            showLoadMore={true}
            onPageSizeChange={setPageSize}
          />

          <ExpenseFormDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onExpenseCreated={() => {
              handleExpenseCreated();
              refetch();
            }}
          />

          <ExpenseFormDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) {
                setEditingExpense(null);
              }
            }}
            onExpenseCreated={() => {
              handleExpenseUpdated();
              refetch();
            }}
            expense={editingExpense}
            mode="edit"
          />
          
          <EnhancedConfirmationDialog
            open={confirmDialog.open}
            onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            description={confirmDialog.description}
            variant="destructive"
            confirmText="Delete Expense"
            requireTextConfirmation={true}
            confirmationKeyword="DELETE"
            loading={submitting}
          />
        </>
      )}
    />
  );
};

export default ExpenseManagement;