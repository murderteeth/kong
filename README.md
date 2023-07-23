# Batou
Real-time and historical ZooTroop GraphQL API

## Dev environment
Requirements: Linux, Docker, NodeJS and Yarn, tmux

### Config
- .env.development.local
- INNGEST_EVENT_KEY
- INNGEST_SIGNING_KEY = https://app.inngest.com/test/secrets

### Intall and run
```bash
yarn
. tmux-up.sh
```
Your local postgres, nextjs, and inngest servers are now running on ports 3000 and 8288 respectively. From tmux, test your setup with this:
```
yarn scripts-howdy
```
Use `ctrl-b :` then `kill-session` to exit tmux.


## postgres dev
docker commands
```
docker build -t togusa_image .
docker run --name togusa_container -p 5432:5432 -d togusa_image
docker stop togusa_container
docker start togusa_container
```

database setup
```
psql --host=localhost --port=5432 --username=postgres
\c togusa

CREATE TABLE howdy (
  timestamp_sent TIMESTAMP NOT NULL,
  timestamp_saved TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (timestamp_sent, timestamp_saved)
);

CREATE TABLE price (
  network INTEGER NOT NULL,
  address VARCHAR(42) NOT NULL,
  symbol VARCHAR(256) NOT NULL,
  price_usd NUMERIC,
  block_height INTEGER NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (network, address, block_height)
);

CREATE INDEX symbol_index ON price(symbol);
```
