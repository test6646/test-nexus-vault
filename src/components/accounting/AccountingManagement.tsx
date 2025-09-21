import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit01Icon, Delete02Icon, File01Icon, MoneyBag01Icon, MoneyReceive01Icon, WalletAdd01Icon, Building06Icon, Add01Icon } from 'hugeicons-react';
import { useAccountingEntries } from '@/hooks/useAccountingEntries';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AccountingEntryDialog } from './AccountingEntryDialog';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import StatsGrid from '@/components/ui/stats-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { generateAccountingReportPDF } from './AccountingReportPDF';

const CATEGORIES = [
  'Equipment',
  'Travel', 
  'Accommodation',
  'Food',
  'Marketing',
  'Software',
  'Maintenance',
  'Salary',
  'Office Supplies',
  'Insurance',
  'Legal',
  'Consulting',
  'Utilities',
  'Rent',
  'Other'
];

const ENTRY_TYPES = ['Credit', 'Debit'];
const PAYMENT_METHODS = ['Cash', 'Digital',];

export const AccountingManagement = () => {
  const { entries, loading, deleteEntry, refetch } = useAccountingEntries();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'destructive' as 'destructive' | 'warning' | 'default'
  });

  const filterState = useBackendFilters(FILTER_CONFIGS.accounting);

  const stats = useMemo(() => {
    const totalCredits = entries
      .filter(entry => entry.entry_type === 'Credit')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    const totalDebits = entries
      .filter(entry => entry.entry_type === 'Debit')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    const netBalance = totalCredits - totalDebits;
    
    return [
      {
        title: "Total Credits",
        value: `₹${totalCredits.toLocaleString('en-IN')}`,
        icon: <MoneyReceive01Icon className="h-4 w-4" />,
        colorClass: "bg-green-100 text-green-600"
      },
      {
        title: "Total Debits", 
        value: `₹${totalDebits.toLocaleString('en-IN')}`,
        icon: <MoneyBag01Icon className="h-4 w-4" />,
        colorClass: "bg-red-100 text-red-600"
      },
      {
        title: "Net Balance",
        value: `₹${netBalance.toLocaleString('en-IN')}`,
        icon: <WalletAdd01Icon className="h-4 w-4" />,
        colorClass: netBalance >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
      },
      {
        title: "Total Entries",
        value: entries.length.toString(),
        icon: <Building06Icon className="h-4 w-4" />,
        colorClass: "bg-blue-100 text-blue-600"
      }
    ];
  }, [entries]);

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDelete = (entry: any) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Entry',
      description: `Are you sure you want to delete this ${entry.entry_type.toLowerCase()} entry of ₹${entry.amount?.toLocaleString('en-IN')}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteEntry(entry.id);
          toast({
            title: "Success",
            description: "Entry deleted successfully"
          });
          setConfirmDialog(prev => ({ ...prev, open: false }));
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete entry",
            variant: "destructive"
          });
        }
      },
      variant: 'destructive'
    });
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    refetch();
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Accounting
        </h1>
        <div className="flex items-center gap-2">
          {filterState.data.length > 0 && (
            <UniversalExportDialog 
              data={filterState.data}
              config={{
                title: "Accounting Report",
                filterTypes: [
                  { value: 'global', label: 'All Entries' },
                  { 
                    value: 'type', 
                    label: 'By Type',
                    options: [
                      { value: 'Credit', label: 'Credits Only' },
                      { value: 'Debit', label: 'Debits Only' }
                    ]
                  },
                  { 
                    value: 'category', 
                    label: 'By Category',
                    options: CATEGORIES.map(cat => ({ value: cat, label: cat }))
                  }
                ],
                exportFunction: generateAccountingReportPDF,
                getPreviewData: (data) => ({
                  count: data.length,
                  summary: {
                    'Total Credits': `₹${data.filter(e => e.entry_type === 'Credit').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`,
                    'Total Debits': `₹${data.filter(e => e.entry_type === 'Debit').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`
                  }
                })
              }}
            />
          )}
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Add01Icon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AccountingEntryDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingEntry(null);
          }
        }}
        editingEntry={editingEntry}
        onSuccess={handleSuccess}
        trigger={<span style={{ display: 'none' }} />}
      />

      <StatsGrid stats={stats} />

      <UniversalFilterBar
        searchValue={filterState.searchTerm}
        onSearchChange={filterState.setSearchTerm}
        onSearchApply={filterState.handleSearchApply}
        onSearchClear={filterState.handleSearchClear}
        isSearchActive={filterState.isSearchActive}
        searchPlaceholder="Search accounting entries..."
        
        sortBy={filterState.sortBy}
        sortOptions={FILTER_CONFIGS.accounting.sortOptions}
        onSortChange={filterState.setSortBy}
        sortOrder={filterState.sortOrder}
        onSortReverse={filterState.toggleSortOrder}
        
        activeFilters={filterState.activeFilters}
        filterOptions={FILTER_CONFIGS.accounting.filterOptions}
        onFiltersChange={filterState.setActiveFilters}
        
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        loading={filterState.loading}
      />

      {filterState.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Accounting Entries"
          description="Start by adding your first accounting entry to track your finances using the + button above."
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Title</TableHead>
                      <TableHead className="text-center">Description</TableHead>
                      <TableHead className="text-center">Category</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Amount</TableHead>
                      <TableHead className="text-center">Payment Method</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterState.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-center">
                          {entry.entry_date ? format(new Date(entry.entry_date), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium text-center">{entry.title}</TableCell>
                        <TableCell className="text-center">{entry.description}</TableCell>
                        <TableCell className="text-center">{entry.category}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.entry_type === 'Credit' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.entry_type}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-center">
                          ₹{entry.amount?.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">{entry.payment_method}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="action-edit"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              className="h-8 w-8 p-0 rounded-full"
                              title="Edit entry"
                            >
                              <Edit01Icon className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="action-delete"
                              size="sm"
                              onClick={() => handleDelete(entry)}
                              className="h-8 w-8 p-0 rounded-full"
                              title="Delete entry"
                            >
                              <Delete02Icon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filterState.data.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{entry.title}</h3>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entry_date ? format(new Date(entry.entry_date), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.entry_type === 'Credit' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.entry_type}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{entry.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">₹{entry.amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span>{entry.payment_method}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="action-edit"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                      className="h-8 w-8 p-0 rounded-full"
                      title="Edit entry"
                    >
                      <Edit01Icon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="action-delete"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      className="h-8 w-8 p-0 rounded-full"
                      title="Delete entry"
                    >
                      <Delete02Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={filterState.currentPage}
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        pageSize={30}
        allDataLoaded={filterState.allDataLoaded}
        loading={filterState.loading}
        onLoadMore={filterState.loadMore}
        showLoadMore={true}
      />

      <EnhancedConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'Confirm'}
      />
    </div>
  );
};