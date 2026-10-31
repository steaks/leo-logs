import { OpenRouter as AgentClient, serverTool, tool, type ConversationState, type StateAccessor } from '@openrouter/agent';
import { OpenRouter } from '@openrouter/sdk';
import { z } from 'zod';
import { createPipeline, type Agent } from '@leo-logs/trace';

const flash = 'z-ai/glm-5.3-flash';
const writer = 'z-ai/glm-5.3';

const orderRecord = tool({
  name: 'order_record',
  description: 'Returns the shop order, including the promised ship date and carrier.',
  inputSchema: z.object({
    orderId: z.string().describe('Shop order id, such as 1042'),
  }),
  execute: async ({ orderId }) => ({
    orderId,
    customer: 'Mina Cole',
    item: 'wool coat',
    promisedShipDate: '2026-10-20',
    carrier: 'USPS',
    status: 'in transit',
  }),
});

const shippingRefundRule = tool({
  name: 'shipping_refund_rule',
  description: 'Returns whether a late shipment qualifies for a shipping refund.',
  inputSchema: z.object({
    daysLate: z.number().describe('Days past the promised ship date'),
  }),
  execute: async ({ daysLate }) => ({
    daysLate,
    refundShipping: daysLate >= 3,
    creditCents: daysLate >= 3 ? 800 : 0,
  }),
});

const clock = serverTool({ type: 'openrouter:datetime', parameters: { timezone: 'America/Denver' } });
const carrierSearch = serverTool({ type: 'openrouter:web_search', parameters: { maxResults: 3 } });

type FunctionTool = typeof orderRecord | typeof shippingRefundRule;
type ServerTool = typeof clock | typeof carrierSearch;

const memory = (): StateAccessor => {
  let stored: ConversationState | null = null;
  return {
    load: async () => stored,
    save: async (next) => {
      stored = next;
    },
  };
};

/**
 * One conversation, two turns. The first turn is only the function tool, so OpenRouter
 * keeps this agent's trace id. The second turn continues that history and adds the server tool.
 */
const runAgent = async (
  apiKey: string,
  agent: Agent,
  model: string,
  task: string,
  followUp: string,
  functionName: string,
  functionTool: FunctionTool,
  server: ServerTool,
) => {
  const sessionId = agent.sessionId();
  if (!sessionId) throw new Error(`${agent.name} has no pipeline`);
  const client = new AgentClient({ apiKey });
  const trace = { traceId: agent.traceId() };
  const state = memory();
  const found = client.callModel({
    model,
    input: task,
    tools: [functionTool],
    toolChoice: { type: 'function', name: functionName },
    trace,
    sessionId,
    state,
  });
  await found.getText();
  const finished = client.callModel({
    model,
    input: followUp,
    tools: [functionTool, server],
    trace,
    sessionId,
    state,
  });
  return finished.getText();
};

const replyToneTool = {
  type: 'function' as const,
  function: {
    name: 'reply_tone',
    description: 'Returns how the order desk should address this customer.',
    parameters: {
      type: 'object',
      properties: {
        customer: { type: 'string', description: 'Customer full name' },
      },
      required: ['customer'],
    },
  },
};

const toneFor = (customer: string) => ({
  customer,
  greetingName: customer.split(' ')[0] ?? customer,
  maxSentences: 3,
  signoff: 'Order desk',
});

/** The email chat. reply_tone runs here, then the same messages continue so the model can write. */
const runChat = async (apiKey: string, agent: Agent, model: string, task: string) => {
  const sessionId = agent.sessionId();
  if (!sessionId) throw new Error(`${agent.name} has no pipeline`);
  const client = new OpenRouter({ apiKey });
  const trace = { traceId: agent.traceId() };
  type ChatRequest = NonNullable<Parameters<OpenRouter['chat']['send']>[0]['chatRequest']>;
  const messages: ChatRequest['messages'] = [{ role: 'user', content: task }];
  for (let turn = 0; turn < 3; turn += 1) {
    const response = await client.chat.send({
      chatRequest: {
        model,
        messages,
        ...(turn === 0 ? { tools: [replyToneTool], toolChoice: { type: 'function' as const, function: { name: 'reply_tone' } } } : {}),
        trace,
        sessionId,
        stream: false,
      },
    });
    if (!('choices' in response)) throw new Error('Expected a chat completion');
    const message = response.choices[0]?.message;
    const calls = message?.toolCalls ?? [];
    if (!message || (turn === 0 && calls.length === 0)) throw new Error(`${agent.name} did not call reply_tone`);
    messages.push(message);
    if (calls.length === 0) {
      const content = message.content;
      return typeof content === 'string' ? content : JSON.stringify(content ?? '');
    }
    for (const call of calls) {
      if (call.function.name !== 'reply_tone') throw new Error(`${agent.name} called ${call.function.name}`);
      const args = JSON.parse(call.function.arguments) as { customer?: string };
      messages.push({ role: 'tool', content: JSON.stringify(toneFor(args.customer ?? '')), toolCallId: call.id });
    }
  }
  throw new Error(`${agent.name} did not write the email`);
};

