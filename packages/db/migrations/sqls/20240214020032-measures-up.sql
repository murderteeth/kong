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

