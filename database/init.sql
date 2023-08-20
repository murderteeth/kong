CREATE TABLE public.latest_block (
	network_id int4 NOT NULL,
	block_number int8 NOT NULL,
	block_timestamp timestamp NOT NULL,
	queue_timestamp timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT block_pkey PRIMARY KEY (network_id)
);

CREATE TABLE public.vault (
	network_id int4 NOT NULL,
	address text NOT NULL,
	version text NULL,
	symbol text NULL,
	name text NULL,
	decimals int4 NULL,
	asset_address text NULL,
	asset_name text NULL,
	asset_symbol text NULL,
	total_assets text NULL,
	as_of_block_number int8 NOT NULL,
	updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT vault_pkey PRIMARY KEY (network_id, address)
);
