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
      'Equipment': 'bg-blue-500',
      'Travel': 'bg-green-500',
      'Accommodation': 'bg-purple-500',
      'Food': 'bg-orange-500',
      'Marketing': 'bg-pink-500',
      'Software': 'bg-indigo-500',
      'Maintenance': 'bg-yellow-500',
      'Salary': 'bg-red-500',
      'Other': 'bg-gray-500'
    };
    return colorMap[category] || 'bg-gray-500';
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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold">Payment Method</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Event</TableHead>
            <TableHead className="font-semibold">Receipt</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id} className="hover:bg-muted/25">
              <TableCell>
                <div className="font-medium">
                  {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(expense.created_at).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{expense.description}</div>
                {expense.notes && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {expense.notes}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={`${getCategoryColor(expense.category)} text-white`}
                >
                  {expense.category}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {expense.payment_method || 'Cash'}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-semibold">
                  ₹{Number(expense.amount).toLocaleString('en-IN')}
                </span>
              </TableCell>
              <TableCell>
                {expense.event?.title ? (
                  <span className="text-sm">{expense.event.title}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">No event</span>
                )}
              </TableCell>
              <TableCell>
                {expense.receipt_url ? (
                  <Button
                    variant="action-neutral"
                    size="sm"
                    onClick={() => {
                      // Open receipt URL
                      let url = expense.receipt_url;
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                      }
                      window.open(url, '_blank');
                    }}
                    className="h-8 w-8 p-0 rounded-full"
                    title="View receipt"
                  >
                    <File01Icon className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">No receipt</span>
                )}
              </TableCell>
               <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
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
  );
};

export default ExpenseTableView;