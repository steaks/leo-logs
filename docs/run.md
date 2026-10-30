# Run the log page

Leo Logs stores OpenRouter traces in SQLite and serves the pipelines and agents pages. The server listens on port `3000`. On this machine the page is [http://127.0.0.1:3000](http://127.0.0.1:3000). The package is `@leo-logs/ui`. The command is `leo-logs ui`.

```bash
npm run ui
```

`--port` changes the port. It must be an integer from 1 to 65535.

OpenRouter posts each trace to `POST /traces`. Point a webhook destination at that URL when the server is reachable. The spans land in `.leo-logs/logs.db`. The page reads the last 30 days, up to 200 rows, and deletes older rows. A pipeline or agent appears after a trace for it has been posted.

## On a VM

Open ports 80 and 443, and point a DNS name at the VM. Copy `.env.example` to `.env` and set `LEO_LOGS_DOMAIN` to that name. Then:

```bash
docker compose up -d
```

Caddy requests a certificate for `LEO_LOGS_DOMAIN` and serves the page there. The first visit asks you to create a username and password. The next screen creates an access token and shows the webhook URL for that host, method `POST`, and the header `Authorization: Bearer` set to that token. The SQLite file stays on the `leo-logs` volume.

| Variable | Role |
|---|---|
| `LEO_LOGS_DB` | SQLite file. Omitted means `.leo-logs/logs.db`. |
| `LEO_LOGS_TOKEN` | Optional. When set, this is the webhook bearer token instead of the one setup creates. |
| `LEO_LOGS_DOMAIN` | Required. Public hostname Caddy requests a certificate for. |
