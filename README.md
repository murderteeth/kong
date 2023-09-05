# Kong
Real-time and historical ZooTroop GraphQL API

```bash
yarn
cp .env.example .env
# configure .env
make build
make dev
```

![image](https://github.com/murderteeth/kong/assets/89237203/7e492a26-0b58-4d32-aee2-8de04426e493)

## requirements
- node, yarn, make, tmux, docker, docker compose
- ♥ for zoo animals

## make
`build` - build everything
`dev` - run dev servers and terminal
`tidy` - use tidy to make sure your dev environment is shutdown

## tmux cheets
`quit` - `ctrl+b`, `:` then `kill-session` (your dev environment will also shutdown gracefully)
`pane navigation` - `ctrl+b` then `arrow keys`
`zoom\unzoom pane` - `ctrl+b` then `z`
`scroll` - `ctrl+b` then `[` then `arrow keys` then `q` to quit scroll mode

## ingest
### processors
#### paths
