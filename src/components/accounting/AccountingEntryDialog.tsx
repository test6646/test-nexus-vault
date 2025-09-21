import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AccountingEntry, useAccountingEntries } from '@/hooks/useAccountingEntries';
import { Add01Icon, Edit02Icon, AttachmentIcon, Delete02Icon, Alert01Icon, Loading02Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';

const formSchema = z.object({
  entry_type: z.enum(['Credit', 'Debit']),
  category: z.enum([
    'Equipment Sales',
    'Security Deposits Received',
    'Photography Consultation',
    'Miscellaneous Income',
    'Office Supplies',
    'Software Subscriptions',
    'Equipment Maintenance',
    'Professional Services',
    'Business Insurance',
    'Bank Charges',
    'Office Rent & Utilities',
    'Miscellaneous Expenses'
  ]),
  subcategory: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  entry_date: z.date(),
  payment_method: z.enum(['Cash', 'Digital']).default('Cash'),
  document_url: z.string().optional(),
  reflect_to_company: z.boolean().default(false),
});

interface AccountingEntryDialogProps {
  entry?: AccountingEntry;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingEntry?: AccountingEntry;
}

// Photography business categories organized by type
const INCOME_CATEGORIES = [
  'Equipment Sales',
  'Security Deposits Received', 
  'Photography Consultation',
  'Miscellaneous Income',
] as const;

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Software Subscriptions',
  'Equipment Maintenance',
  'Professional Services',
  'Business Insurance',
  'Bank Charges',
  'Office Rent & Utilities',
  'Miscellaneous Expenses'
] as const;

const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES
] as const;

