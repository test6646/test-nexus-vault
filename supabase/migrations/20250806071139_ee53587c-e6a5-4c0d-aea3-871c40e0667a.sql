-- Enable RLS on all tables that have policies but RLS disabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Create triggers for Google Sheets sync on tasks table (INSERT, UPDATE, DELETE)
CREATE TRIGGER trigger_tasks_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();

-- Also ensure other tables have sync triggers
CREATE TRIGGER trigger_payments_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_expenses_google_sheets_sync
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trigger_google_sheets_sync();