-- Add new task status values
ALTER TYPE task_status ADD VALUE 'Waiting for Response';
ALTER TYPE task_status ADD VALUE 'Accepted';  
ALTER TYPE task_status ADD VALUE 'Declined';