/** One model call for an agent. The pipeline session and this agent's trace id go on the request. */
const runTurn = async (apiKey: string, agent: Agent, task: string): Promise<string> => {
  const sessionId = agent.sessionId();
  if (!sessionId) throw new Error(`${agent.name} has no pipeline`);
  const client = new OpenRouter({ apiKey });
  const response = await client.chat.send({
    chatRequest: {
      model: writer,
      messages: [{ role: 'user', content: task }],
      sessionId,
      trace: { traceId: agent.traceId() },
      stream: false,
    },
  });
  if (!('choices' in response)) throw new Error(`${agent.name} did not return a chat completion`);
  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' ? content : JSON.stringify(content ?? '');
};

type Step = {
  agent: string;
  note: string;
  fields?: { [key: string]: string | number };
  level?: 'debug' | 'info' | 'warn';
  task: (prior: string) => string;
};

const runSteps = async (apiKey: string, name: string, steps: Step[], intro?: { message: string; level?: 'info' | 'warn' }) => {
  const pipeline = createPipeline(name);
  pipeline.start();
  if (intro?.level === 'warn') pipeline.warn(intro.message);
  else if (intro) pipeline.info(intro.message);
  let prior = '';
  try {
    for (const step of steps) {
      const agent = pipeline.agent(step.agent);
      const log = step.level === 'warn' ? agent.warn : step.level === 'debug' ? agent.debug : agent.info;
      if (step.fields) log(step.fields, step.note);
      else log(step.note);
      prior = await runTurn(apiKey, agent, step.task(prior));
      process.stdout.write(`\n[${name} / ${step.agent}]\n${prior}\n`);
    }
    pipeline.end({ success: true, result: prior });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pipeline.error({ err: error }, message);
    pipeline.end({ success: false, result: message });
    throw error;
  }
};

const run = async () => {
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  await runSteps(apiKey, 'support-reply', [
    {
      agent: 'track',
      level: 'debug',
      fields: { orderId: '1042' },
      note: 'Looking up the order',
      task: () => 'Order 1042 is a wool coat. Promised ship date 2026-10-20. Carrier USPS. Status in transit. Say where the shipment is and how late it is.',
    },
    {
      agent: 'answer',
      note: 'Writing the customer reply',
      task: (prior) => `${prior}\n\nWrite the customer reply. The customer said their package never arrived.`,
    },
  ], { message: 'Customer asked where the package is' });
  await runSteps(apiKey, 'claim-review', [
    {
      agent: 'facts',
      note: 'Reading what happened',
      task: () => 'The kitchen pipe burst and flooded the room. The homeowner wants the repair covered. State the facts of the claim.',
    },
    {
      agent: 'policy',
      note: 'Checking what the policy covers',
      task: (prior) => `${prior}\n\nThe policy covers sudden water damage and excludes gradual leaks. Say whether this claim is covered.`,
    },
    {
      agent: 'decision',
      note: 'Writing approve or deny',
      task: (prior) => `${prior}\n\nWrite approve or deny, and the reason in one sentence.`,
    },
  ], { message: 'A water damage claim was filed' });
  await runSteps(apiKey, 'outage-update', [
    {
      agent: 'status',
      note: 'Finding what is broken',
      task: () => 'Checkout has failed for 20 minutes. Card payments return an error. Say what is broken.',
    },
    {
      agent: 'impact',
      note: 'Naming who is affected',
      task: (prior) => `${prior}\n\nCustomers who still have items in the cart cannot pay. Say who is affected.`,
    },
    {
      agent: 'notice',
      note: 'Writing the status page update',
      task: (prior) => `${prior}\n\nWrite the status page update.`,
    },
  ], { level: 'warn', message: 'Checkout has been failing for 20 minutes' });
  await runSteps(apiKey, 'resume-screen', [
    {
      agent: 'read',
      note: 'Reading the resume',
      task: () => 'The applicant did support for two years and used a help desk. The role is support. List the relevant experience.',
    },
    {
      agent: 'score',
      note: 'Scoring the applicant',
      task: (prior) => `${prior}\n\nScore the applicant against the support role from 1 to 5.`,
    },
    {
      agent: 'decision',
      note: 'Writing advance or decline',
      task: (prior) => `${prior}\n\nWrite advance or decline.`,
    },
  ], { message: 'A resume arrived for the support role' });
};

if (process.argv[1] && process.argv[1].endsWith('calls.ts')) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
