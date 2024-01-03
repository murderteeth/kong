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

ALTER TABLE vault ADD COLUMN as_of_block_number int8 NOT NULL;
ALTER TABLE strategy ADD COLUMN as_of_block_number int8 NOT NULL;

DROP VIEW vault_gql;
CREATE VIEW vault_gql AS
SELECT 
	v.*,
	erc20.meta_description AS asset_description,
	t.price_usd AS asset_price_usd,
	t.price_source AS asset_price_source,
	t.tvl_usd AS tvl_usd,
	a.net AS apy_net,
	a.weekly_net AS apy_weekly_net,
	a.monthly_net AS apy_monthly_net,
	a.inception_net AS apy_inception_net,
	a.gross_apr AS apr_gross
FROM vault v
JOIN erc20 
	ON v.chain_id = erc20.chain_id 
	AND v.asset_address = erc20.address
LEFT JOIN LATERAL (
	SELECT 
		price_usd,
		price_source,
		tvl_usd
	FROM tvl
	WHERE v.chain_id = tvl.chain_id AND v.address = tvl.address
	ORDER BY block_time DESC
	LIMIT 1
) t ON TRUE
LEFT JOIN LATERAL (
	SELECT 
		net,
		weekly_net,
		monthly_net,
		inception_net,
		gross_apr
	FROM apy
	WHERE v.chain_id = apy.chain_id AND v.address = apy.address
	ORDER BY block_time DESC
	LIMIT 1
) a ON TRUE;

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
