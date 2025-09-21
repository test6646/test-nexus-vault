-- Clear existing pricing config
DELETE FROM pricing_config;

-- Insert correct pricing structure for Wedding Film
INSERT INTO pricing_config (firm_id, event_type, service_type, price, unit, camera_count, description) 
SELECT 
  f.id as firm_id,
  'Wedding' as event_type,
  service_type,
  price,
  unit,
  camera_count,
  description
FROM firms f,
(VALUES 
  ('Camera 1 Hour', 1500, 'hour', 1, '1 Cam / Hour'),
  ('Camera 2 Hour', 2200, 'hour', 2, '2 Cam / Hour'),
  ('Camera Additional Hour', 800, 'hour', null, 'Additional Cam / Hour (beyond 2) – +₹800 per cam'),
  ('Highlight 1 Cam', 3000, 'fixed', 1, '1 Cam Highlight'),
  ('Highlight 2 Cam', 3500, 'fixed', 2, '2 Cam Highlight'),
  ('Highlight 2+ Cam', 4000, 'fixed', null, '2+ Cam Highlight'),
  ('Same Day Highlight', 7000, 'fixed', null, 'Same Day Highlight'),
  ('Reel', 800, 'fixed', null, 'Reel'),
  ('Full Film', 2500, 'fixed', null, 'Full Film'),
  ('Song', 1500, 'fixed', null, 'Song')
) AS v(service_type, price, unit, camera_count, description);

-- Insert pricing for Ring-Ceremony
INSERT INTO pricing_config (firm_id, event_type, service_type, price, unit, camera_count, description) 
SELECT 
  f.id as firm_id,
  'Ring-Ceremony' as event_type,
  service_type,
  price,
  unit,
  camera_count,
  description
FROM firms f,
(VALUES 
  ('Highlight', 2500, 'fixed', null, 'Highlight'),
  ('Reel', 800, 'fixed', null, 'Reel'),
  ('Song', 5000, 'fixed', null, 'Song'),
  ('Teaser', 4000, 'fixed', null, 'Teaser'),
  ('Pre-Wedding Song', 8000, 'fixed', null, 'Pre-Wedding Song')
) AS v(service_type, price, unit, camera_count, description);

-- Insert pricing for Maternity Photography (same as Ring-Ceremony)
INSERT INTO pricing_config (firm_id, event_type, service_type, price, unit, camera_count, description) 
SELECT 
  f.id as firm_id,
  'Maternity Photography' as event_type,
  service_type,
  price,
  unit,
  camera_count,
  description
FROM firms f,
(VALUES 
  ('Highlight', 2500, 'fixed', null, 'Highlight'),
  ('Reel', 800, 'fixed', null, 'Reel'),
  ('Song', 5000, 'fixed', null, 'Song'),
  ('Teaser', 4000, 'fixed', null, 'Teaser'),
  ('Pre-Wedding Song', 8000, 'fixed', null, 'Pre-Wedding Song')
) AS v(service_type, price, unit, camera_count, description);

-- Insert pricing for Pre-Wedding
INSERT INTO pricing_config (firm_id, event_type, service_type, price, unit, camera_count, description) 
SELECT 
  f.id as firm_id,
  'Pre-Wedding' as event_type,
  service_type,
  price,
  unit,
  camera_count,
  description
FROM firms f,
(VALUES 
  ('Teaser', 2500, 'fixed', null, 'Teaser'),
  ('Song', 6000, 'fixed', null, 'Song'),
  ('Reel', 800, 'fixed', null, 'Reel'),
  ('Highlight', 6000, 'fixed', null, 'Highlight')
) AS v(service_type, price, unit, camera_count, description);

-- Insert Other Edit Work (applies to all events)
INSERT INTO pricing_config (firm_id, event_type, service_type, price, unit, camera_count, description) 
SELECT 
  f.id as firm_id,
  event_type,
  service_type,
  price,
  unit,
  camera_count,
  description
FROM firms f,
(SELECT unnest(ARRAY['Wedding', 'Ring-Ceremony', 'Pre-Wedding', 'Maternity Photography', 'Others']) as event_type),
(VALUES 
  ('Reel Edit', 800, 'fixed', null, 'Reel Edit'),
  ('Highlight Edit', 6000, 'fixed', null, 'Highlight Edit'),
  ('Song Edit', 5000, 'fixed', null, 'Song Edit'),
  ('Pre-Wedding Song Edit', 8000, 'fixed', null, 'Pre-Wedding Song Edit'),
  ('Teaser Edit', 4000, 'fixed', null, 'Teaser Edit')
) AS v(service_type, price, unit, camera_count, description);