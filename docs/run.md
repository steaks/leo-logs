# Run

Leo Logs stores OpenRouter traces in SQLite and serves the log page. The package is `@leo-logs/ui`. The command is `leo-logs ui`. It listens on port `3000`, on all interfaces. Requires Node `>=24 <25`.

```bash
npm install
npm run ui
```

On this machine the page is [http://127.0.0.1:3000](http://127.0.0.1:3000). `--port` changes the port. It must be an integer from 1 to 65535.

The first visit to a new log file opens [Getting started](/getting-started). The account, the access token, and the webhook steps are saved in the SQLite file. Later visits ask you to sign in.

OpenRouter posts each trace to `POST /traces`. That URL has to be reachable from OpenRouter. The spans land in `.leo-logs/logs.db`.

## Environment

| Variable | Role |
|---|---|
| `LEO_LOGS_DB` | SQLite file. Omitted means `.leo-logs/logs.db`. |
| `LEO_LOGS_TOKEN` | Optional. When set, this is the webhook bearer token instead of the one setup creates. |
| `LEO_LOGS_USER` and `LEO_LOGS_PASSWORD` | Optional. Set both to protect the page with HTTP basic auth. `POST /traces` still uses the bearer token. |

## On a VM

Open ports 80 and 443, and point a DNS name at the VM. In the Caddyfile, uncomment the site block and replace `leologs.dev` with that hostname. Then:

```bash
docker compose up -d
```

Caddy requests a certificate for that hostname and proxies to the log page. The SQLite file stays on the `leo-logs` volume, at `/data/logs.db`. Set `LEO_LOGS_TOKEN` in the environment when you want a fixed webhook token.
