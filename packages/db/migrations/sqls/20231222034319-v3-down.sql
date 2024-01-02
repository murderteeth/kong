ALTER TABLE vault DROP COLUMN emergency_shutdown;

ALTER TABLE vault DROP COLUMN profit_max_unlock_time;
ALTER TABLE vault DROP COLUMN profit_unlocking_rate;
ALTER TABLE vault DROP COLUMN full_profit_unlock_date;
ALTER TABLE vault DROP COLUMN last_profit_update;
ALTER TABLE vault DROP COLUMN total_idle;
ALTER TABLE vault DROP COLUMN minimum_total_idle;
ALTER TABLE vault DROP COLUMN accountant;
ALTER TABLE vault DROP COLUMN role_manager;
ALTER TABLE vault DROP COLUMN debt_manager;
ALTER TABLE vault DROP COLUMN is_shutdown;

ALTER TABLE harvest DROP COLUMN protocol_fee;
ALTER TABLE harvest DROP COLUMN protocol_fee_usd;
ALTER TABLE harvest DROP COLUMN performance_fees;
ALTER TABLE harvest DROP COLUMN performance_fees_usd;

DROP TABLE vault_debt;

ALTER TABLE block_pointer DROP CONSTRAINT block_pointer_pkey;
ALTER TABLE block_pointer ADD COLUMN chain_id int4;
UPDATE block_pointer SET chain_id = split_part(pointer, '/', 1)::int;
UPDATE block_pointer SET pointer = split_part(pointer, '/', 2);
ALTER TABLE block_pointer RENAME COLUMN pointer TO address;
ALTER TABLE block_pointer ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE block_pointer ADD CONSTRAINT block_pointer_pkey PRIMARY KEY (chain_id, address);
