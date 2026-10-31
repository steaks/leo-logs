# Connect to OpenRouter

The website shows a traces URL and a bearer header. OpenRouter sends that header with every trace.

1. Open [Settings → Observability](https://openrouter.ai/settings/observability).
2. Turn on **Enable Broadcast**.
3. Click **Set Up**.
4. Paste the URL from the website. It ends in `/traces`, and OpenRouter has to be able to reach it.
5. Paste the headers from the website.
6. Under **Additional generation metadata**, check **Cost**, **Identity**, **Request context**, and **Cost allocation**.
7. Click **Add**.

**Cost** fills the cost columns. **Go to logs** opens the website. The next visit asks you to sign in.

Then [integrate the code](/quick-start/code).
