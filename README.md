# Kong
### Real-time/Historical EVM Indexer x Analytics

Kong is an integrated set of services and tools that make it easy to index EVM logs and state, enrich your data with custom hooks, query your data over graphql. Kong is designed to be cheap, reliable, easy to maintain, and simplify the process of updating your index.

Kong comes configured with an index over Yearn Finance's v2 and v3 vault ecosystems.


## Requirements
- node, yarn, make, tmux, docker, docker compose, postgresql
- ♥ for zoo animals


## Quick start
```bash
yarn
cp .env.example .env
# configure .env
make dev
```
`dash` - http://localhost:3001

`graphql explorer ` - http://localhost:3001/api/gql


## Yearn Vaults Index
Kong's Yearn index covers the v3 and v2 vault ecosystems:

- Regular contract snapshots of each registry, vault, strategy, trade handler, accountant, and debt allocator.

- Full event history for each of the above (*with limited history on transfers, deposits, withdraws, and approves).

- Snapshot hooks for computing vault-strategies relationships, debts, fees, and rewards.

- Snapshot hooks for integrating offchain risk and meta data.

- Event hooks for tracking new vaults and strategies, computing spot harvest aprs, and pricing transfers.

- Timeseries hooks for computing APY and TVL.

## Index with Kong

### abis.yaml x ingest/abis
Kong implements a convention-based relationship between `abis.yaml` and the special repo path `packages/ingest/abis`. Add a contract to the index like this:

- Make a path under `ingest/abis`, eg `ingest/abis/yearn/3/registry` 

- Add the contract's abi to the project as abi.ts, eg `ingest/abis/yearn/3/registry/abi.ts`

- Update `config/abis.yaml` with the contract's abi path and sources

- Sources can be static addresses or a domain type called a "thing".

- "Things" in kong are analogous to "entities" in conventional etl design.

- Use hooks to create things. 

- Use things as abi sources for more indexing.

- Yearn Example. Registry event hooks create vault things. Vault things are used as the source for indexing vault abis. This triggers vault event hooks which create strategy things. Strategy things are then used as the source for indexing strategy abis. And so on.

- Hooks have a convention-based implementation as well. They are co-located with abis, the hook type indicated by the use of `snapshot`, `event`, or `timeseries` in the path name. The hook itself is always named `hook.ts`. Kong's hook resolver supports "hoisting" so you can, for example, write one transfer event hook to price transfer events across different contracts.

- `abis.yaml` supports several options for defining and fine tuning the index.

For example,
```yaml
- abiPath: 'yearn/3/registry'
  only: skip
  sources: [
    { chainId: 137, address: '0xfF5e3A7C4cBfA9Dd361385c24C3a0A4eE63CE500', inceptBlock: 49100596 }
  ]

- abiPath: 'yearn/3/registry2'
  sources: [
    { only: true, chainId: 1, address: '0xff31A1B020c868F6eA3f61Eb953344920EeCA3af', inceptBlock: 19072527 },
    { chainId: 137, address: '0xff31A1B020c868F6eA3f61Eb953344920EeCA3af', inceptBlock: 52488140 },
    { chainId: 42161, address: '0xff31A1B020c868F6eA3f61Eb953344920EeCA3af', inceptBlock: 171850013 },
  ]

- abiPath: 'yearn/3/vault'
  things: {
    label: 'vault',
    filter: [{ field: 'apiVersion', op: '>=', value: '3.0.0' }]
  }
```
Three abis are configured, two registries and a vault. The first registry is being skipped by setting the optional `skip` to true. The second registry specifies three static addresses as sources, but uses the optional `only` flag to narrow the sources to one. 