export const AccountingEntryDialog = ({ entry, trigger, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange, editingEntry }: AccountingEntryDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>(entry?.document_url || '');
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<z.infer<typeof formSchema> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createEntry, updateEntry } = useAccountingEntries();
  const { currentFirmId } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_type: (entry?.entry_type as any) || 'Credit',
      category: (entry?.category as any) || 'Equipment Sales',
      subcategory: entry?.subcategory || '',
      title: entry?.title || '',
      description: entry?.description || '',
      amount: entry?.amount || 0,
      entry_date: entry ? new Date(entry.entry_date) : new Date(),
      payment_method: (entry?.payment_method as any) || 'Cash',
      document_url: entry?.document_url || '',
      reflect_to_company: entry?.reflect_to_company || false,
    },
  });

  // Watch the entry type to dynamically filter categories
  const entryType = form.watch('entry_type');
  const currentCategory = form.watch('category');

  // Get available categories based on entry type
  const getAvailableCategories = () => {
    if (entryType === 'Credit') return INCOME_CATEGORIES;
    if (entryType === 'Debit') return EXPENSE_CATEGORIES;
    return ALL_CATEGORIES;
  };

  // Reset category if it's not valid for the selected entry type
  const handleEntryTypeChange = (newEntryType: 'Credit' | 'Debit') => {
    form.setValue('entry_type', newEntryType);
    
    const availableCategories = newEntryType === 'Credit' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    
    // If current category is not valid for the new entry type, reset to the first available category
    const categoryExists = availableCategories.some(cat => cat === currentCategory);
    if (!categoryExists) {
      form.setValue('category', availableCategories[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "No firm selected. Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Get current user ID for storage path (required by RLS policy)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('accounting-documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('accounting-documents')
        .getPublicUrl(data.path);

      setUploadedFileUrl(publicUrl);
      form.setValue('document_url', publicUrl);
      
      toast({
        title: "Document uploaded",
        description: "Document has been uploaded successfully.",
      });
    } catch (error) {
      // Upload error
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeDocument = () => {
    setUploadedFileUrl('');
    form.setValue('document_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // If editing existing entry, proceed directly
    if (entry) {
      submitEntry(values);
      return;
    }

    // For new entries, show company reflection dialog
    setPendingSubmission(values);
    setShowCompanyDialog(true);
  };

  const submitEntry = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      const entryData = {
        category: values.category,
        subcategory: values.subcategory,
        title: values.title,
        description: values.description,
        amount: values.amount,
        entry_type: values.entry_type,
        entry_date: values.entry_date.toISOString().split('T')[0],
        payment_method: values.payment_method,
        document_url: values.document_url || null,
        reflect_to_company: values.reflect_to_company,
      };

      if (entry) {
        await updateEntry(entry.id, entryData);
        toast({
          title: "Entry updated",
          description: "Accounting entry has been updated successfully.",
        });
      } else {
        const result = await createEntry(entryData);
        if (result) {
          toast({
            title: "Entry created",
            description: values.reflect_to_company 
              ? "Accounting entry created and reflected in company finances."
              : "Accounting entry created as personal record.",
          });
        }
      }

      // Always close dialog and reset state after successful submission
      setOpen(false);
      setShowCompanyDialog(false);
      setPendingSubmission(null);
      form.reset();
      setUploadedFileUrl('');
      
      // Call the onSuccess callback to trigger refresh
      onSuccess?.();
    } catch (error) {
      console.error('Error saving accounting entry:', error);
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompanyConfirmation = (reflectToCompany: boolean) => {
    if (pendingSubmission) {
      const finalValues = { ...pendingSubmission, reflect_to_company: reflectToCompany };
      submitEntry(finalValues);
    }
  };

  const handleNoCompanyReflection = () => {
    handleCompanyConfirmation(false);
  };

  // Reset form when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setShowCompanyDialog(false);
      setPendingSubmission(null);
      setUploadedFileUrl('');
      form.reset();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button size="sm" className="h-9 w-9 p-0">
              <Add01Icon className="w-4 h-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{entry ? 'Edit' : 'Add'} Accounting Entry</DialogTitle>
            <DialogDescription>
              {entry ? 'Update the accounting entry details.' : 'Add a new accounting entry to track your business finances.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Row 1: Entry Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entry_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Type <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => handleEntryTypeChange(value as 'Credit' | 'Debit')} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="Credit">Credit</SelectItem>
                          <SelectItem value="Debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
                          {getAvailableCategories().map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter entry title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 2: Amount and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Date - Full Width */}
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <InlineDatePicker
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder="Select date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document Upload */}
              <div className="space-y-2">
                <FormLabel>Document (Optional)</FormLabel>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <AttachmentIcon className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                  {uploadedFileUrl && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(uploadedFileUrl, '_blank')}
                      >
                        View Document
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeDocument}
                      >
                        <Delete02Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload receipts, invoices, bills, or other relevant documents
                </p>
              </div>

              {/* Company Reflection Toggle for Editing */}
              {entry && (
                <FormField
                  control={form.control}
                  name="reflect_to_company"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Reflect in Company Finances</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Include this entry in finance reports and calculations
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || submitting}>
                  {submitting ? (
                    <>
                      <Loading02Icon className="w-4 h-4 mr-2 animate-spin" />
                      {entry ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {entry ? 'Update' : 'Create'} Entry
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Company Reflection Confirmation Dialog */}
      <EnhancedConfirmationDialog
        open={showCompanyDialog}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            // User closed dialog without choosing - reset state to allow editing
            setShowCompanyDialog(false);
            setPendingSubmission(null);
            // Don't auto-submit, let user go back to form
          }
        }}
        onConfirm={() => handleCompanyConfirmation(true)}
        onCancel={() => handleCompanyConfirmation(false)}
        title="Reflect to Company Finances?"
        description="Do you want this entry to be reflected in your company's financial reports and statistics?

• YES: This entry will affect your company's payment in/out calculations and appear in financial reports.

• NO: This will be recorded as a personal accounting entry only.

• CLOSE (X): Cancel and go back to edit the form."
        confirmText="Yes, Reflect to Company" 
        cancelText="No, Personal Only"
        variant="warning"
        icon={<Alert01Icon className="h-5 w-5" />}
        loading={submitting}
      />
    </>
  );
};