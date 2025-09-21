
import { Calendar, Paperclip, ExternalLink } from "lucide-react";
import { AttachmentIcon, Delete02Icon } from "hugeicons-react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { InlineDatePicker } from "@/components/ui/inline-date-picker";
import { format } from "date-fns";
import { useRef } from "react";

const expenseFormSchema = z.object({
  expense_date: z.date(),
  category: z.enum([
    "Equipment",
    "Travel", 
    "Accommodation",
    "Food",
    "Marketing",
    "Software",
    "Maintenance", 
    "Salary",
    "Other"
  ]),
  payment_method: z.enum([
    "Cash",
    "Digital"
  ]),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  amount: z.string().refine((value) => {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  }, {
    message: "Amount must be a valid number greater than zero.",
  }),
  event_id: z.string().optional(),
  receipt_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseCreated?: (expense: any) => void;
  expense?: any;
  mode?: "create" | "edit";
}

export const ExpenseFormDialog = ({ open, onOpenChange, onExpenseCreated, expense, mode = "create" }: ExpenseFormDialogProps) => {
  const { toast } = useToast();
  const { currentFirmId, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>(expense?.receipt_url || '');
  const [events, setEvents] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_date: new Date(),
      category: "Other",
      payment_method: "Cash",
      description: "",
      amount: "",
      event_id: "none",
      receipt_url: "",
      notes: "",
    },
  });

  // Reset form with expense data when expense prop changes
  useEffect(() => {
    if (expense && mode === "edit") {
      form.reset({
        expense_date: expense.expense_date ? new Date(expense.expense_date) : new Date(),
        category: expense.category || "Other",
        payment_method: expense.payment_method || "Cash",
        description: expense.description || "",
        amount: expense.amount?.toString() || "",
        event_id: expense.event_id || "none",
        receipt_url: expense.receipt_url || "",
        notes: expense.notes || "",
      });
      setUploadedFileUrl(expense.receipt_url || "");
    } else if (mode === "create") {
      form.reset({
        expense_date: new Date(),
        category: "Other",
        payment_method: "Cash",
        description: "",
        amount: "",
        event_id: "none",
        receipt_url: "",
        notes: "",
      });
      setUploadedFileUrl("");
    }
  }, [expense, mode, form]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentFirmId) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title')
          .eq('firm_id', currentFirmId)
          .order('event_date', { ascending: false });

        if (error) {
          toast({
            title: "Error",
            description: "Failed to load events.",
            variant: "destructive",
          });
        } else {
          setEvents(data || []);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load events.",
          variant: "destructive",
        });
      }
    };

    fetchEvents();
  }, [currentFirmId, toast]);

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
      form.setValue('receipt_url', publicUrl);
      
      toast({
        title: "Document uploaded",
        description: "Receipt has been uploaded successfully.",
      });
    } catch (error) {
      
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
    form.setValue('receipt_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: z.infer<typeof expenseFormSchema>) => {
    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "No firm selected. Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    

    try {
      const expenseData = {
        category: values.category,
        payment_method: values.payment_method as any,
        description: values.description,
        amount: Number(values.amount),
        expense_date: format(values.expense_date, 'yyyy-MM-dd'),
        event_id: values.event_id === "none" ? null : values.event_id,
        receipt_url: values.receipt_url || null,
        notes: values.notes || null,
        firm_id: currentFirmId,
        created_by: profile?.id,
      };

      let result;
      if (mode === "edit" && expense?.id) {
        
        const { data, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expense.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        toast({
          title: "Success",
          description: "Expense updated successfully!",
        });
      } else {
        
        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        toast({
          title: "Success",
          description: "Expense created successfully!",
        });
      }

      // Background sync to Google Sheets - Non-blocking
      import('@/services/googleSheetsSync').then(({ syncExpenseInBackground }) => {
        syncExpenseInBackground(result.id, currentFirmId, mode === 'edit' ? 'update' : 'create');
      }).catch(() => {});
      
      
      onExpenseCreated?.(result);
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update expense information"
              : "Add a new expense to your database"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter expense description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Row 1: Amount and Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01"
                        {...field} 
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
                    <FormLabel>Payment Method *</FormLabel>
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
            
            {/* Row 2: Category and Related Event */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Accommodation">Accommodation</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Software">Software</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="event_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Event (Optional)</FormLabel>
                    <SearchableSelect
                      onValueChange={field.onChange} 
                      value={field.value}
                      options={[
                        { value: "none", label: "No event" },
                        ...events.map(event => ({
                          value: event.id,
                          label: event.title
                        }))
                      ]}
                      placeholder="Select an event"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Row 3: Date - Full Width */}
            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Date *</FormLabel>
                  <FormControl>
                    <InlineDatePicker
                      onSelect={field.onChange}
                      value={field.value}
                      placeholder="Select date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Document Upload */}
            <div className="space-y-2">
              <FormLabel>Receipt Document (Optional)</FormLabel>
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
                  {uploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
                {uploadedFileUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(uploadedFileUrl, '_blank')}
                    >
                      View Receipt
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
              <FormField
                control={form.control}
                name="receipt_url"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex flex-row gap-3">
              <Button type="button" variant="outline" onClick={() => {
                onOpenChange(false);
                form.reset();
              }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : (mode === "edit" ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
