import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Edit01Icon, Delete02Icon, File01Icon } from 'hugeicons-react';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface ExpenseTableViewProps {
  expenses: any[];
  allExpenses: any[];
  onEdit: (expense: any) => void;
  onDelete: (expense: any) => void;
  onAddExpense: () => void;
}

const ExpenseTableView = ({ expenses, allExpenses, onEdit, onDelete, onAddExpense }: ExpenseTableViewProps) => {



  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Equipment': 'text-category-equipment',
      'Travel': 'text-category-travel',
      'Accommodation': 'text-category-accommodation',
      'Food': 'text-category-food',
      'Marketing': 'text-category-marketing',
      'Software': 'text-category-software',
      'Maintenance': 'text-category-maintenance',
      'Salary': 'text-category-salary',
      'Other': 'text-category-other'
    };
    return colorMap[category] || 'text-category-other';
  };

  if (expenses.length === 0) {
    return (
        <EmptyState
          icon={FileText}
          title={allExpenses.length === 0 ? 'No Expenses Yet' : 'No Expenses Found'}
          description={allExpenses.length === 0 
            ? 'Start tracking your business expenses by adding your first expense.'
            : 'No expenses match your current search criteria. Try adjusting your filters or search terms.'
          }
          action={allExpenses.length === 0 ? {
            label: "Add Expense",
            onClick: onAddExpense
          } : undefined}
        />
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="text-center">Description</TableHead>
              <TableHead className="text-center">Category</TableHead>
              <TableHead className="text-center">Payment Method</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-center">Event</TableHead>
              <TableHead className="text-center">Receipt</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-muted/25">
                <TableCell className="text-center">
                  <div className="font-medium">
                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium">{expense.description}</div>
                  {expense.notes && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {expense.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-medium ${getCategoryColor(expense.category)}`}>
                    {expense.category}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-muted-foreground">
                    {expense.payment_method || 'Cash'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold">
                    ₹{Number(expense.amount).toLocaleString('en-IN')}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {expense.event?.title ? (
                    <span className="text-sm">{expense.event.title}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">~</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {expense.receipt_url && expense.receipt_url.trim() !== '' ? (
                    <Button
                      variant="action-neutral"
                      size="sm"
                      onClick={() => {
                        window.open(expense.receipt_url, '_blank');
                      }}
                      className="h-8 w-8 p-0 rounded-full"
                      title="View receipt"
                    >
                      <File01Icon className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">~</span>
                  )}
                </TableCell>
                 <TableCell className="text-center">
                   <div className="flex items-center justify-center gap-2">
                     <Button
                       variant="action-edit"
                       size="sm"
                       onClick={() => onEdit(expense)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Edit expense"
                     >
                       <Edit01Icon className="h-3.5 w-3.5" />
                     </Button>
                     <Button
                       variant="action-delete"
                       size="sm"
                       onClick={() => onDelete(expense)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Delete expense"
                     >
                       <Delete02Icon className="h-3.5 w-3.5" />
                     </Button>
                   </div>
                 </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {expenses.map((expense) => (
          <Card key={expense.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-lg font-bold text-foreground mb-1">
                    ₹{Number(expense.amount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {expense.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  {expense.receipt_url && expense.receipt_url.trim() !== '' && (
                    <Button
                      variant="action-neutral"
                      size="sm"
                      onClick={() => {
                        window.open(expense.receipt_url, '_blank');
                      }}
                      className="h-8 w-8 p-0 rounded-full"
                      title="View receipt"
                    >
                      <File01Icon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="action-edit"
                    size="sm"
                    onClick={() => onEdit(expense)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Edit expense"
                  >
                    <Edit01Icon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="action-delete"
                    size="sm"
                    onClick={() => onDelete(expense)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Delete expense"
                  >
                    <Delete02Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground">Payment Method</div>
                  <div className="text-sm font-medium">{expense.payment_method || 'Cash'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Event</div>
                  <div className="text-sm font-medium">{expense.event?.title || '~'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="text-sm font-medium">{expense.notes || '~'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  <span className={`text-sm font-medium ${getCategoryColor(expense.category)}`}>
                    {expense.category}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default ExpenseTableView;