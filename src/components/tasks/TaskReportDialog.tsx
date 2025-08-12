import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/studio';

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

      // Send notification to staff member
      if (task.assigned_to) {
        try {
          let staffPhone = null;
          
          // Try to get phone from profiles table first (mobile_number)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('mobile_number')
            .eq('id', task.assigned_to)
            .single();
            
          if (profileData?.mobile_number) {
            staffPhone = profileData.mobile_number;
          } else {
            // Try freelancers table (phone)
            const { data: freelancerData } = await supabase
              .from('freelancers')
              .select('phone')
              .eq('id', task.assigned_to)
              .single();
              
            if (freelancerData?.phone) {
              staffPhone = freelancerData.phone;
            }
          }

          const firmId = localStorage.getItem('selectedFirmId');
          await supabase.functions.invoke('send-staff-notification', {
            body: {
              staffName: task.assignee?.full_name || 'Staff Member',
              staffPhone: staffPhone,
              taskTitle: task.title,
              eventName: task.event?.title,
              firmId: firmId,
              notificationType: 'task_reported'
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the whole operation if notification fails
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
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)] rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white">
        <DialogHeader className="border-b border-red-100 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-red-900 font-semibold">Report Task Issue</div>
              <div className="text-sm text-red-600 font-normal">Flag quality or delivery issues</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Task Information Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-700">Task Details</span>
              </div>
              <h3 className="font-semibold text-gray-900">{task.title}</h3>
              <p className="text-sm text-gray-600">
                Assigned to: <span className="font-medium">{task.assignee?.full_name || 'Unknown'}</span>
              </p>
              {task.event && (
                <p className="text-sm text-gray-600">
                  Related Event: <span className="font-medium">{task.event.title}</span>
                </p>
              )}
            </div>
          </div>

          {/* Report Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Select Issue Type
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50/50 transition-colors">
                  <RadioGroupItem value={reason} id={reason} className="border-red-300 text-red-600" />
                  <Label htmlFor={reason} className="text-sm text-gray-700 cursor-pointer flex-1">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Specify Issue
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Please describe the specific issue with this task..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="border-red-200 focus:border-red-400 focus:ring-red-200"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              Additional Comments
              <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Any additional feedback or instructions for the staff member..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              className="border-gray-200 focus:border-gray-400 focus:ring-gray-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-red-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
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