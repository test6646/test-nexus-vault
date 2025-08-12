
import { useState, useEffect } from 'react';
import { Add01Icon } from 'hugeicons-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import ExpenseStats from './ExpenseStats';
import { useExpenses } from './hooks/useExpenses';
import ExpenseTableView from './ExpenseTableView';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useExpenseExportConfig } from '@/hooks/useExportConfigs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { PageTableSkeletonWithStats } from '@/components/ui/skeleton';

const ExpenseManagement = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('expense_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const { profile, currentFirmId } = useAuth();
  const { expenses, loading, loadExpenses } = useExpenses();
  const { toast } = useToast();
  const expenseExportConfig = useExpenseExportConfig();

  const handleExpenseCreated = () => {
    setCreateDialogOpen(false);
    loadExpenses();
  };

  const handleExpenseUpdated = () => {
    setEditDialogOpen(false);
    setEditingExpense(null);
    loadExpenses();
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDelete = async (expense: any) => {
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
              console.log('✅ Expense deleted from Google Sheets');
            } catch (sheetError) {
              console.warn('⚠️ Failed to delete from Google Sheets:', sheetError);
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
          loadExpenses();
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

  const filteredExpenses = expenses.filter(expense => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchMatch = searchRegex.test(expense.description) || searchRegex.test(expense.category);

    let categoryMatch = true;
    if (categoryFilter !== 'all') {
      categoryMatch = expense.category === categoryFilter;
    }

    return searchMatch && categoryMatch;
  });

  // Sort expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'expense_date':
        aValue = new Date(a.expense_date);
        bValue = new Date(b.expense_date);
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'category':
        aValue = a.category;
        bValue = b.category;
        break;
      default:
        aValue = new Date(a.expense_date);
        bValue = new Date(b.expense_date);
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const categoryFilters = [
    { value: 'all', label: 'All', count: expenses.length },
    { value: 'Equipment', label: 'Equipment', count: expenses.filter(e => e.category === 'Equipment').length },
    { value: 'Travel', label: 'Travel', count: expenses.filter(e => e.category === 'Travel').length },
    { value: 'Accommodation', label: 'Accommodation', count: expenses.filter(e => e.category === 'Accommodation').length },
    { value: 'Food', label: 'Food', count: expenses.filter(e => e.category === 'Food').length },
    { value: 'Marketing', label: 'Marketing', count: expenses.filter(e => e.category === 'Marketing').length },
    { value: 'Software', label: 'Software', count: expenses.filter(e => e.category === 'Software').length },
    { value: 'Maintenance', label: 'Maintenance', count: expenses.filter(e => e.category === 'Maintenance').length },
    { value: 'Salary', label: 'Salary', count: expenses.filter(e => e.category === 'Salary').length },
    { value: 'Other', label: 'Other', count: expenses.filter(e => e.category === 'Other').length }
  ];

  const sortOptions = [
    { value: 'expense_date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'category', label: 'Category' }
  ];

  if (loading) {
    return <PageTableSkeletonWithStats />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <UniversalExportDialog 
              data={expenses}
              config={expenseExportConfig}
            />
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="rounded-full p-3">
            <Add01Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ExpenseStats expenses={expenses} />


      <ExpenseTableView
        expenses={sortedExpenses}
        allExpenses={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddExpense={() => setCreateDialogOpen(true)}
      />


      <ExpenseFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onExpenseCreated={handleExpenseCreated}
      />

      <ExpenseFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onExpenseCreated={handleExpenseUpdated}
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
    </div>
  );
};

export default ExpenseManagement;
