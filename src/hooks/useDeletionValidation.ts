import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  canDelete: boolean;
  title: string;
  description: string;
  relatedItems: {
    events: number;
    quotations: number;
    tasks?: number;
    payments?: number;
  };
}

export const useDeletionValidation = () => {
  const validateClientDeletion = async (clientId: string): Promise<ValidationResult> => {
    try {
      const [eventsData, quotationsData] = await Promise.all([
        supabase
          .from('events')
          .select('id, title')
          .eq('client_id', clientId),
        supabase
          .from('quotations')
          .select('id, title')
          .eq('client_id', clientId)
      ]);

      const events = eventsData.data || [];
      const quotations = quotationsData.data || [];
      const totalRelated = events.length + quotations.length;

      if (totalRelated > 0) {
        return {
          canDelete: false,
          title: "Cannot Delete Client",
          description: `This client cannot be deleted because they have ${totalRelated} associated record(s):

${events.length > 0 ? `• ${events.length} Event(s): ${events.slice(0, 3).map(e => e.title).join(', ')}${events.length > 3 ? '...' : ''}` : ''}
${quotations.length > 0 ? `• ${quotations.length} Quotation(s): ${quotations.slice(0, 3).map(q => q.title).join(', ')}${quotations.length > 3 ? '...' : ''}` : ''}

To delete this client, you must first remove or reassign all associated events and quotations.`,
          relatedItems: {
            events: events.length,
            quotations: quotations.length
          }
        };
      }

      return {
        canDelete: true,
        title: "Delete Client",
        description: "You are about to permanently delete this client. This action cannot be undone and will permanently remove all client information including contact details and history.",
        relatedItems: {
          events: 0,
          quotations: 0
        }
      };
    } catch (error) {
      console.error('Error validating client deletion:', error);
      return {
        canDelete: false,
        title: "Validation Error",
        description: "Unable to verify if this client can be safely deleted. Please try again.",
        relatedItems: {
          events: 0,
          quotations: 0
        }
      };
    }
  };

  const validateFreelancerDeletion = async (freelancerId: string): Promise<ValidationResult> => {
    try {
      const [assignmentsData, paymentsData, tasksData] = await Promise.all([
        supabase
          .from('event_staff_assignments')
          .select('id, events(title)')
          .eq('freelancer_id', freelancerId),
        supabase
          .from('freelancer_payments')
          .select('id')
          .eq('freelancer_id', freelancerId),
        supabase
          .from('tasks')
          .select('id, title')
          .eq('freelancer_id', freelancerId)
      ]);

      const assignments = assignmentsData.data || [];
      const payments = paymentsData.data || [];
      const tasks = tasksData.data || [];
      const totalRelated = assignments.length + payments.length + tasks.length;

      if (totalRelated > 0) {
        return {
          canDelete: false,
          title: "Cannot Delete Freelancer",
          description: `This freelancer cannot be deleted because they have ${totalRelated} associated record(s):

${assignments.length > 0 ? `• ${assignments.length} Event Assignment(s)` : ''}
${payments.length > 0 ? `• ${payments.length} Payment Record(s)` : ''}
${tasks.length > 0 ? `• ${tasks.length} Task Assignment(s)` : ''}

To delete this freelancer, you must first remove all associated assignments, payments, and tasks.`,
          relatedItems: {
            events: assignments.length,
            quotations: 0,
            tasks: tasks.length,
            payments: payments.length
          }
        };
      }

      return {
        canDelete: true,
        title: "Delete Freelancer",
        description: "You are about to permanently delete this freelancer. This action cannot be undone and will permanently remove all freelancer information and history.",
        relatedItems: {
          events: 0,
          quotations: 0,
          tasks: 0,
          payments: 0
        }
      };
    } catch (error) {
      console.error('Error validating freelancer deletion:', error);
      return {
        canDelete: false,
        title: "Validation Error",
        description: "Unable to verify if this freelancer can be safely deleted. Please try again.",
        relatedItems: {
          events: 0,
          quotations: 0,
          tasks: 0,
          payments: 0
        }
      };
    }
  };

  const validateQuotationDeletion = async (quotationId: string): Promise<ValidationResult> => {
    try {
      const { data: quotation } = await supabase
        .from('quotations')
        .select('converted_to_event, events(title)')
        .eq('id', quotationId)
        .single();

      if (quotation?.converted_to_event) {
        return {
          canDelete: false,
          title: "Cannot Delete Quotation",
          description: `This quotation cannot be deleted because it has been converted to an event: "${quotation.events?.title}"

To delete this quotation, you must first delete the associated event or remove the conversion link.`,
          relatedItems: {
            events: 1,
            quotations: 0
          }
        };
      }

      return {
        canDelete: true,
        title: "Delete Quotation",
        description: "You are about to permanently delete this quotation. This action cannot be undone and will permanently remove all quotation details and history.",
        relatedItems: {
          events: 0,
          quotations: 0
        }
      };
    } catch (error) {
      console.error('Error validating quotation deletion:', error);
      return {
        canDelete: false,
        title: "Validation Error",
        description: "Unable to verify if this quotation can be safely deleted. Please try again.",
        relatedItems: {
          events: 0,
          quotations: 0
        }
      };
    }
  };


  const validateTaskDeletion = async (taskId: string): Promise<ValidationResult> => {
    try {
      const { data: task } = await supabase
        .from('tasks')
        .select('title, status, assigned_to, freelancer_id, event:events(title)')
        .eq('id', taskId)
        .single();

      if (!task) {
        return {
          canDelete: false,
          title: "Validation Error",
          description: "Task not found.",
          relatedItems: {
            events: 0,
            quotations: 0
          }
        };
      }

      // Allow deletion of any task regardless of status or assignment

      return {
        canDelete: true,
        title: "Delete Task",
        description: `You are about to permanently delete this task: "${task.title}"

This action will:
• Remove the task permanently
• Send cancellation notifications to assignees (if any)
• Remove task from Google Sheets sync

This action cannot be undone.`,
        relatedItems: {
          events: 0,
          quotations: 0,
          tasks: 0
        }
      };
    } catch (error) {
      console.error('Error validating task deletion:', error);
      return {
        canDelete: false,
        title: "Validation Error",
        description: "Unable to verify if this task can be safely deleted. Please try again.",
        relatedItems: {
          events: 0,
          quotations: 0,
          tasks: 0
        }
      };
    }
  };

  return {
    validateClientDeletion,
    validateFreelancerDeletion,
    validateQuotationDeletion,
    validateTaskDeletion
  };
};