import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/studio';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface TaskDeleteConfirmationProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TaskDeleteConfirmation = ({ task, open, onOpenChange, onSuccess }: TaskDeleteConfirmationProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!task) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Task deleted successfully",
        description: `"${task.title}" has been removed from the system.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      title="Delete Task"
      description={`Are you sure you want to delete "${task.title}"? This action cannot be undone and will permanently remove the task, including any assigned staff and progress information.`}
      variant="destructive"
      confirmText={deleting ? "Deleting..." : "Delete Task"}
    />
  );
};