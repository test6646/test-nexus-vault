-- First, drop ALL existing Google Sheets sync triggers from all tables
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON events;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON payments;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON tasks;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON expenses;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON freelancers;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON clients;

-- Drop any specifically named triggers that might exist
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_events ON events;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_payments ON payments;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_tasks ON tasks;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_expenses ON expenses;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_freelancers ON freelancers;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync_clients ON clients;

-- Now recreate triggers ONLY for INSERT and UPDATE operations (NOT DELETE)
-- This prevents Google Sheets sync from triggering when items are deleted
CREATE TRIGGER trigger_google_sheets_sync_events
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_google_sheets_sync_payments
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_google_sheets_sync_tasks
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_google_sheets_sync_expenses
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_google_sheets_sync_freelancers
    BEFORE INSERT OR UPDATE ON freelancers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();

CREATE TRIGGER trigger_google_sheets_sync_clients
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_google_sheets_sync();