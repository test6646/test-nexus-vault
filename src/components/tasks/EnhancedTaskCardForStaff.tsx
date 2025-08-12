
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar01Icon, Clock01Icon, UserIcon, Tick02Icon, AlertCircleIcon, PlayIcon, PauseIcon, TaskDaily01Icon, ArrowUp01Icon, ArrowRight01Icon, ArrowDown01Icon, Camera01Icon, CreditCardIcon, CircleIcon } from 'hugeicons-react';
import { Task, TaskStatus } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import { useAuth } from '@/components/auth/AuthProvider';
import CentralizedCard from '@/components/common/CentralizedCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnhancedTaskCardForStaffProps {
  task: Task & {
    event?: {
      id: string;
      title: string;
      client?: { name: string };
    };
    assigned_staff?: {
      id: string;
      full_name: string;
    };
  };
  onStatusChange: () => void;
  onUpdateTaskStatus?: (taskId: string, status: any) => void;
}

const EnhancedTaskCardForStaff = ({ task, onStatusChange, onUpdateTaskStatus }: EnhancedTaskCardForStaffProps) => {
  const [updating, setUpdating] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const { toast } = useToast();
  const { syncItemToSheets } = useGoogleSheetsSync();
  const { profile, currentFirmId } = useAuth();

  // Check if this is a shooting task (photography/videography from events)
  const isShootingTask = task.task_type === 'Other' && 
    (task.title.toLowerCase().includes('photograph') || 
     task.title.toLowerCase().includes('videograph') ||
     task.title.toLowerCase().includes('shooting') ||
     task.title.toLowerCase().includes('shoot'));

  // Auto-accept shooting tasks when component loads
  useEffect(() => {
    if (isShootingTask && task.status === 'Waiting for Response') {
      updateTaskStatus('In Progress');
    }
  }, [isShootingTask, task.status]);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return <Tick02Icon className="h-4 w-4 text-primary" />;
      case 'In Progress':
        return <CircleIcon className="h-4 w-4 text-primary" />;
      case 'On Hold':
        return <PauseIcon className="h-4 w-4 text-primary" />;
      case 'Under Review':
        return <AlertCircleIcon className="h-4 w-4 text-primary" />;
      case 'Accepted':
        return <Tick02Icon className="h-4 w-4 text-primary" />;
      case 'Declined':
        return <AlertCircleIcon className="h-4 w-4 text-primary" />;
      default:
        return <Clock01Icon className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        // Green for photo/video editing tasks, default success for others
        if (task.task_type === 'Photo Editing' || task.task_type === 'Video Editing') {
          return 'bg-green-500 text-white';
        }
        return 'bg-success text-success-foreground';
      case 'In Progress':
        return 'bg-warning text-warning-foreground'; // Yellow for in progress
      case 'On Hold':
        return 'bg-warning text-warning-foreground';
      case 'Under Review':
        return 'bg-destructive text-destructive-foreground';
      case 'Accepted':
        return 'bg-success text-success-foreground';
      case 'Declined':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'High':
        return 'bg-warning text-warning-foreground';
      case 'Medium':
        return 'bg-info text-info-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const updateTaskStatus = async (newStatus: TaskStatus) => {
    try {
      setUpdating(true);
      
      // Show immediate feedback
      let completionMessage = `Task status changed to ${newStatus}`;
      if (newStatus === 'Completed') {
        if (task.task_type === 'Photo Editing') {
          completionMessage = 'Photos have been edited successfully!';
        } else if (task.task_type === 'Video Editing') {
          completionMessage = 'Videos have been edited successfully!';
        } else if (isShootingTask) {
          if (task.title.toLowerCase().includes('photograph')) {
            completionMessage = 'Photography session completed successfully!';
          } else if (task.title.toLowerCase().includes('videograph')) {
            completionMessage = 'Videography session completed successfully!';
          } else {
            completionMessage = 'Shooting session completed successfully!';
          }
        }
      }

      toast({
        title: "Task updated successfully",
        description: completionMessage,
      });

      // Update database first, then trigger UI updates
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'Completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) {
        console.error('Error updating task status:', error);
        toast({
          title: "Error updating task",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Trigger UI update after successful database update
      onStatusChange();

      // ✅ ENHANCED: Sync to Google Sheets in background using centralized service
      if (currentFirmId) {
        import('@/services/googleSheetsSync').then(({ syncTaskInBackground }) => {
          syncTaskInBackground(task.id, currentFirmId, 'update');
          console.log(`🔄 Task ${task.id} status synced to Google Sheets`);
        }).catch(syncError => {
          console.error('❌ Failed to sync task status to Google Sheets:', syncError);
        });
      }

      // Update event editing status in background
      if (newStatus === 'Completed' && (task.task_type === 'Photo Editing' || task.task_type === 'Video Editing') && task.event_id) {
        supabase.functions.invoke('update-event-editing-status', {
          body: {
            eventId: task.event_id,
            taskType: task.task_type,
            isCompleted: true
          }
        }).catch(editingStatusError => {
          console.error('Error updating event editing status:', editingStatusError);
        });
      }

    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const availableStatuses: TaskStatus[] = [
    'Waiting for Response',
    'Accepted',
    'Declined',
    'In Progress',
    'On Hold',
    'Completed',
    'Under Review',
    'Reported'
  ];

  // Get task type color for visual differentiation
  const getTaskTypeColor = () => {
    if (isShootingTask) {
      return 'bg-blue-100 text-blue-800'; // Blue for shooting tasks
    } else if (task.task_type === 'Photo Editing' || task.task_type === 'Video Editing') {
      return 'bg-purple-100 text-purple-800'; // Purple for editing tasks
    }
    return 'bg-muted text-muted-foreground'; // Default for others
  };

  // Get task type icon
  const getTaskTypeIcon = () => {
    if (isShootingTask) {
      return <Camera01Icon className="h-4 w-4 text-primary" />;
    } else if (task.task_type === 'Photo Editing') {
      return <TaskDaily01Icon className="h-4 w-4 text-primary" />;
    } else if (task.task_type === 'Video Editing') {
      return <PlayIcon className="h-4 w-4 text-primary" />;
    }
    return <TaskDaily01Icon className="h-4 w-4 text-primary" />;
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <ArrowUp01Icon className="h-4 w-4 text-primary" />;
      case 'High':
        return <ArrowUp01Icon className="h-4 w-4 text-primary" />;
      case 'Medium':
        return <ArrowRight01Icon className="h-4 w-4 text-primary" />;
      case 'Low':
        return <ArrowDown01Icon className="h-4 w-4 text-primary" />;
      default:
        return <ArrowRight01Icon className="h-4 w-4 text-primary" />;
    }
  };

  // Streamlined metadata for staff cards to prevent overflow
  const metadata = [
    // Task Type
    {
      icon: getTaskTypeIcon(),
      label: 'Type',
      value: isShootingTask ? 'Shooting' : (task.task_type || '~')
    },
    // Priority & Status combined
    {
      icon: getPriorityIcon(task.priority || 'Medium'),
      label: 'Priority',
      value: task.priority || '~'
    },
    // Due Date
    {
      icon: <Clock01Icon className="h-4 w-4 text-primary" />,
      label: 'Due',
      value: task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      }) : '~'
    },
    // Related Event (shortened)
    {
      icon: <Calendar01Icon className="h-4 w-4 text-primary" />,
      label: 'Event',
      value: task.event ? task.event.title.length > 20 ? task.event.title.substring(0, 20) + '...' : task.event.title : '~'
    },
    // Amount (only if significant)
    ...(task.amount && Number(task.amount) > 0 ? [{
      icon: <CreditCardIcon className="h-4 w-4 text-primary" />,
      label: 'Amount',
      value: `₹${Number(task.amount).toLocaleString()}`
    }] : [])
  ];

  return (
    <>
      <CentralizedCard
        title={task.title}
        badges={[]} // Remove badges from top
        description={task.description}
        metadata={metadata}
        actions={task.status === 'Waiting for Response' && !isShootingTask ? [
          { 
            label: 'Accept', 
            onClick: () => updateTaskStatus('Accepted'), 
            variant: 'default' as const, 
            icon: <Tick02Icon className="h-4 w-4" /> 
          },
          { 
            label: 'Decline', 
            onClick: () => updateTaskStatus('Declined'), 
            variant: 'outline' as const, 
            icon: <AlertCircleIcon className="h-4 w-4" /> 
          }
        ] : []}
        className={`${isShootingTask ? "border-blue-200 bg-blue-50/30" : ""} rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px] overflow-hidden`}
      >
        {/* Action Buttons for Accepted tasks - Only for non-shooting tasks */}
        {task.status === 'Accepted' && !isShootingTask && (
          <div className="absolute bottom-4 left-3 right-3">
            <Button
              onClick={() => updateTaskStatus('In Progress')}
              disabled={updating}
              className="w-full"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Start Task
            </Button>
          </div>
        )}

        {/* Action Buttons for In Progress tasks */}
        {task.status === 'In Progress' && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="flex gap-2">
              <Button
                onClick={() => updateTaskStatus('On Hold')}
                disabled={updating}
                variant="outline"
                className="flex-1"
              >
                <PauseIcon className="h-4 w-4 mr-2" />
                Hold
              </Button>
              <Button
                onClick={() => setShowCompleteDialog(true)}
                disabled={updating}
                className="flex-1"
              >
                <Tick02Icon className="h-4 w-4 mr-2" />
                {isShootingTask ? 'Mark Shot' : 'Complete'}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons for On Hold tasks */}
        {task.status === 'On Hold' && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="flex gap-2">
              <Button
                onClick={() => updateTaskStatus('In Progress')}
                disabled={updating}
                className="flex-1"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button
                onClick={() => setShowCompleteDialog(true)}
                disabled={updating}
                variant="outline"
                className="flex-1"
              >
                <Tick02Icon className="h-4 w-4 mr-2" />
                {isShootingTask ? 'Mark Shot' : 'Complete'}
              </Button>
            </div>
          </div>
        )}

        {/* Completed Status Display */}
        {task.status === 'Completed' && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="text-center p-3 bg-success/10 rounded-full border border-success/20">
              <div className="flex items-center justify-center space-x-2 text-success">
                <Tick02Icon className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {isShootingTask ? 'Shooting Completed!' : 'Task Completed!'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Under Review Status Display */}
        {task.status === 'Under Review' && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="text-center p-3 bg-destructive/10 rounded-full border border-destructive/20">
              <div className="flex items-center justify-center space-x-2 text-destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Task Under Review
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reported Status Display with Start Again Button */}
        {task.status === 'Reported' && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="space-y-2">
              <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-center space-x-2 text-red-700">
                  <AlertCircleIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">Task Reported - Issues Found</span>
                </div>
                {task.report_data && (
                  <p className="text-xs text-red-600 mt-1">{task.report_data.reason}</p>
                )}
              </div>
              <Button
                onClick={() => updateTaskStatus('In Progress')}
                disabled={updating}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Again
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {updating && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <span className="text-sm text-muted-foreground">Processing...</span>
            </div>
          </div>
        )}
      </CentralizedCard>

      {/* Custom Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isShootingTask ? 'Mark as Shot' : 'Complete Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark "{task.title}" as {isShootingTask ? 'shot' : 'completed'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCompleteDialog(false);
                updateTaskStatus('Completed');
              }}
              disabled={updating}
            >
              {updating ? (isShootingTask ? 'Marking as Shot...' : 'Completing...') : (isShootingTask ? 'Mark as Shot' : 'Complete Task')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EnhancedTaskCardForStaff;
