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

      // Update task status to "Under Review" and add report data
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'Under Review' as any,
          report_data: reportData,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Task reported successfully",
        description: "The task has been marked for review and the staff member will be notified.",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Report Task Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Task: <span className="font-medium">{task.title}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Assigned to: <span className="font-medium">{task.assignee?.full_name || 'Unknown'}</span>
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium">Reason for reporting</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="mt-2">
              {REPORT_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="text-sm">{reason}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <Label htmlFor="custom-reason" className="text-sm font-medium">
                Please specify
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Describe the issue..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div>
            <Label htmlFor="additional-notes" className="text-sm font-medium">
              Additional notes (optional)
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Any additional details or instructions..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Reporting...' : 'Report Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskReportDialog;