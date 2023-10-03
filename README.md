# Kong
Real-time and historical ZooTroop GraphQL API

```bash
yarn
cp .env.example .env
# configure .env
make dev
```

![image](https://github.com/murderteeth/kong/assets/89237203/7e492a26-0b58-4d32-aee2-8de04426e493)

- http://localhost:3000 for kong dash
- http://localhost:3001/graphql for kong graphql api


## requirements
- node, yarn, make, tmux, docker, docker compose
- ♥ for zoo animals


## make
`dev` - run eveything in dev

`ingest` - just run ingest in dev

`test` - test everything

`down` - 'make' sure your dev environment is shutdown lol


## tmux cheats
`quit` - `ctrl+b`, `:` then `kill-session` (your dev environment will also shutdown gracefully)

`pane navigation` - `ctrl+b` then `arrow keys`

`zoom\unzoom pane` - `ctrl+b` then `z`

`scroll` - `ctrl+b` then `[` then `arrow keys` or `page up\down keys` then `q` to quit scroll mode


## workspace
### packages
`gql` - graphql schema and server

`ingest` - etl logic

`lib` - shared code

`terminal` - cli app for interacting with kong at runtime

`web` - kong runtime dash


## ingest
### config
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

