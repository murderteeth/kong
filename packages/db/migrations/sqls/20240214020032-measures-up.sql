CREATE TABLE evmlog (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	event_name text NOT NULL,
	topic text NOT NULL,
	args jsonb NULL,
	post jsonb NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NULL,
	log_index int4 NOT NULL,
	transaction_hash text NOT NULL,
	transaction_index int4 NOT NULL,
	CONSTRAINT evmlog_pkey PRIMARY KEY (chain_id, address, topic, block_number, log_index, transaction_hash, transaction_index)
);

CREATE TABLE evmlog_strides (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	strides text NOT NULL,
	CONSTRAINT evmlog_walk_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE snapshot (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	snapshot jsonb NULL,
	post jsonb NULL,
	block_number int8 NOT NULL,
	block_time timestamptz NULL,
	CONSTRAINT snapshot_pkey PRIMARY KEY (chain_id, address)
);

CREATE TABLE thing (
	chain_id int4 NOT NULL,
	address text NOT NULL,
	label text NOT NULL,
	defaults jsonb NULL,
	CONSTRAINT thing_pkey PRIMARY KEY (chain_id, address, label)
);
CREATE INDEX thing_idx_label ON thing(label);
CREATE INDEX thing_idx_chain_id_label ON thing(chain_id, label);

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

