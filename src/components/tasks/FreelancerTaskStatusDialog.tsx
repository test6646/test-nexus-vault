import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus } from '@/types/studio';
import { TASK_STATUSES, getStatusColor } from '@/lib/task-status-utils';
import { Loader2, MessageCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

interface FreelancerTaskStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onStatusChange: () => void;
  onUpdateTaskStatus?: (taskId: string, status: any) => void;
}

const FreelancerTaskStatusDialog = ({ 
  open, 
  onOpenChange, 
  task, 
  onStatusChange,
  onUpdateTaskStatus
}: FreelancerTaskStatusDialogProps) => {
  const [newStatus, setNewStatus] = useState<TaskStatus>('Waiting for Response');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { currentFirmId } = useAuth();

  const handleStatusUpdate = async () => {
    if (!task) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      // ✅ CRITICAL: Update event editing status for photo/video tasks when completed
      if (newStatus === 'Completed' && task.event_id) {
        // Check for photo editing tasks
        const isPhotoTask = task.task_type === 'Photo Editing' || 
                           (task.title && task.title.toLowerCase().includes('photo')) ||
                           (task.description && task.description.toLowerCase().includes('photo'));
        
        // Check for video editing tasks  
        const isVideoTask = task.task_type === 'Video Editing' ||
                           (task.title && task.title.toLowerCase().includes('video')) ||
                           (task.description && task.description.toLowerCase().includes('video'));

        if (isPhotoTask) {
          supabase.functions.invoke('update-event-editing-status', {
            body: {
              eventId: task.event_id,
              taskType: 'Photo Editing',
              isCompleted: true
            }
          }).then(() => {
            console.log(`✅ Event photo editing status updated for freelancer task: ${task.title}`);
          }).catch(editingError => {
            console.error('❌ Error updating photo editing status:', editingError);
          });
        }

        if (isVideoTask) {
          supabase.functions.invoke('update-event-editing-status', {
            body: {
              eventId: task.event_id,
              taskType: 'Video Editing',
              isCompleted: true
            }
          }).then(() => {
            console.log(`✅ Event video editing status updated for freelancer task: ${task.title}`);
          }).catch(editingError => {
            console.error('❌ Error updating video editing status:', editingError);
          });
        }
      }

      // ✅ CRITICAL: Trigger Google Sheets sync after status update
      try {
        const { data: profile } = await supabase.auth.getUser();
        if (profile?.user) {
          if (currentFirmId) {
            // Import and sync in background
            import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
              syncTaskInBackground(task.id, currentFirmId, 'update');
              console.log(`🔄 Task ${task.id} status update synced to Google Sheets`);
            }).catch(syncError => {
              console.error('❌ Failed to sync task status to Google Sheets:', syncError);
            });
          }
        }
      } catch (syncError) {
        console.error('❌ Failed to sync task status to Google Sheets:', syncError);
      }

      toast({
        title: "Success",
        description: "Task status updated successfully!",
      });

      onStatusChange();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Under Review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColorLocal = (status: TaskStatus) => {
    return getStatusColor(status);
  };

  useEffect(() => {
    if (open && task) {
      setNewStatus(task.status);
    }
  }, [open, task]);

  if (!task) return null;

  const isFreelancer = !!task.freelancer_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Update Task Status - {isFreelancer ? 'Freelancer' : 'Staff'} Task
          </DialogTitle>
          <DialogDescription>
            Update the status of "{task.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Status</label>
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <Badge className={getStatusColorLocal(task.status)}>
                {task.status}
              </Badge>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select value={newStatus} onValueChange={(value: TaskStatus) => setNewStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {status}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Details */}
          <div className="space-y-2 p-3 bg-muted/50 border rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Task:</span> {task.title}
            </div>
            <div className="text-sm">
              <span className="font-medium">Assigned to:</span> {
                task.freelancer?.full_name || task.assignee?.full_name || 'Unassigned'
              } {isFreelancer && '(Freelancer)'}
            </div>
            {task.event?.title && (
              <div className="text-sm">
                <span className="font-medium">Event:</span> {task.event.title}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdating || newStatus === task.status}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FreelancerTaskStatusDialog;