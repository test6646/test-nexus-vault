import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/integrations/supabase/client"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { InlineDatePicker } from "@/components/ui/inline-date-picker"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { Loader2, MessageCircle } from "lucide-react"
import { Task } from "@/types/studio";




const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  assigned_to: z.string().optional(),
  event_id: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  task_type: z.enum(["Photo Editing", "Video Editing", "Other"]).optional(),
  amount: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      return /^\d+(\.\d{1,2})?$/.test(val);
    }, "Amount must contain only digits and optional decimal point"),
  description: z.string().optional(),
});

interface SimpleEvent {
  id: string;
  title: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingTask?: Task | null;
  events: SimpleEvent[];
  staffMembers: StaffMember[];
}

export const TaskFormDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editingTask, 
  events, 
  staffMembers 
}: TaskFormDialogProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  
  const actualFirmId = profile?.current_firm_id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptimisticUpdate, setShowOptimisticUpdate] = useState(false);

  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      assigned_to: "",
      event_id: "",
      priority: "Medium",
      task_type: "Other",
      amount: "",
      due_date: undefined,
      description: "",
    },
  });

  // Reset form when editingTask changes
  useEffect(() => {
    if (editingTask) {
      form.reset({
        title: editingTask.title || "",
        assigned_to: editingTask.assigned_to || "",
        event_id: editingTask.event_id || "",
        priority: editingTask.priority || "Medium",
        task_type: editingTask.task_type || "Other",
        amount: editingTask.amount?.toString() || "",
        due_date: editingTask.due_date ? new Date(editingTask.due_date) : undefined,
        description: editingTask.description || "",
      });
    } else {
      form.reset({
        title: "",
        assigned_to: "",
        event_id: "",
        priority: "Medium",
        task_type: "Other",
        amount: "",
        due_date: undefined,
        description: "",
      });
    }
  }, [editingTask, form]);

  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    if (!actualFirmId) {
      toast({
        title: "Error",
        description: "No firm selected. Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    

    // Show optimistic update
    setShowOptimisticUpdate(true);
    
    try {
      const taskData = {
        title: values.title,
        description: values.description || null,
        assigned_to: values.assigned_to || null,
        event_id: values.event_id || null,
        due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : null,
        priority: values.priority || null,
        status: "Waiting for Response" as const, // Always start with this status
        task_type: values.task_type || null,
        amount: values.amount ? Number(values.amount) : null,
        firm_id: actualFirmId,
        created_by: profile?.id,
      };

      if (editingTask) {
        
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select()
          .single();

        if (error) throw error;
        
        
        // Background sync to Google Sheets for updates
        supabase.functions.invoke('sync-single-item-to-google', {
          body: { itemType: 'task', itemId: data.id, firmId: actualFirmId }
        }).catch(() => {}); // Silent background sync
        
        toast({
          title: "Success",
          description: "Task updated successfully!",
        });
      } else {
        
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;
        
        

        // Background sync operation
        if (data.assigned_to) {
          supabase.functions.invoke('sync-single-item-to-google', {
            body: { itemType: 'task', itemId: data.id, firmId: actualFirmId }
          }).catch(() => {}); // Silent background processing
        }
        
        toast({
          title: "Success",
          description: "Task created successfully!",
        });
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      console.error('💥 Task operation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowOptimisticUpdate(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {editingTask ? 'Update the task details.' : 'Fill in the task details to create a new task.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name} ({staff.role})
                          </SelectItem>
                        ))}
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Related Event</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="task_type"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Task Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Photo Editing">Photo Editing</SelectItem>
                        <SelectItem value="Video Editing">Video Editing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <InlineDatePicker
                        onSelect={field.onChange}
                        value={field.value}
                        placeholder="Select due date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                     <Input 
                       placeholder="Enter task amount (optional)" 
                       {...field} 
                       onChange={(e) => {
                         const value = e.target.value;
                         if (value === '' || /^\d*\.?\d*$/.test(value)) {
                           field.onChange(e);
                         }
                       }}
                     />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting || showOptimisticUpdate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingTask ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
