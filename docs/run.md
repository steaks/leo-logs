# Run the log page

Leo Logs stores OpenRouter traces in SQLite and serves the pipelines and agents pages. The server listens on port `8787`. On this machine the page is [http://127.0.0.1:8787](http://127.0.0.1:8787). The package is `@leo-logs/ui`. The command is `leo-logs ui`. The docs site is [leologs.dev](https://leologs.dev).

```bash
npm run ui
```

`--port` changes the port. It must be an integer from 1 to 65535.

OpenRouter posts each trace to `POST /traces`. Point a webhook destination at that URL when the server is reachable. The spans land in `.leo-logs/logs.db`. The page reads the last 30 days, up to 200 rows, and deletes older rows. A pipeline or agent appears after a trace for it has been posted.

## On leologs.dev

Open ports 80 and 443 on the VM, and point `leologs.dev` at it. Then:

```bash
cp .env.example .env
docker compose up -d
```

Set `LEO_LOGS_TOKEN` in `.env` before that command. Caddy gets the certificate and serves `https://leologs.dev/`. The first visit asks you to create a username and password. Later visits ask you to sign in. The webhook URL is `https://leologs.dev/traces`, with header `Authorization: Bearer` set to the token. `LEO_LOGS_DOMAIN` overrides the site name. The SQLite file stays on the `leo-logs` volume.

| Variable | Role |
|---|---|
| `LEO_LOGS_DB` | SQLite file. Omitted means `.leo-logs/logs.db`. |
| `LEO_LOGS_TOKEN` | When set, `POST /traces` requires `Authorization: Bearer` with this value. |
| `LEO_LOGS_USER` | Optional page username. When set with `LEO_LOGS_PASSWORD`, the setup screen is skipped. |
| `LEO_LOGS_PASSWORD` | Optional page password. |
