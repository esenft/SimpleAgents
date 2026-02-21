import 'dotenv/config';
import { Agent, Runner, webSearchTool } from '@openai/agents';

// 1) The user request we want the agent to answer.
const userInput =
  'Find round-trip airfare from Boston (BOS) to Denver (DEN), departing tomorrow and returning the following day. Provide best options with airline, total price in USD, and booking URL.';

// 2) Create one agent and give it a web search tool.
const airfareAgent = new Agent({
  name: 'AirfareAgent',
  instructions:
    'You are a flight search assistant. Use webSearchTool to find current fares. Return concise, factual options with links and a short recommendation.',
  tools: [webSearchTool()],
});

// 3) Runner executes the agent and exposes lifecycle events.
const runner = new Runner();

// 4) Log runner lifecycle so we can see when agent/tool calls happen.
function registerRunnerLogs() {
  runner.on('agent_start', (_context, agent) => {
    console.log(`[Agent Start] ${agent.name}`);
  });

  runner.on('agent_end', (_context, agent, output) => {
    const preview = String(output).replace(/\s+/g, ' ').slice(0, 120);
    const suffix = preview.length === 120 ? '…' : '';
    console.log(`[Agent End] ${agent.name} | Output preview: ${preview}${suffix}`);
  });

  runner.on('agent_tool_start', (_context, agent, tool, details) => {
    const toolName = tool?.name ?? details?.toolCall?.name ?? 'unknown_tool';
    console.log(`[Tool Start] Agent=${agent.name} Tool=${toolName}`);
  });

  runner.on('agent_tool_end', (_context, agent, tool) => {
    const toolName = tool?.name ?? 'unknown_tool';
    console.log(`[Tool End] Agent=${agent.name} Tool=${toolName}`);
  });
}

// 5) Log streamed events, including raw model (LLM) events.
function formatJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function logToolCalledEvent(item) {
  const toolCall = item?.rawItem ?? item?.item ?? item;
  const toolType = toolCall?.type ?? 'unknown_type';
  const toolName = toolCall?.name ?? toolCall?.tool_name ?? toolCall?.toolName ?? 'unknown_tool';
  const toolInput = toolCall?.input ?? toolCall?.arguments ?? toolCall?.args;

  console.log(`[LLM -> Tool Call] type=${toolType} name=${toolName}`);
  if (toolInput !== undefined) {
    console.log(`[LLM -> Tool Input] ${formatJson(toolInput)}`);
  }
}

function logStreamEvent(event) {
  if (event.type === 'agent_updated_stream_event') {
    console.log(`[Stream] Active agent: ${event.agent.name}`);
    return;
  }

  if (event.type === 'run_item_stream_event') {
    console.log(`[Run Item] ${event.name}`);

    if (event.name === 'tool_called') {
      logToolCalledEvent(event.item);
    }

    return;
  }

  if (event.type === 'raw_model_stream_event') {
    const dataType = event?.data?.type ?? 'unknown';

    // Helpful for seeing when the LLM emits a tool call item in raw stream data.
    const outputItem = event?.data?.item;
    if (outputItem?.type && String(outputItem.type).includes('web_search')) {
      const outputName = outputItem?.name ?? outputItem?.type;
      const outputInput = outputItem?.input ?? outputItem?.arguments ?? outputItem?.query;
      console.log(`[LLM Raw Tool Item] name=${outputName}`);
      if (outputInput !== undefined) {
        console.log(`[LLM Raw Tool Input] ${formatJson(outputInput)}`);
      }
    }

    if (dataType.includes('response')) {
      console.log(`[LLM Event] ${dataType}`);
    }
  }
}

async function main() {
  // Make sure API key is loaded from .env.
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env');
    process.exit(1);
  }

  // Register runner lifecycle logs.
  registerRunnerLogs();

  // Print input before running the agent.
  console.log('=== Input ===');
  console.log(userInput);
  console.log('\n=== Runtime Logs ===');

  // Run in streaming mode so we can log events in real time.
  const result = await runner.run(airfareAgent, userInput, { stream: true });

  // Read every streamed event and log what happened.
  if (typeof result?.[Symbol.asyncIterator] === 'function') {
    for await (const event of result) {
      logStreamEvent(event);
    }
  }

  // Print final answer from the agent.
  console.log('\n=== Final Output ===');
  console.log(result.finalOutput);
}

// Start the app.
main().catch((error) => {
  console.error('Run failed:', error?.message ?? error);
  process.exit(1);
});
