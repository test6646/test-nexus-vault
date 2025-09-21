-- Update existing project tasks to have correct amounts based on pricing config
UPDATE project_tasks 
SET amount = (
  SELECT COALESCE(pc.price, 0)
  FROM pricing_config pc
  WHERE pc.service_type = project_tasks.task_type
  AND pc.firm_id = project_tasks.firm_id
  LIMIT 1
)
WHERE amount = 0;