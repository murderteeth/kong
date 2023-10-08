CREATE TABLE latest_block (
	chain_id int4 NOT NULL,
	block_number int8 NOT NULL,
	block_timestamp timestamptz NOT NULL,
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
	activation_timestamp timestamptz NULL,
	activation_block_number int8 NULL,
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
	activation_timestamp timestamptz NULL,
	activation_block_number int8 NULL,
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
	block_timestamp timestamptz NULL,
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
	block_timestamp timestamptz NULL,
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
	block_timestamp timestamptz NOT NULL,
	CONSTRAINT apr_pkey PRIMARY KEY (chain_id, address, block_timestamp)
);
CREATE INDEX apr_idx_chainid_address_blocknumber ON harvest (chain_id, address, block_number);

SELECT create_hypertable('apr', 'block_timestamp');


--------------------------------------
-------------
--- VIEWS
CREATE VIEW vault_gql AS
SELECT 
  v.*,
  t.tvl_usd AS tvl_usd
FROM vault v
LEFT JOIN LATERAL (
  SELECT 
    tvl_usd
  FROM tvl
  WHERE v.chain_id = tvl.chain_id AND v.address = tvl.address
  ORDER BY block_time DESC
  LIMIT 1
) t ON TRUE;

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
  ORDER BY block_timestamp DESC
  LIMIT 1
) a ON TRUE;

CREATE VIEW sparkline_tvl AS
SELECT
  chain_id,
  address,
  time_bucket('7 day', block_time) AS time,
  LAST(tvl_usd, block_time) AS value
FROM
  tvl
GROUP BY
  chain_id, address, time
ORDER BY
  chain_id, address, time DESC
LIMIT 3;

CREATE VIEW sparkline_apr AS
SELECT
  chain_id,
  address,
  time_bucket('7 day', block_timestamp) AS time,
  LAST(net, block_timestamp) AS value
FROM
  apr
GROUP BY
  chain_id, address, time
ORDER BY
  chain_id, address, time DESC
LIMIT 3;
