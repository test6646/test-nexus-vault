-- Add default pricing configuration to firms table
ALTER TABLE firms ADD COLUMN IF NOT EXISTS default_role_rates JSONB DEFAULT '{
  "photographer": 14000,
  "cinematographer": 16000,
  "drone": 12000,
  "editor": 8000
}'::jsonb;

ALTER TABLE firms ADD COLUMN IF NOT EXISTS default_addon_rates JSONB DEFAULT '{
  "1_day_drone": 12000,
  "2_days_pre_wedding": 65000,
  "1_day_pre_wedding": 50000,
  "1_day_pre_photoshot": 22000,
  "live_hd_setup": 60000,
  "side_10x20_led_wall": 25000,
  "background_led_per_fit": 135,
  "album_page": 450,
  "full_length_film": 22000
}'::jsonb;