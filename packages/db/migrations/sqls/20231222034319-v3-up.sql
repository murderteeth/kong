ALTER TABLE vault ADD COLUMN emergency_shutdown boolean NULL;

ALTER TABLE vault ADD COLUMN profit_max_unlock_time numeric NULL;
ALTER TABLE vault ADD COLUMN profit_unlocking_rate numeric NULL;
ALTER TABLE vault ADD COLUMN full_profit_unlock_date numeric NULL;
ALTER TABLE vault ADD COLUMN last_profit_update numeric NULL;
ALTER TABLE vault ADD COLUMN total_idle numeric NULL;
ALTER TABLE vault ADD COLUMN minimum_total_idle numeric NULL;
ALTER TABLE vault ADD COLUMN accountant text NULL;
ALTER TABLE vault ADD COLUMN role_manager text NULL;
ALTER TABLE vault ADD COLUMN debt_manager text NULL;
ALTER TABLE vault ADD COLUMN is_shutdown boolean NULL;

ALTER TABLE harvest ADD COLUMN protocol_fees numeric NULL;
ALTER TABLE harvest ADD COLUMN protocol_fees_usd numeric NULL;
ALTER TABLE harvest ADD COLUMN performance_fees numeric NULL;
ALTER TABLE harvest ADD COLUMN performance_fees_usd numeric NULL;

CREATE TABLE vault_debt (
	chain_id integer NOT NULL,
	lender text NOT NULL,
	borrower text NOT NULL,
	max_debt numeric NOT NULL,
	current_debt numeric NOT NULL,
	current_debt_ratio numeric NOT NULL,
	target_debt_ratio numeric NULL,
	max_debt_ratio numeric NULL,
	block_number numeric NOT NULL,
	block_time timestamptz NOT NULL,
	CONSTRAINT vault_debt_pkey PRIMARY KEY (chain_id, lender, borrower)
);
