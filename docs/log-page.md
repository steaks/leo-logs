# The log page

Rows older than 30 days are deleted when a trace is stored. The time filter only hides rows inside that window. It does not keep anything older.

A pipeline or an agent appears after a trace for it has been posted. The pipeline and agent tables include every matching row in the window. One session, or one agent execution, lists at most 200 calls.

## If the page stays empty

The usual causes:

- The webhook URL is a localhost address OpenRouter cannot reach.
- **Enable Broadcast** is off, or the destination was not added.
- The bearer token on the destination is not the token from this log file.
- The model call did not send `sessionId` and `trace.traceId` from `@leo-logs/trace`.
- **Cost** was left unchecked, so the cost columns are empty even though the rows are there.

## Filters

These apply on Pipelines and on Agents.

| Control | Address parameter | Meaning |
|---|---|---|
| Time | `window` | `hour`, `day`, `week`, or `month`. Omitted means the past 30 days. |
| Name | `q` | Filters pipeline or agent names. |
| Failures only | `failures=1` | Rows with failures. |
| Models | `model` | Repeat for each selected model. Omitted means every model. |

## A call

Each call row has time, status, model, provider, tokens, cost, and duration. Opening a row shows the messages. Functions and Server open the function-call panel, including the description and schema when the result can be joined back to the call.

OpenRouter sometimes records a follow-up generation under its own id. In a pipeline session, that call is shown with the agent name of the previous agent call in the same session.

## After setup

Settings keeps the webhook URL, the bearer header, and two copies of the getting-started material:

- **Setup instructions** repeats the OpenRouter steps, with the guide at the top right and the header JSON on one line.
- **Integrate the code** repeats the install command and the `support-reply` example.

Password changes ask for the new password twice.
