CREATE TABLE evmlog (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	event_signature text NOT NULL,
	args jsonb NULL,
	block_number int8 NOT NULL,
	block_index int4 NOT NULL,
	block_time timestamptz NULL,
	transaction_hash text NOT NULL,
	CONSTRAINT evmlog_pkey PRIMARY KEY (chain_id, address, event_signature, block_number, block_index)
);

CREATE TABLE evmlog_block_pointer (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	topic text NOT NULL,
	block_number int8 NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT evmlog_block_pointer_pkey PRIMARY KEY (chain_id, address, topic)
);

-- init evmlog_block_pointers for existing logs

CREATE TABLE measure (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	label text NOT NULL,
	component text NULL,
	value numeric NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NOT NULL,
	CONSTRAINT measure_pkey PRIMARY KEY (chain_id, address, label, component, block_time)
);

SELECT create_hypertable('measure', 'block_time');

