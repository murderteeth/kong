DROP VIEW vault_gql;
DROP VIEW strategy_gql;
DROP VIEW harvest_gql;

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

ALTER TABLE harvest DROP COLUMN protocol_fees;
ALTER TABLE harvest DROP COLUMN protocol_fees_usd;
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
ALTER TABLE withdrawal_queue ADD COLUMN as_of_block_number int8 NOT NULL;
ALTER TABLE strategy_lender_status ADD COLUMN as_of_block_number int8 NOT NULL;

ALTER TABLE latest_block ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE block_pointer ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE vault ALTER COLUMN activation_block_number TYPE int8 USING activation_block_number::int8;
ALTER TABLE strategy ALTER COLUMN activation_block_number TYPE int8 USING activation_block_number::int8;
ALTER TABLE tvl ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE transfer DROP CONSTRAINT transfer_pkey;
ALTER TABLE transfer ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE transfer ADD CONSTRAINT transfer_pkey PRIMARY KEY (chain_id, block_number, block_index);
ALTER TABLE harvest DROP CONSTRAINT harvest_pkey;
DROP INDEX harvest_idx_address_blocknumber;
DROP INDEX harvest_idx_chainid_address_blocknumber;
ALTER TABLE harvest ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE harvest ADD CONSTRAINT harvest_pkey PRIMARY KEY (chain_id, block_number, block_index, address);
CREATE INDEX harvest_idx_address_blocknumber ON harvest (address, block_number);
CREATE INDEX harvest_idx_chainid_address_blocknumber ON harvest (chain_id, address, block_number);
ALTER TABLE apr ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE apy ALTER COLUMN weekly_block_number TYPE int8 USING weekly_block_number::int8;
ALTER TABLE apy ALTER COLUMN monthly_block_number TYPE int8 USING monthly_block_number::int8;
ALTER TABLE apy ALTER COLUMN inception_block_number TYPE int8 USING inception_block_number::int8;
ALTER TABLE apy ALTER COLUMN block_number TYPE int8 USING block_number::int8;
ALTER TABLE apy ALTER COLUMN weekly_net SET NOT NULL;
ALTER TABLE apy ALTER COLUMN weekly_price_per_share SET NOT NULL;
ALTER TABLE apy ALTER COLUMN monthly_net SET NOT NULL;
ALTER TABLE apy ALTER COLUMN monthly_price_per_share SET NOT NULL;

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

CREATE VIEW harvest_gql AS
SELECT 
	h.*,
	a.gross AS apr_gross,
	a.net AS apr_net
FROM harvest h
LEFT JOIN LATERAL (
	SELECT gross, net
	FROM apr
	WHERE 
		h.chain_id = apr.chain_id 
		AND h.address = apr.address 
		AND h.block_number = apr.block_number
	ORDER BY block_time DESC
	LIMIT 1
) a ON TRUE;
