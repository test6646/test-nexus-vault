-- Fix the Google Sheets sync trigger to NOT sync on DELETE operations
-- This prevents new entries being created when events are deleted

DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON events;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON payments;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON tasks;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON expenses;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON freelancers;
DROP TRIGGER IF EXISTS trigger_google_sheets_sync ON clients;

-- Recreate triggers with BEFORE INSERT OR UPDATE (excluding DELETE)
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