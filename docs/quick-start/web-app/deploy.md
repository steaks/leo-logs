# Deploy the Leo Logs website

Pick one way to run the website.

## npx

Node 24.

```bash
npx @leo-logs/ui ui
```

`@leo-logs/ui` is in the npm organization `leo-logs`. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The database is created at `.leo-logs/logs.db`.

## Docker

```bash
docker pull leologs/leo-logs
docker run -d --name leo-logs -p 3000:3000 -v leo-logs:/data leologs/leo-logs
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The database is created at `/data/logs.db` on the `leo-logs` volume.

## Account

Create a username and a password. Enter the password twice. It must be at least 8 characters.

## A public URL

The next page shows a URL that ends in `/traces`. OpenRouter calls that URL from its own servers. `http://127.0.0.1:3000/traces` receives nothing.

Run the website on a machine with a public hostname, and put HTTPS in front of port 3000. The URL for OpenRouter is `https://that-hostname/traces`. The process does not request a certificate. The proxy in front of it does.

Then [connect OpenRouter](/quick-start/web-app/connect).
