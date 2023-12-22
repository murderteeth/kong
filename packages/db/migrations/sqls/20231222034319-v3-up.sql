ALTER TABLE vault ADD COLUMN profit_max_unlock_time numeric NULL;
ALTER TABLE vault ADD COLUMN profit_unlocking_rate numeric NULL;
ALTER TABLE vault ADD COLUMN full_profit_unlock_date numeric NULL;
ALTER TABLE vault ADD COLUMN last_profit_update numeric NULL;
ALTER TABLE vault ADD COLUMN total_idle numeric NULL;
ALTER TABLE vault ADD COLUMN minimum_total_idle numeric NULL;
