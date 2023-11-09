CREATE TABLE latest_block (
	chain_id int4 NOT NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT latest_block_pkey PRIMARY KEY (chain_id)
);

CREATE TABLE block_pointer (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	block_number int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT block_pointer_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE vault (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	type text NULL CHECK (type IN ('vault', 'strategy')),
	api_version text NULL,
	apetax_type text NULL CHECK (apetax_type IN ('experimental', 'weird')),
	apetax_status text NULL CHECK (apetax_status IN ('new', 'active', 'withdraw', 'endorsed', 'stealth')),
	registry_status text NULL CHECK (registry_status IN ('experimental', 'endorsed')),
	registry_address text NULL,
	symbol text NULL,
	name text NULL,
	decimals int4 NULL,
	asset_address text NULL,
	asset_name text NULL,
	asset_symbol text NULL,
	total_assets numeric NULL,
	activation_block_number int8 NULL,
	activation_block_time timestamptz NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT vault_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE strategy (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	api_version text NULL,
	name text NULL,
	vault_address text NULL,
	migrate_address text NULL,
	activation_block_number int8 NULL,
	activation_block_time timestamptz NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT strategy_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE withdrawal_queue (
	chain_id int4 NOT NULL,
	vault_address text NOT NULL,
	queue_index int4 NOT NULL,
	strategy_address text NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT withdrawal_queue_pkey PRIMARY KEY (chain_id, vault_address, queue_index)
);

CREATE TABLE tvl (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	tvl_usd numeric NOT NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tvl_pkey PRIMARY KEY (chain_id, address, block_time)
);

SELECT create_hypertable('tvl', 'block_time');

CREATE TABLE erc20 (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	name text NOT NULL,
	symbol text NOT NULL,
	decimals int4 NOT NULL,
	CONSTRAINT erc20_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE transfer (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	sender text NOT NULL,
	receiver text NOT NULL,
	amount numeric NOT NULL,
	amount_usd numeric NULL,
	block_number int8 NOT NULL,
	block_index int4 NOT NULL,
	block_time timestamptz NULL,
	transaction_hash text NOT NULL,
	CONSTRAINT transfer_pkey PRIMARY KEY (chain_id, block_number, block_index)
);
CREATE INDEX transfer_idx_address_sender ON transfer(address, sender);
CREATE INDEX transfer_idx_address_receiver ON transfer(address, receiver);

CREATE TABLE harvest (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	profit numeric NOT NULL,
	profit_usd numeric NULL,
	loss numeric NOT NULL,
	loss_usd numeric NULL,
	total_profit numeric NULL,
	total_profit_usd numeric NULL,
	total_loss numeric NULL,
	total_loss_usd numeric NULL,
	total_debt numeric NULL,
	block_number int8 NOT NULL,
	block_index int4 NOT NULL,
	block_time timestamptz NULL,
	transaction_hash text NOT NULL,
	CONSTRAINT harvest_pkey PRIMARY KEY (chain_id, block_number, block_index)
);
CREATE INDEX harvest_idx_address ON harvest(address);
CREATE INDEX harvest_idx_address_blocknumber ON harvest (address, block_number);
CREATE INDEX harvest_idx_chainid_address_blocknumber ON harvest (chain_id, address, block_number);

CREATE TABLE apr (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	gross numeric NOT NULL,
	net numeric NOT NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NOT NULL,
	CONSTRAINT apr_pkey PRIMARY KEY (chain_id, address, block_time)
);
CREATE INDEX apr_idx_chainid_address_blocknumber ON harvest (chain_id, address, block_number);

SELECT create_hypertable('apr', 'block_time');

CREATE TABLE apy (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	weekly_net numeric NOT NULL,
	weekly_price_per_share numeric NOT NULL,
	weekly_block_number int8 NOT NULL,
	monthly_net numeric NOT NULL,
	monthly_price_per_share numeric NOT NULL,
	monthly_block_number int8 NOT NULL,
	inception_net numeric NOT NULL,
	inception_price_per_share numeric NOT NULL,
	inception_block_number int8 NOT NULL,
	net numeric NOT NULL,
	gross_apr numeric NOT NULL,
	price_per_share numeric NOT NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NOT NULL,
	CONSTRAINT apy_pkey PRIMARY KEY (chain_id, address, block_time)
);

SELECT create_hypertable('apy', 'block_time');

CREATE TABLE sparkline (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	type text NOT NULL CHECK (type IN ('vault-tvl-7d', 'strategy-apr-7d', 'vault-apy-7d')),
	value numeric NOT NULL,
	time timestamptz NOT NULL,
	CONSTRAINT sparkline_pkey PRIMARY KEY (chain_id, address, type, time)
);

--------------------------------------
-------------
--- VIEWS
CREATE VIEW vault_gql AS
SELECT 
	v.*,
	t.tvl_usd AS tvl_usd,
	a.net AS apy_net
FROM vault v
LEFT JOIN LATERAL (
	SELECT 
		tvl_usd
	FROM tvl
	WHERE v.chain_id = tvl.chain_id AND v.address = tvl.address
	ORDER BY block_time DESC
	LIMIT 1
) t ON TRUE
LEFT JOIN LATERAL (
	SELECT 
		net
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

--------------------------------------
-------------
--- MIGRATION 1
ALTER TABLE vault ADD COLUMN management_fee numeric NULL;
ALTER TABLE vault ADD COLUMN performance_fee numeric NULL;
ALTER TABLE vault ADD COLUMN available_deposit_limit numeric NULL;
ALTER TABLE vault ADD COLUMN governance text NULL;

ALTER TABLE tvl ADD COLUMN price_usd numeric NOT NULL DEFAULT 0;

DROP VIEW vault_gql;
CREATE VIEW vault_gql AS
SELECT 
	v.*,
	t.price_usd AS price_usd,
	t.tvl_usd AS tvl_usd,
	a.net AS apy_net
FROM vault v
LEFT JOIN LATERAL (
	SELECT 
		price_usd,
		tvl_usd
	FROM tvl
	WHERE v.chain_id = tvl.chain_id AND v.address = tvl.address
	ORDER BY block_time DESC
	LIMIT 1
) t ON TRUE
LEFT JOIN LATERAL (
	SELECT 
		net
	FROM apy
	WHERE v.chain_id = apy.chain_id AND v.address = apy.address
	ORDER BY block_time DESC
	LIMIT 1
) a ON TRUE;
