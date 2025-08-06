-- First enable RLS on tables that need it
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Check if triggers exist and drop them first, then recreate
DROP TRIGGER IF EXISTS trigger_tasks_google_sheets_sync ON tasks;
DROP TRIGGER IF EXISTS trigger_payments_google_sheets_sync ON payments;
DROP TRIGGER IF EXISTS trigger_expenses_google_sheets_sync ON expenses;

-- Create triggers for Google Sheets sync
CREATE TRIGGER trigger_tasks_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_payments_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_expenses_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();