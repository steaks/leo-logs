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

const run = async () => {
  const pipeline = createPipeline('order-desk');
  const lookup = pipeline.agent('lookup');
  const policy = pipeline.agent('policy');
  const reply = pipeline.agent('reply');
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  const order = await runAgent(
    apiKey,
    lookup,
    flash,
    'Look up order 1042. Report the customer, item, carrier, promised ship date, and status.',
    'Check today\'s date in America/Denver and say how many days late that shipment is.',
    'order_record',
    orderRecord,
    clock,
  );
  const decision = await runAgent(
    apiKey,
    policy,
    flash,
    `${order}\n\nUse the refund rule with the days late from that report. Say whether shipping should be refunded and the credit in cents.`,
    'Search the web for how that carrier treats a package still in transit that many days past the ship date. Add what you find to the refund decision.',
    'shipping_refund_rule',
    shippingRefundRule,
    carrierSearch,
  );
  const email = await runChat(
    apiKey,
    reply,
    writer,
    `${order}\n\n${decision}\n\nWrite the customer email. Call reply_tone with the customer's full name first. Greet them the way that tool says, stay within its sentence limit, and use its signoff. Include the order, the delay, and the refund.`,
  );
  process.stdout.write(`${email}\n`);
};

if (process.argv[1] && process.argv[1].endsWith('calls.ts')) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
