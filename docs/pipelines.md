# Pipelines

A pipeline is a group of agents orchestrated to complete a task.

`createPipeline('support-reply')` starts one session of that task. The calls in the session share one cost, one duration, and one failure count. Run the task again and you get another session. The log page lists the pipeline once, then compares its sessions.

The agents inside `support-reply` are `track` and `answer`. Their calls stay in the session. See [Integrate](/integrate) for the request fields.

## On the log page

| Screen | Address |
|---|---|
| Pipelines | `/` |
| One pipeline | `/sessions?pipeline=support-reply` |
| One session | `/session?pipeline=support-reply&session=pipeline:support-reply-execution:…` |

**Pipelines** is one row per pipeline name. **Sessions** is how many times the task ran in the current window. **Agents** is how many agents appeared in it. That count opens a side panel of those agents.

**Avg cost** is the mean cost of one session. **P50 cost**, **P75 cost**, **P90 cost**, and **P95 cost** are percentiles of those session costs. **Avg latency** is the mean wall-clock time from the first call start to the last call end. **Avg model time** is the mean of each session’s summed call durations. Overlapping calls both count in model time.

**Avg latency**, **Avg model time**, and the four cost percentiles start hidden. Turn them on from **Columns**.

**One pipeline** lists sessions. **Latency** is that session’s wall-clock span. **Model time** is the sum of its call durations. Those two columns start hidden. Stats above the table include input, output, and cached tokens, plus the same cost percentiles for the sessions on screen.

**One session** lists that session’s model calls, including every agent in it. **Latency** on a call is that call’s duration. A row opens the messages panel. Functions and Server open the function-call panel. A function result is joined back to the original call by call id, so the panel can show the description and schema.

Filters are shared with Agents. They are listed on [The log page](/log-page).