The vault abi sources addresses from things labeled 'vault' and filters them by apiVersion. For this to work, a registry event hook would loads new vaults as things. For example,
```typescript
export const topics = [
  `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {

  // processing and extract code 

  await mq.add(mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: vault,
    label: 'vault',
    defaults: {
      apiVersion,
      registry,
      asset,
      decimals,
      inceptBlock,
      inceptTime
    }
  }))
}
```


### Run an index
From the command line run `make dev`. After the indexer boots you will see Kong's terminal UI running in the bottom left tmux pane. Select `ingest` then `fanout abis`. This tells the indexer to query abis.yaml and queue fanout jobs. Fanout jobs detect missing index data and queue extract jobs to fill it in. Extract jobs call external apis, execute hooks, then queue results in the load queue. Load queue jobs store results in the database.

To initialize an index you typically run `fanout abis` several times. In the case of the Yearn index, the first run detects vaults by extracting registry logs. The second run checks registries again, but also extracts vault logs and gets strategies. And so on.

Once an index is initialized, `fanout abis` can be run on a schedule, eg every 15 minutes.

### Replay an index
Made a mistake in one of your hooks? Patch your code and replay, no need to re-extract. From the command line run `make dev`. From the Kong's terminal UI select `ingest` then `fanout replays`.

### Postgres schema
`evmlog` - raw evm logs + event hook data

`evmlog_strides` - state of event block coverage

`snapshot` - latest snapshot of each contract + snapshot hook data

`thing` - domain object definitions

`output` - timeseries hook data

`price` - price data

`latest_block` - latest block numbers

`monitor` - system stats


## Cheats

### make
`make dev` - run eveything in dev

`make test` - test everything

`make down` - 'make' sure your dev environment is shutdown lol

### testing
`make test` - test everything

`yarn workspace <workspace> test` - test individual workspaces

```bash
yarn workspace ingest test
```

### tmux
`quit` - `ctrl+b`, `:` then `kill-session` (your dev environment will also shutdown gracefully)

`pane navigation` - `ctrl+b` then `arrow keys`

`zoom\unzoom pane` - `ctrl+b` then `z`

`scroll` - `ctrl+b` then `[` then `arrow keys` or `page up\down keys` then `q` to quit scroll mode

### database migrations
**create** - `yarn workspace db migrate create <migration-name> --sql-file`

**up** - `yarn workspace db migrate up [name|-c count|...]`

**down** - `yarn workspace db migrate down [-c count|...]`

### timescale
**hypertable size** - `SELECT hypertable_size('table name');`


## Monorepo layout
Kong resources are managed monorepo style using a yarn workspace.

`.env` - core config

`config/abis.yaml` - indexer config

`config/abis.local.yaml` - local indexer override (optional)

`packages/db` - postgres migrations (db-migrate)

`packages/ingest` - core indexer logic

`packages/ingest/abis` - custom indexer logic

`packages/lib` - shared code

`packages/terminal` - cli app for interacting with kong at runtime

`packages/web` - gqphql api and runtime dash


## Architecture

`Ingest` - Ingest is a nodejs service that orchestrates and excutes all the various indexing activities. It's designed to scale horizontally, no need for beefy infra.

`Message Queue` - Indexing activities are coordinated using BullMQ message queues on Redis. This provides a simple, observable concurrency plane, decouples moving parts, and paves the way to scaling and non-TS language integration.

`Event Source` - Kong stores EVM logs and contract snapshots in postgres without transform. Optional hooks perform transform operations _on top of_ of event and snapshot data. In this way, the data model supports enhanced debugging, index replay, and decouples domain modeling from the underlying postgres schema.

`Hooks` - Hooks are custom logic used to enrich the dataset. Hooks come in three flavors: Snapshot, Event, and Timeseries. Hook execution is replayable.

`NextJS\Graphql` - Raw x enriched data are made available over graphql running in a serverless nextjs function call.

`Testing` - Kong uses mocha\chai for testing. Tests are co-located with the code they test.

`yaml config` - Kong's indexing set is defined by yaml file. 

`.env config` - RPC urls and other core settings are defined in .env.

![image](https://github.com/murderteeth/kong/assets/89237203/c9c70016-9de4-418f-a0bb-06b9fd9da549)


## Motivation
Robust indexing is tough. Some observations,

- Indexers spend a lot of time waiting for external things to respond. Kong's approach is high concurrency and batching.

- Reindexing is expensive. So Kong optimizes for replayability.

- It's hard to separate domain from indexer logic, but crucial for testing and growth. Kong's uses indexer hooks to separate these concerns.


## Greatfully Informed by and borrowed from
Kong is the result of hours spent reviewing and contributing on other indexing projects. Kong chest pounds with pride atop these shoulders: ydaemon, yexporter, subsquid, thegraph, various projects by BobTheBuidler like yprice and evm_contract_exporter.


## Dev Notes

### how to baseline a production db in-flight
We started using db-migrate after the db was already in production. But db-migrate doesn't provide support retro-fitting a production database with migrations. So here's what we did:

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

### postgres x timescale
Locally you can run postgres and timescale from a docker image, eg using `docker compose up postgres`. connect to your local with
```
PGPASSWORD=password psql --host=localhost \
  --port=5432 \
  --username=user \
  --dbname=user
```

Timescale has to be manually installed on top of postgres in the render environment:
- assuming a postgres instance is already running on render
- in the render dashboard, find the Access Control panel for the pg instance, add your IP
- connect to the instance using psql from your terminal
- `CREATE EXTENSION IF NOT EXISTS timescaledb;` to install the timescale extension
- `\dx` to verify the install
- logout, remove your ip from the Access Control panel


### viem, https://viem.sh
Kong uses viem to interface with rpcs. Because viem is new and changing often, all of kong's package.json files are hardcoded with the same viem version. To upgrade viem, manually update all package/package.json files then run `yarn` from root.


## Production
Kong is hosted on Render. See render.yaml for details.
