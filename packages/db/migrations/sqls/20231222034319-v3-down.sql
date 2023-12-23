ALTER TABLE vault DROP COLUMN profit_max_unlock_time;
ALTER TABLE vault DROP COLUMN profit_unlocking_rate;
ALTER TABLE vault DROP COLUMN full_profit_unlock_date;
ALTER TABLE vault DROP COLUMN last_profit_update;
ALTER TABLE vault DROP COLUMN total_idle;
ALTER TABLE vault DROP COLUMN minimum_total_idle;
ALTER TABLE vault DROP COLUMN accountant;
ALTER TABLE vault DROP COLUMN role_manager;
ALTER TABLE vault DROP COLUMN emergency_shutdown;
ALTER TABLE vault DROP COLUMN is_shutdown;

ALTER TABLE harvest DROP COLUMN protocol_fee;
ALTER TABLE harvest DROP COLUMN protocol_fee_usd;
ALTER TABLE harvest DROP COLUMN performance_fees;
ALTER TABLE harvest DROP COLUMN performance_fees_usd;

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
