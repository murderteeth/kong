CREATE TABLE latest_block (
	chain_id int4 NOT NULL,
	block_number int8 NOT NULL,
	block_timestamp timestamp NOT NULL,
	queue_timestamp timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT latest_block_pkey PRIMARY KEY (chain_id)
);

CREATE TABLE block_pointer (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	block_number int8 NOT NULL,
	updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	total_assets text NULL,
	activation_timestamp timestamp NULL,
	activation_block_number int8 NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT vault_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE strategy (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	api_version text NULL,
	name text NULL,
	vault_address text NOT NULL,
	migrate_address text NULL,
	activation_timestamp timestamp NULL,
	activation_block_number int8 NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT strategy_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE withdrawal_queue (
	chain_id int4 NOT NULL,
	vault_address text NOT NULL,
	queue_index int4 NOT NULL,
	strategy_address text NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT withdrawal_queue_pkey PRIMARY KEY (chain_id, vault_address, queue_index)
);

CREATE TABLE price (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	symbol text NOT NULL,
	price_usd numeric(38,18) NOT NULL,
	as_of_block_number int8 NOT NULL,
	as_of_time timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT price_pkey PRIMARY KEY (chain_id, address, as_of_time)
);

SELECT create_hypertable('price', 'as_of_time');

CREATE TABLE tvl (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	tvl_usd numeric(38,18) NOT NULL,
	as_of_block_number int8 NOT NULL,
	as_of_time timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tvl_pkey PRIMARY KEY (chain_id, address, as_of_time)
);

SELECT create_hypertable('tvl', 'as_of_time');
