# Kong
Real-time and historical ZooTroop data platform

![image](https://github.com/murderteeth/kong/assets/89237203/97d8d49e-87b7-4d0a-8ab8-7ed0884bb99c)


## quick start
```bash
yarn
cp .env.example .env
# configure .env
make dev
```
`dash` - http://localhost:3000

`graphql explorer ` - http://localhost:3000/api/gql

## requirements
- node, yarn, make, tmux, docker, docker compose
- ♥ for zoo animals


## make
`dev` - run eveything in dev

`test` - test everything

`down` - 'make' sure your dev environment is shutdown lol


## tmux
`quit` - `ctrl+b`, `:` then `kill-session` (your dev environment will also shutdown gracefully)

`pane navigation` - `ctrl+b` then `arrow keys`

`zoom\unzoom pane` - `ctrl+b` then `z`

`scroll` - `ctrl+b` then `[` then `arrow keys` or `page up\down keys` then `q` to quit scroll mode


## database migrations
**create** - `yarn workspace db migrate create <migration-name> --sql-file`

**up** - `yarn workspace db migrate up [name|-c count|...]`

**down** - `yarn workspace db migrate down [-c count|...]`


### how to baseline the production db in-flight
We started using db-migrate after the db was already in production. But db-migrate doesn't provide support retro-fitting a production database with migrations. To get around this, we:

- create a baseline migration that is only applied via `migrate up` in dev, `20231222031425-baseline`

- in the production db, manually create the migrations table with
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  run_on TIMESTAMP NOT NULL
);
```

- in the production db, manually insert a row into the migrations table for the baseline migration
```sql
INSERT INTO migrations (name, run_on) VALUES ('/20231222031425-baseline', CURRENT_TIMESTAMP);
```

This way production thinks it was migrated starting from the baseline and handles future migrations normally.


## workspace
### packages
`ingest` - etl logic

`lib` - shared code

`terminal` - cli app for interacting with kong at runtime

`web` - kong gqphql api and runtime dash


## testing
`make test` - test everything

`yarn workspace <workspace> test` - test a specific workspace (eg, `lib` or `ingest`)


## yamls
## ingest
### processors
#### paths


## postgres x timescale
locally you can run postgres and timescale from a docker image, eg using `make postgres`. connect to your local with
```
psql --host=localhost \
  --port=5432 \
  --username=user \
  --dbname=user
```

timescale has to be manually installed on top of postgres in the render environment. bit of a pain atm
- assuming a postgres instance is already running on render
- in the render dashboard, find the Access Control panel for the pg instance, add your IP
- connect to the instance using psql from your terminal
- `CREATE EXTENSION IF NOT EXISTS timescaledb;` to install the timescale extension
- `\dx` to verify the install
- logout, remove your ip from the Access Control panel


### timescale cheats
`hypertable size` - `SELECT hypertable_size('table name');`


### viem, https://viem.sh
Kong uses viem to interface evms. Because viem is new and changing often, all of kong's package.json files are hardcoded with the same viem version. To upgrade viem, manually update all package/package.json files then run `yarn` from root.

