-- Clean up duplicate triggers for task editing status
DROP TRIGGER IF EXISTS update_event_editing_status_trigger ON public.tasks;
DROP TRIGGER IF EXISTS update_editing_status_only ON public.tasks;
DROP TRIGGER IF EXISTS update_event_editing_on_task_completion ON public.tasks;

-- Create a single, properly named trigger
CREATE TRIGGER update_event_editing_status_on_task_completion_trigger
    AFTER UPDATE ON public.tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_editing_status_on_task_completion();