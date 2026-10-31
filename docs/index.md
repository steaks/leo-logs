# Overview

Leo Logs is a website for OpenRouter traces. OpenRouter records each model call. Leo Logs groups those calls into the task, and into the agent that did each part of it.

A model call is the wrong unit. The cost, the time, and the failures belong to the task, and to the agent that worked on it.

A pipeline is a group of agents orchestrated to complete a task. One run of that task shares one cost, one duration, and one failure count.

An agent is one member of that group, with a specific responsibility. One run of that agent has its own cost, duration, and failures, and it stays inside the pipeline.

You still call OpenRouter yourself. Leo Logs does not send the request. You mark the request with the pipeline and the agent, and the website reads those marks back from OpenRouter.

The same session also shows lines you record on the pipeline and on each agent: a start, an end, and `debug`, `info`, `warn`, `error`, and `fatal`.

[Deploy the website](/quick-start/web-app/deploy), [connect OpenRouter](/quick-start/web-app/connect), then [integrate the code](/quick-start/code).
