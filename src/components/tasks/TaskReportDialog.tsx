import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X, FileText, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/studio';
import { useAuth } from '@/components/auth/AuthProvider';
import CentralizedCard from '@/components/common/CentralizedCard';

interface TaskReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  'Quality not meeting standards',
  'Task completed incorrectly',
  'Missing deliverables',
  'Client feedback negative',
  'Technical issues found',
  'Deadline not properly met',
  'Other'
];

const TaskReportDialog = ({ open, onOpenChange, task, onSuccess }: TaskReportDialogProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentFirmId } = useAuth();

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this task.",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      toast({
        title: "Please specify the reason",
        description: "Please provide details for 'Other' reason.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        reason: selectedReason === 'Other' ? customReason : selectedReason,
        additional_notes: additionalNotes,
        reported_at: new Date().toISOString()
      };

      // Update task status to "Reported" and add report data
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'Reported' as any,
          report_data: reportData,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      // Send notification to staff member or freelancer
if (task.assigned_to || task.freelancer_id) {
  try {
    let staffName = 'Staff Member';
    let staffPhone = null;

    if (task.assigned_to) {
      // Get staff details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, mobile_number')
        .eq('id', task.assigned_to)
        .single();

      if (profileData) {
        staffName = profileData.full_name || 'Staff Member';
        staffPhone = profileData.mobile_number;
      }
    } else if (task.freelancer_id) {
      // Get freelancer details
      const { data: freelancerData } = await supabase
        .from('freelancers')
        .select('full_name, phone')
        .eq('id', task.freelancer_id)
        .single();

      if (freelancerData) {
        staffName = freelancerData.full_name || 'Freelancer';
        staffPhone = freelancerData.phone;
      }
    }

    const firmId = currentFirmId;
    // BACKGROUND NOTIFICATION - Fire and forget
    supabase.functions.invoke('send-staff-notification', {
      body: {
        staffName,
        staffPhone,
        taskTitle: task.title,
        eventName: task.event?.title,
        firmId,
        notificationType: 'task_reported'
      }
    }).then(() => {
      console.log('✅ Task report notification sent successfully');
    }).catch(notificationError => {
      console.error('Failed to send notification:', notificationError);
    });
  } catch (notificationError) {
    console.error('Error preparing notification:', notificationError);
  }
}

      toast({
        title: "Task reported successfully",
        description: "The task has been marked as reported and the staff member will be notified.",
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
      setAdditionalNotes('');

    } catch (error: any) {
      console.error('Error reporting task:', error);
      toast({
        title: "Error reporting task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Task Issue
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Flag quality or delivery issues with this task
          </p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Task Information */}
          <div className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-l-4 border-l-destructive/50 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Task Details</span>
            </div>
            <h3 className="font-semibold text-base sm:text-lg">{task.title}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>Assigned to: {task.assignee?.full_name || 'Unassigned'}</span>
              </div>
              {task.event && (
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span>Event: {task.event.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Report Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Select Issue Type *
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-3 p-2 sm:p-3 rounded-lg border hover:border-border/80 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="text-sm cursor-pointer flex-1 leading-relaxed">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-medium">
                Specify Issue *
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Please describe the specific issue with this task..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-sm font-medium">
              Additional Comments
              <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Any additional feedback or instructions for the staff member..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:flex-1 order-2 sm:order-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="destructive"
              className="w-full sm:flex-1 order-1 sm:order-2"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {loading ? 'Reporting...' : 'Report Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskReportDialog;
