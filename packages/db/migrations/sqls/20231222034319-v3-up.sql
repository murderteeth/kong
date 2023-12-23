ALTER TABLE vault ADD COLUMN profit_max_unlock_time numeric NULL;
ALTER TABLE vault ADD COLUMN profit_unlocking_rate numeric NULL;
ALTER TABLE vault ADD COLUMN full_profit_unlock_date numeric NULL;
ALTER TABLE vault ADD COLUMN last_profit_update numeric NULL;
ALTER TABLE vault ADD COLUMN total_idle numeric NULL;
ALTER TABLE vault ADD COLUMN minimum_total_idle numeric NULL;
ALTER TABLE vault ADD COLUMN accountant text NULL;
ALTER TABLE vault ADD COLUMN role_manager text NULL;
ALTER TABLE vault ADD COLUMN emergency_shutdown boolean NULL;
ALTER TABLE vault ADD COLUMN is_shutdown boolean NULL;

ALTER TABLE harvest ADD COLUMN protocol_fee numeric NULL;
ALTER TABLE harvest ADD COLUMN protocol_fee_usd numeric NULL;
ALTER TABLE harvest ADD COLUMN performance_fees numeric NULL;
ALTER TABLE harvest ADD COLUMN performance_fees_usd numeric NULL;

DROP VIEW strategy_gql;
CREATE VIEW strategy_gql AS
SELECT 
	s.*,
	a.gross AS gross_apr,
	a.net AS net_apr
FROM strategy s
LEFT JOIN LATERAL (
	SELECT 
		gross,
		net
	FROM apr
	WHERE s.chain_id = apr.chain_id AND s.address = apr.address
	ORDER BY block_time DESC
	LIMIT 1
) a ON TRUE;
