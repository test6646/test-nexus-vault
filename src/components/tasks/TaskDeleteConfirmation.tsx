import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { useAuth } from '@/components/auth/AuthProvider';

interface TaskDeleteConfirmationProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TaskDeleteConfirmation = ({ task, open, onOpenChange, onSuccess }: TaskDeleteConfirmationProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { profile, currentFirmId } = useAuth();

  const handleDelete = async () => {
    if (!task || !currentFirmId) return;
    
    setDeleting(true);
    try {
      // First delete from Google Sheets if possible
      try {
        await supabase.functions.invoke('delete-item-from-google', {
          body: { 
            itemType: 'task', 
            itemId: task.id, 
            firmId: currentFirmId 
          }
        });
      } catch (sheetError) {
        console.warn('Failed to delete from Google Sheets:', sheetError);
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Task deleted successfully",
        description: `"${task.title}" has been removed from the system and Google Sheets.`,
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
    <EnhancedConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      title="Delete Task"
      description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
      variant="destructive"
      confirmText={deleting ? "Deleting..." : "Delete Task"}
      requireTextConfirmation={true}
      confirmationKeyword="DELETE"
      loading={deleting}
    />
  );
};