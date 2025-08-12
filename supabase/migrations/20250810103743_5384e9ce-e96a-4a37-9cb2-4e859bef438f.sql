-- Fix RLS disabled issues by enabling RLS on all tables without it
-- Enable RLS on all tables that currently don't have it

ALTER TABLE event_assignment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;

-- Fix the events-payments relationship issue by ensuring unique constraint
-- Create index to improve performance of payment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_event_id ON payments(event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_firm_id ON payments(firm_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);